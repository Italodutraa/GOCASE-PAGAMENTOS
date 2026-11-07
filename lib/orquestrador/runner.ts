// RUNNER: avança a simulação de corte em corte (MER 10h / LIT 14h), roda A → B → especialistas → orquestrador/política
// → crítico → tools simuladas → acionamentos → humanos simulados, e expõe o ExecucaoView.
import fs from "node:fs";
import path from "node:path";
import { carregarStore, resetStore, type Store } from "@/lib/data/store";
import { resetCenarios } from "@/lib/mock/cenarios";
import { analisarAgenda, type ResultadoAnalise } from "@/lib/rules/engine";
import type { EstadoTitulo } from "@/lib/rules/tipos";
import { acaoDoPiso, type Acao, type Acionamento, type AblacaoResultado, type CasoView, type Decisao, type ExecucaoView, type Parecer, type RespostaHumano, type TituloView, type TraceEvento } from "@/lib/contratos/types";
import type { CasoEntrada, JevCaso } from "@/lib/contratos/caso";
import type { ContextoTool, Papel } from "@/lib/contratos/tools";
import { registroTools, resetTools } from "@/lib/tools/registro";
import { ESPECIALISTAS } from "@/lib/agents/especialistas";
import { responderAcionamento, temPersona } from "@/lib/agents/humanos";
import { resetOrcamento } from "@/lib/agents/orcamento";
import { sessao, snapshot } from "@/lib/ai/session";
import { brl } from "@/lib/data/normalize";
import { montarCasos, tipoDoCaso } from "./casos";
import { aplicarPolitica, custoAtraso, validadorParecer, type PlanoExecucao } from "./politica";
import { criticarCitacoes } from "./critico";
import { jevTitulo, montarStateJev } from "./jev";
import { redigirAcionamento } from "./explicador";
import { gravarReplay, lerReplay } from "./replay";

export type Modo = "live" | "replay";

interface AcionamentoRT extends Acionamento {
  execucoes: PlanoExecucao[];
  obrigatorio: boolean;
  casoIds: string[];
  motivos: string[];
  acoes: string[];
}

interface DecisaoTitulo {
  acao: Acao;
  origem: Decisao["origem"];
  situacao: TituloView["situacao"];
  casoId?: string;
  resolvido?: "corrigido" | "conta_antiga" | "aprovado";
  recusado?: boolean;
}

interface CasoRT {
  entrada: CasoEntrada;
  processado: boolean;
  pareceres: Parecer[];
  trace: TraceEvento[];
  decisao: Decisao;
  simulado?: boolean;
}

interface Estado {
  store: Store;
  analise: ResultadoAnalise;
  porId: Map<string, EstadoTitulo>;
  casos: CasoRT[];
  casoDoTitulo: Map<string, string>;
  decisoes: Map<string, DecisaoTitulo>;
  acionamentos: AcionamentoRT[];
  cortes: { lote: string; em: string }[];
  processados: Set<string>;
  agora: string;
  humanos: "auto" | "manual";
  modo: Modo;
  executadas: Set<string>;
  aprovacoes: Map<string, Set<string>>; // chave da execução → quem aprovou
  historicoAcionado: boolean;
}

const g = globalThis as unknown as { __runner?: Estado };
const INICIO = "2026-11-02T08:00:00";

function criarEstado(): Estado {
  const store = carregarStore();
  const analise = analisarAgenda(store);
  const casos = montarCasos(analise, store).map<CasoRT>((entrada) => ({
    entrada,
    processado: false,
    pareceres: [],
    trace: [],
    decisao: { tituloIds: entrada.titulos.map((t) => t.titulo_id), acao: entrada.piso, origem: "piso", executaSozinho: true, justificativa: "aguardando o processamento do lote", evidencias: [] },
  }));
  const casoDoTitulo = new Map<string, string>();
  for (const c of casos) for (const t of c.entrada.titulos) casoDoTitulo.set(t.titulo_id, c.entrada.id);
  const cortes = [...new Map(analise.estados.map((e) => [e.lote, e.fechamento])).entries()].map(([lote, em]) => ({ lote, em: `${em}:00` })).sort((a, b) => a.em.localeCompare(b.em));
  resetTools();
  resetOrcamento();
  return {
    store,
    analise,
    porId: new Map(analise.estados.map((e) => [e.titulo_id, e])),
    casos,
    casoDoTitulo,
    decisoes: new Map(),
    acionamentos: [],
    cortes,
    processados: new Set(),
    agora: INICIO,
    humanos: "auto",
    modo: "replay",
    executadas: new Set(),
    aprovacoes: new Map(),
    historicoAcionado: false,
  };
}

export function estadoRunner(): Estado {
  return (g.__runner ??= criarEstado());
}

export function resetRunner() {
  resetStore();
  resetCenarios();
  g.__runner = criarEstado();
  return g.__runner;
}

export const liveDisponivel = () => !!process.env.AI_PROXY_API_KEY;

// ---------- utilitários ----------
async function limitar<T>(itens: T[], n: number, fn: (x: T) => Promise<void>) {
  const fila = [...itens];
  await Promise.all(Array.from({ length: Math.min(n, fila.length) }, async () => {
    while (fila.length) await fn(fila.shift()!);
  }));
}

const PAPEL_TOOL: Record<string, Papel> = { bloquear_titulo: "auditor", abrir_incidente: "auditor", bloquear_fornecedor: "auditor", reverter_alteracao_cadastro: "auditor" };
const ctx = (st: Estado, agente: string, casoId?: string, papel?: Papel, aprovacoes?: string[]): ContextoTool => ({ papel: papel ?? "analista_cp", agente, casoId, agora: st.agora, aprovacoes });
const chaveExec = (p: PlanoExecucao) => `${p.ferramenta}|${String(p.args.fornecedor_id ?? "")}|${String(p.args.alteracao_id ?? "")}|${String(p.args.titulo_id ?? "")}|${String(p.args.campo ?? "")}`;
const casoRT = (st: Estado, id?: string) => st.casos.find((c) => c.entrada.id === id);

function executar(st: Estado, plano: PlanoExecucao, agente: string, c: CasoRT | undefined, aprovacoes?: string[]) {
  const reg = registroTools();
  const r = reg.executar(plano.ferramenta, plano.args, ctx(st, agente, c?.entrada.id, plano.ferramenta === "reverter_alteracao_cadastro" ? "auditor" : PAPEL_TOOL[plano.ferramenta], aprovacoes));
  c?.trace.push({ t: Date.now(), kind: "execucao", agente, texto: `${plano.ferramenta}(${plano.args.titulo_id ?? plano.args.fornecedor_id ?? ""}) → ${r.ok ? "ok" : `ERRO: ${r.erro}`}`, dados: { args: plano.args, resultado: r } });
  return r.ok;
}

// ---------- processamento de um caso ----------
interface CacheCaso {
  pareceres: Parecer[];
  traceAgentes: TraceEvento[];
  jev: JevCaso | null;
  semAgente: boolean;
}

async function processarCaso(st: Estado, c: CasoRT, fornecedoresComFraude: Set<string>) {
  const e = c.entrada;
  const emit = (ev: TraceEvento) => c.trace.push(ev);
  const nRisco = e.titulos.reduce((a, t) => a + t.valorEmRisco, 0);
  emit({ t: Date.now(), kind: "observacao", agente: "passo_a", texto: `${e.titulos.length} título(s), piso = ${e.piso}; em risco ${brl(nRisco)}. Achados: ${[...new Set(e.titulos.flatMap((t) => t.achados.filter((a) => a.severidade !== "BAIXA").map((a) => a.tipo)))].join(", ")}` });
  if (e.comunicacoes.some((x) => x.sinais.includes("injecao_instrucao")))
    emit({ t: Date.now(), kind: "injecao", agente: "passo_a", texto: `comunicação com texto dirigido ao agente (${e.comunicacoes.filter((x) => x.sinais.includes("injecao_instrucao")).map((x) => x.id).join(", ")}): corpo REMOVIDO do contexto do Jev e dos especialistas; tratado como dado` });

  const cache = lerReplay<CacheCaso>("casos")[e.id];
  let pareceres: Parecer[] = [];
  let jevCaso: JevCaso | undefined;
  let semAgente = false;
  let semJev = false;

  if (cache && (st.modo === "replay" || cache.pareceres.length)) {
    pareceres = cache.pareceres;
    jevCaso = cache.jev ?? undefined;
    semJev = !cache.jev;
    semAgente = cache.semAgente;
    for (const ev of cache.traceAgentes) emit({ ...ev, t: Date.now() });
    emit({ t: Date.now(), kind: "observacao", agente: "runner", texto: "replay: pareceres e respostas lidos de analise/replay (sem chamadas ao proxy)" });
  } else if (st.modo === "replay") {
    semJev = true;
    semAgente = true;
    emit({ t: Date.now(), kind: "observacao", agente: "runner", texto: "replay sem cache para este caso: decisão só pelo piso (semJev, semAgente)" });
  } else {
    const inicioAgentes = c.trace.length;
    // PASSO B: Jev por título (risco_fraude 1x por fornecedor)
    const trocas = st.analise.trocas.filter((x) => x.fornecedor_id === e.fornecedor_id && x.recente).map((x) => ({ quando: x.quando, campos: Object.keys(x.campos), origem: x.origem, veredito: x.veredito }));
    const resultados: NonNullable<Awaited<ReturnType<typeof jevTitulo>>>[] = [];
    await limitar(e.titulos, 8, async (t) => {
      const perguntar = !fornecedoresComFraude.has(e.fornecedor_id) && t === e.titulos[0];
      const r = await jevTitulo(t, montarStateJev(t, e.comunicacoes, trocas), perguntar, st.modo);
      if (r) resultados.push(r);
    });
    fornecedoresComFraude.add(e.fornecedor_id);
    if (resultados.length) {
      const principal = [...resultados].sort((a, b) => (st.porId.get(b.titulo_id)?.valor ?? 0) - (st.porId.get(a.titulo_id)?.valor ?? 0))[0];
      jevCaso = { decisao: principal.decisao, confianca: principal.confianca, riscoFraude: Math.max(...resultados.filter((r) => r.perguntouFraude).map((r) => r.riscoFraude), 0), urgencia: Math.max(...resultados.map((r) => r.urgencia)) };
      emit({ t: Date.now(), kind: "observacao", agente: "jev", texto: `Jev (${resultados.length} título(s)): decisao_lote=${jevCaso.decisao} (conf. ${jevCaso.confianca.toFixed(2)}), risco_fraude=${jevCaso.riscoFraude.toFixed(2)}, urgência ${jevCaso.urgencia.toFixed(2)}`, dados: resultados });
    } else {
      semJev = true;
      emit({ t: Date.now(), kind: "observacao", agente: "jev", texto: "Jev indisponível: segue sem Jev (semJev)" });
    }
    // ESPECIALISTAS em paralelo
    const entrada = { ...e, jev: jevCaso };
    const res = await Promise.all(
      e.especialistas.map((esp) =>
        ESPECIALISTAS[esp](entrada, { registro: registroTools(), ctxTool: ctx(st, esp, e.id, "auditor"), emit, validar: validadorParecer(e.piso) }).catch((err: Error) => ({ parecer: null, erro: err.message, rejeicoes: 0, chamadas: 0 })),
      ),
    );
    pareceres = res.map((r) => r.parecer).filter((p): p is Parecer => !!p);
    for (const [i, r] of res.entries()) if (!r.parecer) emit({ t: Date.now(), kind: "observacao", agente: e.especialistas[i], texto: `sem parecer (${r.erro ?? "?"}): vale o piso` });
    semAgente = e.especialistas.length > 0 && pareceres.length === 0;
    gravarReplay<CacheCaso>("casos", e.id, { pareceres, traceAgentes: c.trace.slice(inicioAgentes), jev: jevCaso ?? null, semAgente });
  }

  // CRÍTICO nas evidências dos pareceres
  for (const p of pareceres) {
    const cr = criticarCitacoes(p.evidencias, st.store);
    if (!cr.ok) {
      p.evidencias = p.evidencias.filter((x) => !cr.inexistentes.some((id) => x.includes(id)));
      p.confianca = Math.min(p.confianca, 0.6);
      emit({ t: Date.now(), kind: "critico", agente: "critico", texto: `${p.especialista} citou IDs inexistentes (${cr.inexistentes.join(", ")}): removidos e confiança limitada a 0,60` });
    }
  }
  if (pareceres.length) emit({ t: Date.now(), kind: "critico", agente: "critico", texto: `citações dos ${pareceres.length} parecer(es) conferidas no store` });

  // ORQUESTRADOR + POLÍTICA
  const saida = aplicarPolitica({ caso: { ...e, jev: jevCaso }, pareceres, jev: jevCaso, semJev, semAgente, agora: Date.now() });
  c.trace.push(...saida.eventos.map((x) => ({ ...x, t: Date.now() })));
  c.pareceres = pareceres;
  c.decisao = saida.decisao;
  c.processado = true;

  // decisões por título
  for (const t of e.titulos) {
    const acao = saida.acaoPorTitulo[t.titulo_id] ?? "manter";
    const pisoT = acaoDoPiso(t.acaoMinima);
    st.decisoes.set(t.titulo_id, { acao, origem: acao === pisoT ? "piso" : saida.decisao.origem, situacao: acao === "manter" ? "processado" : "processado", casoId: e.id });
  }
  // execuções imediatas (dentro da alçada do agente)
  for (const p of saida.execucoesImediatas) {
    if (st.executadas.has(chaveExec(p))) continue;
    if (executar(st, p, "orquestrador", c)) {
      st.executadas.add(chaveExec(p));
      if (p.ferramenta === "corrigir_lancamento" && p.titulo_id) {
        const d = st.decisoes.get(p.titulo_id)!;
        d.resolvido = "corrigido";
      }
    }
  }
  // acionamentos: um por pessoa por janela de fechamento
  const janela = proximoCorte(st)?.lote ?? "fim";
  for (const pa of saida.acionamentos) {
    // um acionamento por pessoa, por janela de fechamento e por caso (misturar fornecedores confunde o aprovador)
    let ac = st.acionamentos.find((a) => a.pessoa === pa.pessoa && a.janela === janela && a.casoId === e.id && a.status === "pendente");
    if (!ac) {
      ac = { id: `ac-${janela}-${pa.pessoa}-${e.fornecedor_id}`, pessoa: pa.pessoa, casoId: e.id, janela, titulos: [], valorTotal: 0, mensagem: "", status: "pendente", execucoes: [], obrigatorio: pa.obrigatorio, casoIds: [], motivos: [], acoes: [] };
      st.acionamentos.push(ac);
    }
    const novos = pa.titulos.filter((x) => !ac!.titulos.includes(x));
    ac.titulos.push(...novos);
    ac.valorTotal = Math.round((ac.valorTotal + novos.reduce((a, id) => a + (st.porId.get(id)?.valor ?? 0), 0)) * 100) / 100;
    ac.execucoes.push(...(pa.execucoes ?? []).filter((x) => !ac!.execucoes.some((y) => chaveExec(y) === chaveExec(x))));
    if (!ac.casoIds.includes(e.id)) ac.casoIds.push(e.id);
    if (!ac.motivos.includes(pa.motivo)) ac.motivos.push(pa.motivo);
    if (pa.acaoSolicitada && !ac.acoes.includes(pa.acaoSolicitada)) ac.acoes.push(pa.acaoSolicitada);
    ac.acaoSolicitada = ac.acoes.join(" + ") || undefined;
    for (const id of pa.titulos) {
      const d = st.decisoes.get(id);
      if (d && (pa.execucoes?.length || d.acao === "escalar" || d.acao === "bloquear")) d.situacao = "aguardando_humano";
    }
  }
}

/** Evidência que o humano precisa para decidir: decisão, pareceres e o que o fornecedor respondeu no canal do cadastro. */
function resumoParaHumano(c: CasoRT) {
  const forn = c.trace.filter((t) => t.kind === "resposta_fornecedor").map((t) => `fornecedor respondeu pelo canal do cadastro [simulado]: "${t.texto.slice(0, 300)}"`);
  const achados = [...new Set(c.entrada.titulos.flatMap((t) => t.achados.filter((a) => a.severidade === "ALTA").map((a) => `${a.tipo}: ${a.detalhe.slice(0, 200)}`)))].slice(0, 4);
  return [
    `Decisão: ${c.decisao.justificativa}`,
    ...achados.map((a) => `Fato verificado: ${a}`),
    ...c.pareceres.map((p) => `Parecer ${p.especialista}: ${p.acao} (risco ${p.risco.toFixed(2)}, confiança ${p.confianca.toFixed(2)}): ${p.resumo}`),
    ...forn,
  ].join(" ");
}

// ---------- humanos ----------
function aplicarResposta(st: Estado, ac: AcionamentoRT, r: RespostaHumano) {
  ac.resposta = r;
  ac.status = r.decisao === "aprovar" ? "aprovado" : r.decisao === "recusar" ? "recusado" : "mais_info";
  for (const id of ac.casoIds) casoRT(st, id)?.trace.push({ t: Date.now(), kind: "resposta_humano", agente: r.pessoa, texto: `${r.simulada ? "[humano simulado] " : ""}${r.pessoa}: ${r.decisao}: ${r.motivo}${r.pergunta ? ` | pergunta: ${r.pergunta}` : ""}`, dados: r });

  if (r.decisao === "aprovar") {
    for (const p of ac.execucoes) {
      const k = chaveExec(p);
      const set = st.aprovacoes.get(k) ?? new Set<string>();
      set.add(ac.pessoa);
      st.aprovacoes.set(k, set);
      const exigidas = p.exigeAprovacao ?? [];
      const faltam = exigidas.filter((x) => !set.has(x));
      const c = casoRT(st, ac.casoIds[0]);
      if (faltam.length) {
        c?.trace.push({ t: Date.now(), kind: "observacao", agente: "politica", texto: `${p.ferramenta}: aprovação de ${ac.pessoa} registrada; faltam ${faltam.join(", ")} (aprovação dupla)` });
        continue;
      }
      if (st.executadas.has(k)) continue;
      if (executar(st, p, "orquestrador", c, [...set])) {
        st.executadas.add(k);
        if (p.ferramenta === "reverter_alteracao_cadastro") {
          for (const cid of ac.casoIds) for (const t of casoRT(st, cid)?.entrada.titulos ?? [])
            if (t.achados.some((a) => a.tipo === "TROCA_BANCARIA_SUSPEITA")) Object.assign(st.decisoes.get(t.titulo_id)!, { resolvido: "conta_antiga", situacao: "processado", origem: "orquestrador" });
        } else if (p.ferramenta === "corrigir_lancamento" && p.titulo_id) Object.assign(st.decisoes.get(p.titulo_id)!, { resolvido: "corrigido", situacao: "processado" });
      }
    }
    if (ac.acoes.includes("liberar_pagamento")) for (const id of ac.titulos) Object.assign(st.decisoes.get(id) ?? {}, { resolvido: "aprovado", situacao: "processado" });
  } else if (r.decisao === "recusar") {
    for (const id of ac.titulos) Object.assign(st.decisoes.get(id) ?? {}, { recusado: true });
  } else if ((ac.rodadasMaisInfo ?? 0) < 1) {
    // o agente responde UMA rodada com evidências e reenvia
    ac.rodadasMaisInfo = 1;
    const evid = [...new Set(ac.casoIds.flatMap((id) => casoRT(st, id)?.decisao.evidencias ?? []))].slice(0, 12);
    ac.mensagem += ` | Mais informações (agente): ${ac.casoIds.map((id) => casoRT(st, id)?.decisao.justificativa).join(" / ")}. Evidências: ${evid.join(", ")}.`;
    ac.status = "pendente";
  }
}

async function rodarHumanos(st: Estado) {
  if (st.humanos !== "auto") return;
  for (let rodada = 0; rodada < 2; rodada++) {
    const pend = st.acionamentos.filter((a) => a.status === "pendente" && temPersona(a.pessoa) && (a.rodadasMaisInfo ?? 0) === rodada);
    for (const ac of pend) {
      const chave = `${ac.id}|${rodada}`;
      const cache = lerReplay<RespostaHumano>("humanos")[chave];
      let r: RespostaHumano | null = cache ?? null;
      if (!r && st.modo === "live") {
        const cv = casoView(st, casoRT(st, ac.casoId)!);
        r = await responderAcionamento({ ...ac, mensagem: `${ac.mensagem}\n\nCONTEXTO VERIFICADO PELO SISTEMA: ${ac.casoIds.map((id) => resumoParaHumano(casoRT(st, id)!)).join(" | ")}`.slice(0, 6000) }, { caso: cv, agora: st.agora, rodada });
        if (r) gravarReplay("humanos", chave, r);
      }
      if (r) aplicarResposta(st, ac, r);
    }
  }
}

/** Passo C: redige as mensagens ainda vazias (crítico + template) e grava em analise/replay/mensagens.json. */
async function redigirPendentes(st: Estado) {
  for (const ac of st.acionamentos.filter((a) => !a.mensagem)) {
    const casos = ac.casoIds.map((id) => casoRT(st, id)!).filter(Boolean);
    const chave = `${ac.id}`;
    const cache = lerReplay<{ mensagem: string; critico: string }>("mensagens")[chave];
    const red = cache && st.modo === "replay" ? { ...cache, fonte: "cache" } : await redigirAcionamento({ pessoa: ac.pessoa, titulos: ac.titulos, valorTotal: ac.valorTotal, motivos: ac.motivos, acoes: ac.acoes, fornecedores: [...new Set(casos.map((c) => c.entrada.fornecedor_nome))], evidencias: [...new Set(casos.flatMap((c) => c.decisao.evidencias))].slice(0, 10), resumoCasos: casos.map(resumoParaHumano).join(" | ") }, st.store, st.modo === "live");
    ac.mensagem = red.mensagem;
    if (st.modo === "live") gravarReplay("mensagens", chave, { mensagem: red.mensagem, critico: red.critico });
    for (const c of casos) c.trace.push({ t: Date.now(), kind: "critico", agente: "critico", texto: `acionamento ${ac.pessoa}: ${red.critico}` });
  }
}

// ---------- corte ----------
function proximoCorte(st: Estado) {
  return st.cortes.find((c) => !st.processados.has(c.lote)) ?? null;
}

function fecharLote(st: Estado, lote: string) {
  for (const e of st.analise.estados.filter((x) => x.lote === lote)) {
    const d = st.decisoes.get(e.titulo_id) ?? { acao: "manter" as Acao, origem: "piso" as const, situacao: "processado" as const };
    let paga: boolean;
    if (d.recusado) paga = false;
    else if (d.resolvido) paga = true;
    else if (d.acao === "manter") paga = true;
    else if (d.acao === "corrigir") paga = e.valorEmRisco === 0; // a menos: paga como está; a mais sem aprovação: contém
    else paga = false; // retirar / escalar / bloquear sem resolução → contenção no corte
    const c = casoRT(st, st.casoDoTitulo.get(e.titulo_id));
    if (!paga && (d.acao === "escalar" || d.acao === "bloquear" || d.acao === "corrigir" || d.recusado)) {
      registroTools().executar("retirar_do_lote", { titulo_id: e.titulo_id, motivo: "contenção no corte: sem decisão humana a tempo" }, ctx(st, "politica"));
      c?.trace.push({ t: Date.now(), kind: "execucao", agente: "politica", texto: `contenção no corte ${lote}: ${e.titulo_id} retirado do lote (sem decisão humana a tempo${d.recusado ? " / recusado" : ""})` });
    }
    st.decisoes.set(e.titulo_id, { ...d, situacao: paga ? "pago" : "retido" });
  }
  // acionamentos desta janela ainda pendentes ficam como estão (registro); a contenção já foi aplicada
  st.processados.add(lote);
}

// ---------- avançar ----------
export async function avancar(opts: { modo?: Modo; humanos?: "auto" | "manual" } = {}) {
  const st = estadoRunner();
  st.modo = opts.modo === "live" && liveDisponivel() ? "live" : "replay";
  if (opts.humanos) st.humanos = opts.humanos;
  const corte = proximoCorte(st);
  if (!corte) return { fim: true };

  if (!st.historicoAcionado) acionarHistorico(st, corte.lote);

  const pendentes = st.casos.filter((c) => !c.processado && c.entrada.titulos.some((t) => t.lote === corte.lote));
  const fraude = new Set<string>();
  await limitar(pendentes, 8, (c) => processarCaso(st, c, fraude));

  await redigirPendentes(st);
  await rodarHumanos(st);
  st.agora = corte.em;
  fecharLote(st, corte.lote);
  return { fim: false, lote: corte.lote, casos: pendentes.length };
}

function acionarHistorico(st: Estado, janela: string) {
  st.historicoAcionado = true;
  const h = st.analise.duplicidadesHistoricas;
  const titulos = h.itens.flatMap((i) => i.titulos.slice(1));
  const caso: CasoRT = {
    entrada: { id: "caso-historico", tipo: "recuperacao", fornecedor_id: "varios", fornecedor_nome: "vários fornecedores", categoria: "", titulos: [], piso: "manter", comunicacoes: [], especialistas: [] },
    processado: true,
    pareceres: [],
    trace: [{ t: Date.now(), kind: "observacao", agente: "passo_a", texto: `${h.itens.length} parcelas pagas em dobro entre ago e out (${brl(h.total)}): recuperação com o controller` }],
    decisao: { tituloIds: titulos, acao: "escalar", origem: "piso", executaSozinho: false, justificativa: `recuperar ${brl(h.total)} pagos em duplicidade; causa raiz: mesma NF lançada por xml_portal e boleto_email`, evidencias: titulos.slice(0, 10) },
  };
  st.casos.push(caso);
  registroTools().executar("abrir_incidente", { tipo: "pagamento_duplicado", causa_provavel: "processo", titulos, descricao: "55 parcelas pagas 2x (xml_portal + boleto_email)" }, ctx(st, "orquestrador", caso.entrada.id, "auditor"));
  registroTools().executar("propor_correcao_processo", { processo: "lançamento de títulos", descricao: "trava no ERP: chave fornecedor + NF normalizada + parcela", evidencias: titulos.slice(0, 5) }, ctx(st, "orquestrador", caso.entrada.id, "auditor"));
  st.acionamentos.push({ id: `ac-${janela}-PS09`, pessoa: "PS09", casoId: caso.entrada.id, janela, titulos, valorTotal: h.total, mensagem: "", status: "pendente", execucoes: [], obrigatorio: true, casoIds: [caso.entrada.id], motivos: ["recuperação de pagamento em duplicidade já realizado"], acoes: ["recuperar_pagamento_indevido"], acaoSolicitada: "recuperar_pagamento_indevido" });
}

// ---------- ação manual (UI) ----------
export async function acaoHumana(acionamentoId: string, decisao: RespostaHumano["decisao"], motivo?: string) {
  const st = estadoRunner();
  const ac = st.acionamentos.find((a) => a.id === acionamentoId);
  if (!ac) throw new Error(`acionamento ${acionamentoId} não encontrado`);
  if (ac.status !== "pendente" && ac.status !== "mais_info") throw new Error(`acionamento já ${ac.status}`);
  aplicarResposta(st, ac, { pessoa: ac.pessoa, decisao, motivo: motivo || "decisão manual na interface", simulada: false });
  if (ac.status === "pendente") await rodarHumanos(st);
  return ac;
}

// ---------- views ----------
function casoView(st: Estado, c: CasoRT): CasoView {
  const e = c.entrada;
  return {
    id: e.id,
    tipo: e.tipo,
    titulo: `${e.fornecedor_nome}: ${tipoDoCaso(e.titulos).rotulo}`,
    fornecedor_id: e.fornecedor_id,
    titulos: e.titulos.length ? e.titulos.map((t) => t.titulo_id) : c.decisao.tituloIds,
    valorTotal: e.titulos.length ? Math.round(e.titulos.reduce((a, t) => a + t.valor, 0) * 100) / 100 : st.analise.duplicidadesHistoricas.total,
    pareceres: c.pareceres,
    trace: c.trace,
    decisao: c.decisao,
    ...(c.simulado ? { simulado: true } : {}),
  };
}

export function placar(st: Estado) {
  const total = Math.round(st.analise.estados.reduce((a, e) => a + e.valorEmRisco, 0) * 100) / 100;
  let restante = 0;
  let atraso = 0;
  for (const e of st.analise.estados) {
    const d = st.decisoes.get(e.titulo_id);
    const lotePronto = st.processados.has(e.lote);
    if (!lotePronto) {
      restante += e.valorEmRisco; // sem sistema ainda: sairia com o tesoureiro assinando
      continue;
    }
    if (d?.situacao === "pago") {
      if (!d.resolvido) restante += e.valorEmRisco;
    } else if (d?.situacao === "retido") {
      const legitimo = !e.achados.some((a) => a.acaoMinima === "retirar_do_lote");
      if (legitimo) atraso += custoAtraso(e.valor, e.categoria);
    }
  }
  const desnecessarios = st.acionamentos.filter((a) => !a.obrigatorio).length;
  restante = Math.round(restante * 100) / 100;
  atraso = Math.round(atraso * 100) / 100;
  return {
    semSistema: -total,
    comSistema: -Math.round((restante + atraso + 60 * desnecessarios) * 100) / 100,
    indevidoEvitado: Math.round((total - restante) * 100) / 100,
    custoAtraso: atraso,
    acionamentosHumanos: st.acionamentos.length,
  };
}

function lerAblacao(): AblacaoResultado[] | null {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), "analise", "ablacao.json"), "utf8"));
    return Array.isArray(j) ? j : (j.resultados ?? null);
  } catch {
    return null;
  }
}

export function view(): ExecucaoView {
  const st = estadoRunner();
  const corte = proximoCorte(st);
  const titulos: TituloView[] = st.analise.estados.map((e) => {
    const d = st.decisoes.get(e.titulo_id);
    const piso = acaoDoPiso(e.acaoMinima);
    return {
      titulo_id: e.titulo_id,
      lote: e.lote,
      banco: e.banco,
      fechamento: e.fechamento,
      fornecedor_id: e.fornecedor_id,
      fornecedor_nome: e.fornecedor_nome,
      categoria: e.categoria,
      valor: e.valor,
      vencimento: e.vencimento,
      forma_pagamento: e.forma_pagamento,
      status: e.status,
      piso,
      acao: d?.acao ?? piso,
      origem: d?.origem ?? "piso",
      situacao: d?.situacao ?? (st.processados.has(e.lote) ? "pago" : "na_fila"),
      casoId: st.casoDoTitulo.get(e.titulo_id),
      alcada: e.alcada,
      valorEmRisco: e.valorEmRisco,
      achados: e.achados.map((a) => ({ tipo: a.tipo, severidade: a.severidade, detalhe: a.detalhe })),
    };
  });
  const s = snapshot();
  return {
    modo: st.modo,
    liveDisponivel: liveDisponivel(),
    humanos: st.humanos,
    relogio: { agora: st.agora, proximoCorte: corte ? { lote: corte.lote.endsWith("MER") ? "MER" : "LIT", em: corte.em } : null },
    titulos,
    casos: st.casos.filter((c) => c.processado).map((c) => casoView(st, c)).concat(st.casos.filter((c) => !c.processado).map((c) => casoView(st, c))),
    acionamentos: st.acionamentos.map(({ execucoes, obrigatorio, casoIds, motivos, acoes, ...a }) => a),
    custos: { chat: { chamadas: s.chatChamadas, tokens: s.chatTokens }, jev: { usd: s.jevUsd }, linhas: sessao.historico.slice(-30).map((h) => h.linha) },
    placar: placar(st),
    ablacao: lerAblacao(),
  };
}

/** Para cenários injetados (subagente injecao): registra um caso novo e processa na hora. */
export async function processarCasoInjetado(entrada: CasoEntrada, eventoInicial: string): Promise<string> {
  const st = estadoRunner();
  const c: CasoRT = { entrada, processado: false, pareceres: [], trace: [{ t: Date.now(), kind: "injecao", agente: "cenario", texto: eventoInicial }], decisao: { tituloIds: entrada.titulos.map((t) => t.titulo_id), acao: entrada.piso, origem: "piso", executaSozinho: true, justificativa: "processando", evidencias: [] }, simulado: true };
  st.casos.unshift(c);
  for (const t of entrada.titulos) {
    st.casoDoTitulo.set(t.titulo_id, entrada.id);
    if (!st.porId.has(t.titulo_id)) {
      st.porId.set(t.titulo_id, t);
      st.analise.estados.push(t);
    }
  }
  // injeção é demo ao vivo: usa o proxy se houver chave (o cache de replay, se existir, tem prioridade dentro de processarCaso)
  const modoAntes = st.modo;
  st.modo = liveDisponivel() ? "live" : "replay";
  await processarCaso(st, c, new Set());
  await redigirPendentes(st);
  await rodarHumanos(st);
  st.modo = modoAntes;
  return entrada.id;
}
