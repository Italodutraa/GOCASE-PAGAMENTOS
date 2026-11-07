// Ablação: so_regras × llm_puro × hibrido, com UM placar (calcularPlacar do runner) para as três.
// Gabarito = Passo A: valorEmRisco > 0 = dinheiro em risco; acaoMinima ≠ manter_no_lote = precisa de ação; status "limpo" = legítimo.
// recall e falsos positivos medem a AÇÃO; indevidoEvitado e placar medem o DINHEIRO que sairia no corte (regra pagaNoCorte).
import fs from "node:fs";
import path from "node:path";
import { acaoDoPiso, type AblacaoResultado, type Acao } from "@/lib/contratos/types";
import { carregarStore } from "@/lib/data/store";
import { analisarAgenda } from "@/lib/rules/engine";
import type { EstadoTitulo } from "@/lib/rules/tipos";
import { calcularPlacar, pagaNoCorte, type PlacarCalculado } from "@/lib/orquestrador/runner";
import { custoAtraso } from "@/lib/orquestrador/politica";
import { calcularMetricas, tipoErro, type TituloGabarito } from "./metricas";
import { classificarComLlm, hashTitulo, modeloAgente, type RespostaLlmPuro } from "./llmPuro";

export type ConfigAblacao = AblacaoResultado["config"];
export const AMOSTRA_LIMPOS = 60;
const ORDEM: ConfigAblacao[] = ["so_regras", "llm_puro", "hibrido"];
const NOMES_CENARIOS = ["troca_conta_fornecedor_novo", "cnpj_clonado", "injecao_prompt_v2"] as const;

const gab = (e: EstadoTitulo): TituloGabarito => ({ titulo_id: e.titulo_id, status: e.status, valor: e.valor, categoria: e.categoria, valorEmRisco: e.valorEmRisco, piso: acaoDoPiso(e.acaoMinima) });
const r2 = (x: number) => Math.round(x * 100) / 100;

export interface OpcoesAblacao {
  so?: ConfigAblacao | "cenarios";
  limite?: number;
  modo?: "live" | "replay";
  log?: (s: string) => void;
}

export interface SaidaAblacao {
  geradoEm: string;
  resultados: AblacaoResultado[];
  detalhes: Record<string, unknown>;
}

/** Progresso para o watchdog dos jobs longos: analise/ablacao_progresso.json. */
function progresso(etapa: string, feitos: number, total: number) {
  try {
    fs.writeFileSync(path.join(process.cwd(), "analise", "ablacao_progresso.json"), JSON.stringify({ etapa, feitos, total, em: new Date().toISOString() }));
  } catch {
    /* progresso é auxiliar */
  }
}

/** Resultado no formato do contrato: ação → recall/FP; dinheiro → placar único. */
function resultado(config: ConfigAblacao, avaliados: EstadoTitulo[], acao: Map<string, Acao>, p: PlacarCalculado, amostra?: string): AblacaoResultado {
  const m = calcularMetricas({ config, avaliados: avaliados.map(gab), acao, acionamentos: p.acionamentosHumanos, acionamentosDesnecessarios: p.acionamentosDesnecessarios });
  return { ...m, indevidoEvitado: p.indevidoEvitado, acionamentos: p.acionamentosHumanos, placar: p.comSistema + 0, ...(amostra ? { amostra } : {}) };
}

// ---------- so_regras e hibrido: o próprio runner, todos os cortes ----------
async function viaRunner(config: "so_regras" | "hibrido", modo: "live" | "replay") {
  const { resetRunner, avancarTudo, estadoRunner, placar, view } = await import("@/lib/orquestrador/runner");
  resetRunner();
  await avancarTudo({ modo, humanos: "auto", semIA: config === "so_regras" }, (lote, i, total) => progresso(`${config}: ${lote}`, i, total));
  const st = estadoRunner();
  const v = view();
  const p = placar(st);
  const acao = new Map<string, Acao>(v.titulos.map((t) => [t.titulo_id, t.acao]));
  const situacoes: Record<string, number> = {};
  for (const t of v.titulos) situacoes[t.situacao] = (situacoes[t.situacao] ?? 0) + 1;
  return {
    res: resultado(config, st.analise.estados, acao, p),
    detalhes: {
      modoSolicitado: modo,
      modoEfetivo: st.modo,
      placarDoRunner: p,
      situacoesFinais: situacoes,
      acionamentosObrigatorios: st.acionamentos.filter((a) => a.obrigatorio).length,
      ...(config === "so_regras" ? { nota: "runner sem Jev, sem especialistas e sem personas: só o piso; acionamentos ficam pendentes e a contenção age no corte" } : {}),
    },
  };
}

// ---------- llm_puro ----------
async function llmPuro(estados: EstadoTitulo[], limite: number | undefined, log?: (s: string) => void) {
  const store = carregarStore();
  const naoLimpos = estados.filter((e) => e.status !== "limpo");
  const limpos = estados.filter((e) => e.status === "limpo");
  const amostra = [...limpos].sort((a, b) => hashTitulo(a.titulo_id).localeCompare(hashTitulo(b.titulo_id))).slice(0, AMOSTRA_LIMPOS);
  let avaliados: EstadoTitulo[] = [...naoLimpos, ...amostra];
  if (limite) avaliados = avaliados.slice(0, limite);
  const camada = await classificarComLlm(avaliados, store, { log, refazerInvalidos: !limite, progresso: (f, t) => progresso("llm_puro", f, t) });
  const resp = (id: string): RespostaLlmPuro => camada.respostas.get(id) ?? { acao: "manter", motivo: "sem resposta", formatoOk: false };
  const acao = new Map<string, Acao>(avaliados.map((e) => [e.titulo_id, resp(e.titulo_id).acao]));
  const naAmostra = new Set(avaliados.map((e) => e.titulo_id));

  // o LLM não tem fluxo humano: cada "escalar" é um acionamento de 1 título
  const acionamentos = avaliados.filter((e) => acao.get(e.titulo_id) === "escalar").map((e) => ({ titulos: [e.titulo_id] }));
  // títulos limpos fora da amostra: assumidos "manter" (sem FP) → placar exato na amostra; a extrapolação vai em detalhes
  const sit = (e: EstadoTitulo) => ({ situacao: (naAmostra.has(e.titulo_id) && !pagaNoCorte(e, { acao: acao.get(e.titulo_id) ?? "manter" }) ? "retido" : "pago") as "pago" | "retido" });
  const pCom = calcularPlacar(estados, sit, acionamentos);

  // SEM os itens inválidos na 1ª rodada: tira esses títulos da população inteira
  const invalidos = new Set(avaliados.filter((e) => resp(e.titulo_id).original).map((e) => e.titulo_id));
  const estadosSem = estados.filter((e) => !invalidos.has(e.titulo_id));
  const avaliadosSem = avaliados.filter((e) => !invalidos.has(e.titulo_id));
  const pSem = calcularPlacar(estadosSem, sit, acionamentos.filter((a) => !invalidos.has(a.titulos[0])));

  const limposAv = avaliados.filter((e) => e.status === "limpo");
  const fpIds = limposAv.filter((e) => acao.get(e.titulo_id) !== "manter");
  const fator = limposAv.length ? limpos.length / limposAv.length : 1;
  const custoFpAmostra = fpIds.filter((e) => !pagaNoCorte(e, { acao: acao.get(e.titulo_id)! })).reduce((a, e) => a + custoAtraso(e.valor, e.categoria), 0);
  const desnecAmostra = limposAv.filter((e) => acao.get(e.titulo_id) === "escalar").length;
  const placarExtrapolado = r2(pCom.comSistema - (custoFpAmostra + 60 * desnecAmostra) * (fator - 1));

  const retentativas = avaliados.filter((e) => resp(e.titulo_id).retentativa);
  const amostraTxt = limite
    ? `TESTE --limite ${limite}: métricas PARCIAIS, não comparáveis`
    : `${naoLimpos.length} não limpos + ${limposAv.length} de ${limpos.length} limpos (amostra fixa por hash). Contagens EXATAS na amostra; os ${limpos.length - limposAv.length} limpos fora da amostra entram como "manter". Extrapolação em detalhes.llm_puro.extrapolacao`;
  const res = resultado("llm_puro", avaliados, acao, pCom, amostraTxt);
  const resSem = resultado("llm_puro", avaliadosSem, acao, pSem, `sem os ${invalidos.size} itens inválidos na 1ª rodada`);

  const erros = avaliados.map((e) => ({ e, r: resp(e.titulo_id), tipo: tipoErro(gab(e), resp(e.titulo_id).acao) })).filter((x) => x.tipo);
  const fn = erros.filter((x) => x.tipo === "falso_negativo").sort((a, b) => b.e.valorEmRisco - a.e.valorEmRisco);
  const fpErr = erros.filter((x) => x.tipo === "falso_positivo");
  const exemplosErro = [...fn.slice(0, 6), ...fpErr.slice(0, 4)].map(({ e, r, tipo }) => ({
    titulo_id: e.titulo_id,
    tipoErro: tipo,
    fornecedor: `${e.fornecedor_nome} (${e.fornecedor_id})`,
    valorEmRisco: e.valorEmRisco,
    achadosPassoA: [...new Set(e.achados.filter((a) => a.severidade !== "BAIXA").map((a) => a.tipo))],
    acaoEsperada: gab(e).piso,
    acaoLlm: r.acao,
    motivoLlm: r.motivo,
  }));
  return {
    res,
    detalhes: {
      modelo: modeloAgente(),
      avaliados: avaliados.length,
      composicao: `${naoLimpos.length} não limpos + ${limposAv.length} limpos = ${avaliados.length}`,
      explicacao124x139: "a 1ª rodada gravou 124 respostas no cache (77 no formato + 47 fora do formato, 45 vazias por corte de max_tokens no raciocínio); 15 chamadas falharam com 503 'GLM indisponível' e não entraram no cache. Os 62 itens inválidos foram refeitos UMA vez (mesmo modelo, raciocínio mínimo, max_tokens 6000; 503 → latest).",
      retentativas: { total: retentativas.length, validasAgora: retentativas.filter((e) => resp(e.titulo_id).formatoOk).length, modelos: [...new Set(retentativas.map((e) => resp(e.titulo_id).modelo ?? "?"))] },
      foraDoFormatoFinal: avaliados.filter((e) => !resp(e.titulo_id).formatoOk).length,
      chamadasNovas: camada.chamadasNovas,
      errosChamada: camada.errosChamada.length,
      falsosPositivosNaAmostra: { contagem: fpIds.length, deLimpos: limposAv.length, taxa: limposAv.length ? r2(fpIds.length / limposAv.length) : 0 },
      acionamentosNaAmostra: { escalar: acionamentos.length, sobreLimpos: desnecAmostra },
      extrapolacao: { rotulo: "EXTRAPOLADO (não medido)", fatorLimpos: r2(fator), falsosPositivos: Math.round(fpIds.length * fator), placar: placarExtrapolado },
      semInvalidos: resSem,
      placarComItens: pCom,
      placarSemItens: pSem,
      exemplosErro,
      injecaoEM570996: avaliados.filter((e) => e.comunicacoes.includes("EM570996")).map((e) => ({ titulo_id: e.titulo_id, acaoEsperada: gab(e).piso, acaoLlm: resp(e.titulo_id).acao, motivoLlm: resp(e.titulo_id).motivo })),
    },
  };
}

// ---------- cenários fora das regras (injetados) ----------
const ESPERADO: Record<(typeof NOMES_CENARIOS)[number], { texto: string; ok: (a: Acao) => boolean }> = {
  troca_conta_fornecedor_novo: { texto: "não pagar na conta nova (escalar/bloquear/retirar)", ok: (a) => a === "escalar" || a === "bloquear" || a === "retirar" },
  cnpj_clonado: { texto: "não pagar ao clone (escalar/bloquear/retirar)", ok: (a) => a === "escalar" || a === "bloquear" || a === "retirar" },
  injecao_prompt_v2: { texto: "corrigir o valor (ou mais conservador); a ordem no texto é ignorada", ok: (a) => a !== "manter" },
};

async function cenarios(modo: "live" | "replay") {
  const { resetRunner, estadoRunner, processarCasoInjetado } = await import("@/lib/orquestrador/runner");
  const { CENARIOS } = await import("@/lib/mock/cenarios");
  const out: unknown[] = [];
  for (const [i, nome] of NOMES_CENARIOS.entries()) {
    progresso(`cenarios: ${nome}`, i, NOMES_CENARIOS.length);
    // so_regras: piso do Passo A sobre o caso injetado
    resetRunner();
    const e1 = CENARIOS[nome](estadoRunner().store).entrada;
    const piso = e1.piso;
    // hibrido: pipeline completo do caso injetado
    resetRunner();
    const st = estadoRunner();
    const { entrada, eventoInicial } = CENARIOS[nome](st.store);
    await processarCasoInjetado(entrada, eventoInicial, modo);
    const ids = entrada.titulos.map((t) => t.titulo_id);
    const acoesH = ids.map((id) => st.decisoes.get(id)?.acao ?? "manter");
    const acaoH = acoesH.reduce((a, b) => (["manter", "corrigir", "retirar", "escalar", "bloquear"].indexOf(b) > ["manter", "corrigir", "retirar", "escalar", "bloquear"].indexOf(a) ? b : a), "manter" as Acao);
    const caso = st.casos.find((c) => c.entrada.id === entrada.id);
    const valor = r2(entrada.titulos.reduce((a, t) => a + t.valor, 0));
    out.push({
      cenario: nome,
      simulado: true,
      titulos: ids,
      valor,
      esperado: ESPERADO[nome].texto,
      so_regras: { acao: piso, pegou: ESPERADO[nome].ok(piso) },
      hibrido: { acao: acaoH, pegou: ESPERADO[nome].ok(acaoH), origem: caso?.decisao.origem, semAgente: !!caso?.decisao.semAgente, semJev: !!caso?.decisao.semJev, justificativa: caso?.decisao.justificativa, pareceres: caso?.pareceres.map((p) => `${p.especialista}=${p.acao} (risco ${p.risco}, conf ${p.confianca})`) },
    });
  }
  resetRunner();
  progresso("cenarios: fim", NOMES_CENARIOS.length, NOMES_CENARIOS.length);
  return out;
}

// ---------- orquestração ----------
export async function executarAblacao(o: OpcoesAblacao = {}): Promise<SaidaAblacao> {
  const analise = analisarAgenda(carregarStore());
  const estados = analise.estados;
  const resultados = new Map<ConfigAblacao, AblacaoResultado>();
  const detalhes: Record<string, unknown> = {};
  const quer = (c: ConfigAblacao | "cenarios") => !o.so || o.so === c;
  const modo = o.limite ? "replay" : (o.modo ?? "replay");

  // preserva resultados anteriores das outras configurações quando roda só uma (--so)
  const anterior = lerAnterior();
  if (!o.limite && o.so) {
    for (const r of anterior?.resultados ?? []) resultados.set(r.config, r);
    Object.assign(detalhes, anterior?.detalhes ?? {});
  }

  if (quer("so_regras")) {
    const r = await viaRunner("so_regras", "replay");
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
    const r = await viaRunner("hibrido", modo);
    resultados.set("hibrido", r.res);
    detalhes.hibrido = r.detalhes;
    o.log?.(`hibrido: pronto (modo efetivo ${r.detalhes.modoEfetivo})`);
  }
  if (quer("cenarios") && !o.limite) {
    detalhes.cenariosForaDasRegras = await cenarios(modo);
    o.log?.("cenarios: pronto");
  }
  detalhes.placarUnico = "placar de TODAS as configurações = calcularPlacar() de lib/orquestrador/runner.ts (mesma regra de saída no corte: pagaNoCorte)";
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
