// POLÍTICA (função pura): confere qualquer proposta (Jev, especialista, orquestrador) contra o piso do Passo A,
// a alçada e o papel; decide execução, contenção no corte e QUEM acionar. O LLM nunca escolhe destinatário.
import type { Acao, Decisao, Parecer, TraceEvento } from "@/lib/contratos/types";
import { CONSERVADORISMO } from "@/lib/contratos/types";
import type { CasoEntrada, JevCaso } from "@/lib/contratos/caso";
import type { EstadoTitulo, TipoAchado } from "@/lib/rules/tipos";
import { acaoDoPiso } from "@/lib/contratos/types";

// ---------- parâmetros (calibráveis; ver CLAUDE.md) ----------
export const CONF_ALTA = 0.85;
export const CONF_MEDIA = 0.7;
export const FRAUDE_BLOQUEIO = 0.5;
export const FRAUDE_JURIDICO = 0.8;
export const ANALISTA_ATE = 5000;
export const APROVADOR_ATE = 50000;
export const CUSTO_ACIONAMENTO = 60;
export const DIAS_ATRASO = 7;
export const CUSTO_RELACIONAMENTO: Record<string, number> = {
  produto: 3000, frete: 1500, embalagens: 800, insumos_capa: 800, aluguel: 500,
  ti_saas: 400, utilidades: 400, servicos: 300, marketing_agencia: 300, influenciador: 250,
};

/** Custo de atrasar um título legítimo (7 dias): multa 2% + juros 1% a.m. pro rata + relacionamento. */
export function custoAtraso(valor: number, categoria: string) {
  return Math.round((valor * (0.02 + (0.01 * DIAS_ATRASO) / 30) + (CUSTO_RELACIONAMENTO[categoria] ?? 300)) * 100) / 100;
}

// ---------- transições a partir do piso ----------
export const TRANSICOES: Record<Acao, Acao[]> = {
  manter: ["manter", "corrigir", "retirar", "escalar", "bloquear"],
  corrigir: ["corrigir", "escalar", "bloquear"],
  retirar: ["retirar", "escalar", "bloquear"],
  escalar: ["escalar", "bloquear"],
  bloquear: ["bloquear"],
};

export const transicaoPermitida = (piso: Acao, proposta: Acao) => TRANSICOES[piso].includes(proposta);

export function motivoRejeicao(piso: Acao, proposta: Acao): string | null {
  if (transicaoPermitida(piso, proposta)) return null;
  if (CONSERVADORISMO[proposta] < CONSERVADORISMO[piso])
    return `piso do Passo A é "${piso}" (fato verificado por código); "${proposta}" rebaixaria a ação. Permitido: ${TRANSICOES[piso].join(", ")}`;
  return `piso "${piso}" não pode virar "${proposta}" (troca de tipo de ação). Permitido: ${TRANSICOES[piso].join(", ")}`;
}

/** Validador entregue ao loop do especialista. */
export const validadorParecer = (piso: Acao) => (p: Parecer) => motivoRejeicao(piso, p.acao);

export function maisConservadora(acoes: Acao[]): Acao {
  return acoes.reduce((a, b) => (CONSERVADORISMO[b] > CONSERVADORISMO[a] ? b : a), "manter" as Acao);
}

export function jevParaAcao(decisao: string): Acao {
  return ({ manter_no_lote: "manter", corrigir_lancamento: "corrigir", retirar_do_lote: "retirar", escalar_aprovacao: "escalar" } as Record<string, Acao>)[decisao] ?? "manter";
}

// ---------- planos de saída ----------
export interface PlanoExecucao {
  ferramenta: string;
  args: Record<string, unknown>;
  titulo_id?: string;
  exigeAprovacao?: string[]; // aprovações necessárias antes de executar
}

export interface PlanoAcionamento {
  pessoa: string;
  titulos: string[];
  valorTotal: number;
  motivo: string;
  acaoSolicitada?: string;
  /** a execução pendente desta aprovação (se houver) */
  execucoes?: PlanoExecucao[];
  obrigatorio: boolean; // exigido pela política (alçada/dupla/fraude/baixa)
}

export interface SaidaPolitica {
  decisao: Decisao;
  acaoPorTitulo: Record<string, Acao>;
  execucoesImediatas: PlanoExecucao[];
  acionamentos: PlanoAcionamento[];
  eventos: TraceEvento[];
  riscoFraude: number;
}

export interface EntradaPolitica {
  caso: CasoEntrada;
  pareceres: Parecer[];
  jev?: JevCaso;
  semJev?: boolean;
  semAgente?: boolean;
  agora: number;
}

const tem = (t: EstadoTitulo, ...tipos: TipoAchado[]) => t.achados.some((a) => tipos.includes(a.tipo));
const soma = (ts: EstadoTitulo[]) => Math.round(ts.reduce((a, t) => a + t.valor, 0) * 100) / 100;

/** Comprador responsável pela categoria (PS04 produto/embalagens; PS05 insumos/serviços). */
const comprador = (categoria: string) => (categoria === "produto" || categoria === "embalagens" ? "PS04" : "PS05");

export function aplicarPolitica(e: EntradaPolitica): SaidaPolitica {
  const { caso, pareceres } = e;
  const ev: TraceEvento[] = [];
  const log = (kind: TraceEvento["kind"], texto: string, dados?: unknown) => ev.push({ t: e.agora, kind, texto, agente: "politica", dados });
  const piso = caso.piso;

  // 1) candidatos: piso + Jev (se confiável e permitido) + pareceres (já validados no loop)
  const candidatos: { acao: Acao; origem: Decisao["origem"]; quem: string }[] = [{ acao: piso, origem: "piso", quem: "passo_a" }];
  if (e.jev && !e.semJev) {
    const a = jevParaAcao(e.jev.decisao);
    if (e.jev.confianca >= CONF_MEDIA && transicaoPermitida(piso, a)) candidatos.push({ acao: a, origem: "jev", quem: "jev" });
    else if (!transicaoPermitida(piso, a)) log("rejeicao_politica", `Jev propôs "${a}" (conf. ${e.jev.confianca.toFixed(2)}): ${motivoRejeicao(piso, a)}`);
  }
  for (const p of pareceres) {
    if (transicaoPermitida(piso, p.acao)) candidatos.push({ acao: p.acao, origem: "especialista", quem: p.especialista });
    else log("rejeicao_politica", `${p.especialista} propôs "${p.acao}": ${motivoRejeicao(piso, p.acao)}`);
  }

  // 2) risco de fraude: o especialista que investigou (cadastro_fraude) prevalece sobre o Jev
  const pf = pareceres.find((p) => p.especialista === "cadastro_fraude");
  const riscoFraude = pf ? pf.risco : e.jev && !e.semJev ? e.jev.riscoFraude : 0;
  const temSinalFraude = caso.titulos.some((t) => tem(t, "TROCA_BANCARIA_SUSPEITA", "BOLETO_BENEFICIARIO", "BOLETO_BANCO_NOVO", "COMUNICACAO_SUSPEITA", "CNPJ_DIVERGENTE"));
  const fraude = riscoFraude >= FRAUDE_BLOQUEIO && temSinalFraude;
  if (fraude) candidatos.push({ acao: "bloquear", origem: "orquestrador", quem: `risco_fraude ${riscoFraude.toFixed(2)}` });

  // 3) conflito entre especialistas → vence o mais conservador
  const distintas = [...new Set(pareceres.map((p) => p.acao))];
  let acao = maisConservadora(candidatos.map((c) => c.acao));
  let origem = candidatos.filter((c) => c.acao === acao).sort((a, b) => (a.origem === "piso" ? 1 : 0) - (b.origem === "piso" ? 1 : 0))[0].origem;
  if (distintas.length > 1)
    ev.push({ t: e.agora, kind: "conflito", agente: "orquestrador", texto: `pareceres divergem (${pareceres.map((p) => `${p.especialista}=${p.acao}`).join(", ")}): vence o mais conservador = ${acao}`, dados: { pareceres, vencedor: acao } });

  // 4) piso "manter": só endurece se valer a pena (p(erro) × valor > R$ 60 + custo de atraso)
  if (piso === "manter" && acao !== "manter" && !fraude) {
    const pErro = Math.max(0, ...pareceres.filter((p) => p.acao === acao).map((p) => p.risco), e.jev ? 1 - (e.jev.confianca ?? 0) : 0);
    const valor = soma(caso.titulos);
    const custo = CUSTO_ACIONAMENTO + caso.titulos.reduce((a, t) => a + custoAtraso(t.valor, t.categoria), 0);
    if (pErro * valor <= custo) {
      log("observacao", `endurecimento descartado: p(erro) ${pErro.toFixed(2)} × ${valor.toFixed(2)} ≤ R$ 60 + atraso ${custo.toFixed(2)}`);
      acao = "manter";
      origem = "piso";
    }
  }

  // 5) ação por título: a decisão do caso só atinge quem tem problema (ou todos, em fraude)
  const acaoPorTitulo: Record<string, Acao> = {};
  for (const t of caso.titulos) {
    const pisoT = acaoDoPiso(t.acaoMinima);
    const implicado = fraude ? tem(t, "TROCA_BANCARIA_SUSPEITA", "BOLETO_BENEFICIARIO", "BOLETO_BANCO_NOVO", "COMUNICACAO_SUSPEITA", "CNPJ_DIVERGENTE") || pisoT !== "manter" : pisoT !== "manter";
    acaoPorTitulo[t.titulo_id] = implicado ? (transicaoPermitida(pisoT, acao) ? maisConservadora([pisoT, acao]) : pisoT) : "manter";
  }
  const alvos = caso.titulos.filter((t) => acaoPorTitulo[t.titulo_id] !== "manter");

  // 6) execuções e acionamentos (código decide destinatário)
  const imediatas: PlanoExecucao[] = [];
  const acion: PlanoAcionamento[] = [];
  const add = (p: PlanoAcionamento) => {
    const ja = acion.find((x) => x.pessoa === p.pessoa && x.acaoSolicitada === p.acaoSolicitada);
    if (ja) {
      ja.titulos = [...new Set([...ja.titulos, ...p.titulos])];
      ja.valorTotal = Math.round((ja.valorTotal + p.valorTotal) * 100) / 100;
      ja.execucoes = [...(ja.execucoes ?? []), ...(p.execucoes ?? [])];
    } else acion.push(p);
  };

  if (fraude) {
    for (const t of alvos) imediatas.push({ ferramenta: "bloquear_titulo", args: { titulo_id: t.titulo_id, motivo: `suspeita de fraude (risco ${riscoFraude.toFixed(2)})` }, titulo_id: t.titulo_id });
    imediatas.push({ ferramenta: "abrir_incidente", args: { tipo: "fraude", causa_provavel: "canal", titulos: alvos.map((t) => t.titulo_id), descricao: `${caso.fornecedor_nome}: ${caso.tipo}, risco ${riscoFraude.toFixed(2)}` } });
    add({ pessoa: "PS01", titulos: alvos.map((t) => t.titulo_id), valorTotal: soma(alvos), motivo: "suspeita de fraude", obrigatorio: true });
    if (riscoFraude >= FRAUDE_JURIDICO) add({ pessoa: "PS08", titulos: alvos.map((t) => t.titulo_id), valorTotal: soma(alvos), motivo: "tentativa de golpe", obrigatorio: true });
  }

  // troca bancária: UMA reversão por fornecedor, aprovação dupla (aprovador + PS01; algum título > 50 mil → + PS03)
  const comTroca = alvos.filter((t) => t.achados.some((x) => x.tipo === "TROCA_BANCARIA_SUSPEITA") && (acaoPorTitulo[t.titulo_id] === "escalar" || acaoPorTitulo[t.titulo_id] === "bloquear"));
  if (comTroca.length) {
    const alteracoes = [...new Set(comTroca.flatMap((t) => t.achados.filter((x) => x.tipo === "TROCA_BANCARIA_SUSPEITA").flatMap((x) => x.evidencias)))];
    const acimaDe50 = comTroca.filter((t) => t.valor > APROVADOR_ATE);
    const exige = ["aprovador", "PS01", ...(acimaDe50.length ? ["PS03"] : [])];
    const exec: PlanoExecucao = { ferramenta: "reverter_alteracao_cadastro", args: { fornecedor_id: caso.fornecedor_id, alteracao_id: alteracoes.join(","), evidencias: alteracoes }, exigeAprovacao: exige };
    const ids = comTroca.map((t) => t.titulo_id);
    const oque = `aprovar alteração cadastral: desfazer a troca de conta (${alteracoes.join(", ")}) e voltar ao banco anterior do cadastro. Não é liberação de pagamento novo: os títulos são dívidas legítimas que seguirão para a conta antiga`;
    add({ pessoa: "aprovador", titulos: ids, valorTotal: soma(comTroca), motivo: oque, acaoSolicitada: "reverter_alteracao_cadastro", execucoes: [exec], obrigatorio: true });
    add({ pessoa: "PS01", titulos: ids, valorTotal: soma(comTroca), motivo: `2ª aprovação (dupla): ${oque}`, acaoSolicitada: "reverter_alteracao_cadastro", execucoes: [exec], obrigatorio: true });
    if (acimaDe50.length) add({ pessoa: "PS03", titulos: acimaDe50.map((t) => t.titulo_id), valorTotal: soma(acimaDe50), motivo: `título acima de R$ 50 mil: ${oque}`, acaoSolicitada: "reverter_alteracao_cadastro", execucoes: [exec], obrigatorio: true });
  }
  const idsTroca = new Set(comTroca.map((t) => t.titulo_id));

  for (const t of alvos) {
    const a = acaoPorTitulo[t.titulo_id];
    const ids = [t.titulo_id];
    if (idsTroca.has(t.titulo_id)) continue;
    // correções com sugestão do Passo A
    const pisoT = acaoDoPiso(t.acaoMinima);
    const sug = t.achados.find((x) => x.sugestao && x.acaoMinima === "corrigir_lancamento")?.sugestao;
    // escalar/bloquear sobre um piso "corrigir" com sugestão = pedir aprovação DA CORREÇÃO (não liberar o pagamento como está)
    if (sug && a !== "retirar" && pisoT === "corrigir") {
      const diff = sug.campo === "valor" ? Math.abs(Number(sug.valor_novo) - t.valor) : t.valor;
      const exec: PlanoExecucao = { ferramenta: "corrigir_lancamento", args: { titulo_id: t.titulo_id, campo: sug.campo, valor_novo: sug.valor_novo, justificativa: `Passo A: ${sug.fonte}`, evidencias: [t.titulo_id, sug.fonte] }, titulo_id: t.titulo_id };
      if (!sug.exigeAprovador && diff <= ANALISTA_ATE) imediatas.push(exec);
      else add({ pessoa: "aprovador", titulos: ids, valorTotal: t.valor, motivo: `corrigir ${sug.campo}`, acaoSolicitada: "corrigir_lancamento", execucoes: [{ ...exec, exigeAprovacao: ["aprovador"] }], obrigatorio: true });
      continue;
    }
    // piso "retirar" (já pago, duplicado, OC inválida) escalado: retirar está na alçada do agente; não se pede "liberação"
    if (a === "retirar" || (pisoT === "retirar" && a === "escalar")) {
      imediatas.push({ ferramenta: "retirar_do_lote", args: { titulo_id: t.titulo_id, motivo: t.achados.filter((x) => x.acaoMinima === "retirar_do_lote").map((x) => x.tipo).join(", ") || "decisão do orquestrador" }, titulo_id: t.titulo_id });
      if (tem(t, "JA_PAGO_AVULSO", "JA_PAGO_EXTRATO", "JA_PAGO_ERP", "BOLETO_DDA_BAIXADO")) add({ pessoa: "PS02", titulos: ids, valorTotal: t.valor, motivo: "título já pago fora do lote: baixa manual no ERP", acaoSolicitada: "baixa_manual", obrigatorio: true });
      if (tem(t, "OC_NAO_APROVADA", "OC_INEXISTENTE", "OC_ENCERRADA", "OC_X_NF")) add({ pessoa: comprador(t.categoria), titulos: ids, valorTotal: t.valor, motivo: "OC pendente/cancelada ou divergente", acaoSolicitada: "regularizar_oc", obrigatorio: true });
      continue;
    }
    if (a === "escalar" && !fraude) {
      for (const p of t.alcada.aprovadores.length ? t.alcada.aprovadores : ["aprovador"]) add({ pessoa: p, titulos: ids, valorTotal: t.valor, motivo: t.alcada.motivosDupla.join("; ") || "acima da alçada", acaoSolicitada: "liberar_pagamento", obrigatorio: true });
    }
  }

  const executaSozinho = acion.length === 0;
  const precisaContencao = alvos.some((t) => t.valorEmRisco > 0 || acaoPorTitulo[t.titulo_id] === "bloquear" || acaoPorTitulo[t.titulo_id] === "escalar");
  const decisao: Decisao = {
    tituloIds: alvos.map((t) => t.titulo_id),
    acao,
    origem,
    executaSozinho,
    ...(!executaSozinho && precisaContencao ? { contencaoNoCorte: "retirar" as const } : {}),
    justificativa: alvos.length
      ? `${acao} em ${alvos.length} título(s) de ${caso.fornecedor_nome}${fraude ? `; risco de fraude ${riscoFraude.toFixed(2)}` : ""}${executaSozinho ? "; executado na alçada do agente" : `; ${acion.length} acionamento(s) exigido(s) pela política`}`
      : "nenhum título com problema confirmado; segue no lote",
    evidencias: [...new Set(alvos.flatMap((t) => t.achados.flatMap((a) => a.evidencias)).concat(pareceres.flatMap((p) => p.evidencias)))].slice(0, 30),
    ...(e.semJev ? { semJev: true } : {}),
    ...(e.semAgente ? { semAgente: true } : {}),
  };
  ev.push({ t: e.agora, kind: "proposta", agente: "orquestrador", texto: decisao.justificativa, dados: { acao, acaoPorTitulo, acionamentos: acion.map((a) => ({ pessoa: a.pessoa, titulos: a.titulos.length, acao: a.acaoSolicitada })) } });
  return { decisao, acaoPorTitulo, execucoesImediatas: imediatas, acionamentos: acion, eventos: ev, riscoFraude };
}
