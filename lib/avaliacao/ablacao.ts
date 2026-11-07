// Ablação: so_regras × llm_puro × hibrido contra o gabarito do Passo A.
// Gabarito: valorEmRisco > 0 = anomalia com dinheiro em risco; acaoMinima ≠ manter_no_lote = precisa de ação; status "limpo" = legítimo.
import fs from "node:fs";
import path from "node:path";
import { acaoDoPiso, type AblacaoResultado, type Acao } from "@/lib/contratos/types";
import { carregarStore } from "@/lib/data/store";
import { analisarAgenda, type ResultadoAnalise } from "@/lib/rules/engine";
import type { EstadoTitulo } from "@/lib/rules/tipos";
import { montarCasos } from "@/lib/orquestrador/casos";
import { aplicarPolitica } from "@/lib/orquestrador/politica";
import { calcularMetricas, tipoErro, type TituloGabarito } from "./metricas";
import { classificarComLlm, hashTitulo, modeloAgente } from "./llmPuro";

export type ConfigAblacao = AblacaoResultado["config"];
export const AMOSTRA_LIMPOS = 60;
const ORDEM: ConfigAblacao[] = ["so_regras", "llm_puro", "hibrido"];

const gab = (e: EstadoTitulo): TituloGabarito => ({ titulo_id: e.titulo_id, status: e.status, valor: e.valor, categoria: e.categoria, valorEmRisco: e.valorEmRisco, piso: acaoDoPiso(e.acaoMinima) });
const r2 = (x: number) => Math.round(x * 100) / 100;

export interface OpcoesAblacao {
  so?: ConfigAblacao;
  limite?: number;
  modo?: "live" | "replay";
  log?: (s: string) => void;
}

export interface SaidaAblacao {
  geradoEm: string;
  resultados: AblacaoResultado[];
  detalhes: Record<string, unknown>;
}

/** Acionamentos agrupados por pessoa + lote; desnecessário = todos os títulos do acionamento são limpos. */
function contarAcionamentos(planos: { pessoa: string; titulos: string[] }[], porId: Map<string, EstadoTitulo>) {
  const grupos = new Map<string, Set<string>>();
  for (const p of planos)
    for (const id of p.titulos) {
      const lote = porId.get(id)?.lote ?? "?";
      const k = `${p.pessoa}|${lote}`;
      (grupos.get(k) ?? grupos.set(k, new Set()).get(k)!).add(id);
    }
  let desnecessarios = 0;
  for (const ids of grupos.values()) if ([...ids].every((id) => porId.get(id)?.status === "limpo")) desnecessarios++;
  return { total: grupos.size, desnecessarios };
}

// ---------- so_regras ----------
function soRegras(analise: ResultadoAnalise) {
  const estados = analise.estados;
  const store = carregarStore();
  const porId = new Map(estados.map((e) => [e.titulo_id, e]));
  const acao = new Map<string, Acao>(estados.map((e) => [e.titulo_id, acaoDoPiso(e.acaoMinima)]));
  // acionamentos: política com pareceres vazios e sem Jev em todos os casos
  const casos = montarCasos(analise, store);
  const planos = casos.flatMap((c) => aplicarPolitica({ caso: c, pareceres: [], agora: 0 }).acionamentos);
  const ac = contarAcionamentos(planos, porId);
  const res = calcularMetricas({ config: "so_regras", avaliados: estados.map(gab), acao, acionamentos: ac.total, acionamentosDesnecessarios: ac.desnecessarios });
  return { res, detalhes: { acionamentosAgrupadosPorPessoaELote: ac.total, desnecessarios: ac.desnecessarios, nota: "política com pareceres vazios e sem Jev; não inclui o acionamento PS09 de recuperação do histórico (que o runner cria no híbrido)" } };
}

// ---------- llm_puro ----------
async function llmPuro(estados: EstadoTitulo[], limite: number | undefined, log?: (s: string) => void) {
  const store = carregarStore();
  const naoLimpos = estados.filter((e) => e.status !== "limpo");
  const limpos = estados.filter((e) => e.status === "limpo");
  const amostra = [...limpos].sort((a, b) => hashTitulo(a.titulo_id).localeCompare(hashTitulo(b.titulo_id))).slice(0, AMOSTRA_LIMPOS);
  let avaliados: EstadoTitulo[] = [...naoLimpos, ...amostra];
  if (limite) {
    // teste rápido: intercala não limpos e limpos
    const mix: EstadoTitulo[] = [];
    for (let i = 0; mix.length < limite && (i < naoLimpos.length || i < amostra.length); i++) {
      if (i < naoLimpos.length) mix.push(naoLimpos[i]);
      if (mix.length < limite && i < amostra.length) mix.push(amostra[i]);
    }
    avaliados = mix;
  }
  const camada = await classificarComLlm(avaliados, store, { log });
  const acao = new Map<string, Acao>([...camada.respostas].map(([id, r]) => [id, r.acao]));
  const limposAv = avaliados.filter((e) => e.status === "limpo");
  const parcial = !!limite;
  const fator = parcial || !limposAv.length ? 1 : limpos.length / limposAv.length;
  const escalouLimpo = limposAv.filter((e) => acao.get(e.titulo_id) === "escalar").length;
  const escalouTodos = avaliados.filter((e) => acao.get(e.titulo_id) === "escalar");
  const nEscalar = escalouTodos.filter((e) => e.status !== "limpo").length + escalouLimpo * fator;
  const desnec = escalouLimpo * fator;
  const nl = avaliados.filter((e) => e.status !== "limpo").length;
  const amostraTxt = parcial
    ? `TESTE --limite ${limite}: ${nl} não limpos + ${limposAv.length} limpos avaliados; métricas PARCIAIS, não comparáveis com as demais configurações`
    : `${nl} não limpos + ${limposAv.length} de ${limpos.length} limpos; FP, acionamentos e custo de atraso dos limpos extrapolados ×${fator.toFixed(1).replace(".", ",")}`;
  const res = calcularMetricas({ config: "llm_puro", avaliados: avaliados.map(gab), acao, acionamentos: nEscalar, acionamentosDesnecessarios: desnec, fatorLimpos: fator, amostra: amostraTxt });

  // erros para docs/correcoes-ia.md
  const formato = [...camada.respostas].filter(([, r]) => !r.formatoOk && r.bruto !== "[erro de chamada]");
  const erros = avaliados
    .map((e) => ({ e, r: camada.respostas.get(e.titulo_id)!, tipo: tipoErro(gab(e), camada.respostas.get(e.titulo_id)!.acao) }))
    .filter((x) => x.tipo);
  const fn = erros.filter((x) => x.tipo === "falso_negativo").sort((a, b) => b.e.valorEmRisco - a.e.valorEmRisco);
  const fpErr = erros.filter((x) => x.tipo === "falso_positivo");
  const escolhidos = [...fn.slice(0, fpErr.length ? 6 : 10), ...fpErr.slice(0, 4)].slice(0, 10);
  const exemplosErro = escolhidos.map(({ e, r, tipo }) => ({
    titulo_id: e.titulo_id,
    tipoErro: tipo,
    fornecedor: `${e.fornecedor_nome} (${e.fornecedor_id})`,
    valor: e.valor,
    valorEmRisco: e.valorEmRisco,
    achadosPassoA: [...new Set(e.achados.filter((a) => a.severidade !== "BAIXA").map((a) => a.tipo))],
    acaoEsperada: gab(e).piso,
    acaoLlm: r.acao,
    motivoLlm: r.motivo,
    formatoOk: r.formatoOk,
  }));
  const injecao = avaliados
    .filter((e) => e.comunicacoes.includes("EM570996"))
    .map((e) => ({ titulo_id: e.titulo_id, acaoEsperada: gab(e).piso, acaoLlm: camada.respostas.get(e.titulo_id)!.acao, motivoLlm: camada.respostas.get(e.titulo_id)!.motivo }));
  const detalhes = {
    modelo: modeloAgente(),
    errosFormato: formato.length,
    errosChamada: camada.errosChamada.length,
    chamadasNovas: camada.chamadasNovas,
    respostasDoCache: camada.doCache,
    avaliados: avaliados.length,
    falsosNegativosBrutos: fn.length,
    falsosPositivosBrutosNaAmostra: fpErr.length,
    acionamentosDesnecessariosExtrapolados: r2(desnec),
    exemplosErro,
    exemplosFormato: formato.slice(0, 5).map(([id, r]) => ({ titulo_id: id, bruto: r.bruto })),
    injecaoEM570996: injecao,
    ...(camada.errosChamada.length ? { falhasDeChamada: camada.errosChamada.slice(0, 10) } : {}),
  };
  return { res, detalhes };
}

// ---------- hibrido ----------
async function hibrido(estados: EstadoTitulo[], modo: "live" | "replay") {
  const { resetRunner, avancar, estadoRunner, placar, view } = await import("@/lib/orquestrador/runner");
  resetRunner();
  for (let i = 0; i < 10; i++) {
    const r = await avancar({ modo, humanos: "auto" });
    if (r.fim) break;
  }
  const st = estadoRunner();
  const v = view();
  const acao = new Map<string, Acao>(v.titulos.map((t) => [t.titulo_id, t.acao]));
  const porId = new Map(estados.map((e) => [e.titulo_id, e]));
  const ac = contarAcionamentos(st.acionamentos.map((a) => ({ pessoa: a.pessoa, titulos: a.titulos })), porId);
  const res = calcularMetricas({ config: "hibrido", avaliados: estados.map(gab), acao, acionamentos: st.acionamentos.length, acionamentosDesnecessarios: ac.desnecessarios });
  const situacoes: Record<string, number> = {};
  for (const t of v.titulos) situacoes[t.situacao] = (situacoes[t.situacao] ?? 0) + 1;
  return {
    res,
    detalhes: {
      modoSolicitado: modo,
      modoEfetivo: st.modo,
      placarDoRunner: placar(st),
      situacoesFinais: situacoes,
      acionamentosRunner: st.acionamentos.length,
      acionamentosAgrupadosPessoaELote: ac.total,
      acionamentosObrigatorios: st.acionamentos.filter((a) => a.obrigatorio).length,
      nota: "métricas pela ação final (acao ≠ manter); o placar do runner (placarDoRunner) usa o dinheiro que efetivamente saiu no corte",
    },
  };
}

// ---------- orquestração ----------
export async function executarAblacao(o: OpcoesAblacao = {}): Promise<SaidaAblacao> {
  const store = carregarStore();
  const analise = analisarAgenda(store);
  const estados = analise.estados;
  const resultados = new Map<ConfigAblacao, AblacaoResultado>();
  const detalhes: Record<string, unknown> = {};
  const quer = (c: ConfigAblacao) => !o.so || o.so === c;

  // preserva resultados de execuções anteriores de outras configurações (--so)
  const anterior = lerAnterior();
  if (!o.limite && o.so) {
    for (const r of anterior?.resultados ?? []) resultados.set(r.config, r);
    Object.assign(detalhes, anterior?.detalhes ?? {});
  }

  if (quer("so_regras")) {
    const r = soRegras(analise);
    resultados.set("so_regras", r.res);
    detalhes.so_regras = r.detalhes;
    o.log?.("so_regras: pronto");
  }
  if (quer("llm_puro")) {
    const r = await llmPuro(estados, o.limite, o.log);
    resultados.set("llm_puro", r.res);
    detalhes.llm_puro = r.detalhes;
  }
  if (quer("hibrido")) {
    const modo = o.limite ? "replay" : (o.modo ?? "live");
    const r = await hibrido(estados, modo);
    resultados.set("hibrido", r.res);
    detalhes.hibrido = r.detalhes;
    o.log?.(`hibrido: pronto (modo efetivo ${(r.detalhes as { modoEfetivo: string }).modoEfetivo})`);
  }
  return { geradoEm: new Date().toISOString(), resultados: ORDEM.filter((c) => resultados.has(c)).map((c) => resultados.get(c)!), detalhes };
}

function lerAnterior(): SaidaAblacao | null {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), "analise", "ablacao.json"), "utf8"));
    return Array.isArray(j) ? { geradoEm: "", resultados: j, detalhes: {} } : j;
  } catch {
    return null;
  }
}

export function gravarAblacao(s: SaidaAblacao, limite?: number) {
  const dir = path.join(process.cwd(), "analise");
  fs.mkdirSync(dir, { recursive: true });
  const arq = path.join(dir, limite ? "ablacao.teste.json" : "ablacao.json");
  fs.writeFileSync(arq, JSON.stringify(s, null, 2));
  return arq;
}
