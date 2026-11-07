// Passo A: motor determinístico. Gera o EstadoTitulo de cada título da agenda de remessa.
import type { Store, Linha } from "@/lib/data/store";
import { carregarStore } from "@/lib/data/store";
import { brl, dataHora, normNF, num } from "@/lib/data/normalize";
import { calcularAlcada } from "./alcadas";
import { bancosHistoricos, conferirBoleto } from "./boleto";
import { analisarTrocasBancarias, type TrocaBancaria } from "./cadastro";
import { analisarComunicacoes, type ComunicacaoAnalisada } from "./comunicacoes";
import { chaveDup, duplicidadesHistoricas, indexarDuplicidade, tituloMantido, type DuplicidadeHistorica } from "./duplicidade";
import { avulsoDoTitulo, indexarExtratos } from "./extratos";
import { lerPoliticas, type Politicas } from "./politicas";
import { conferirNF, conferirOC } from "./tresVias";
import { FORCA_ACAO, type Acao, type Achado, type EstadoTitulo } from "./tipos";

export interface ContextoAnalise {
  politicas: Politicas;
  extratos: ReturnType<typeof indexarExtratos>;
  bancos: Map<string, Set<string>>;
  duplicidade: Map<string, Linha[]>;
  trocas: Map<string, TrocaBancaria[]>;
  comunicacoes: ComunicacaoAnalisada[];
  comunicacoesPorFornecedor: Map<string, ComunicacaoAnalisada[]>;
  historico: { itens: DuplicidadeHistorica[]; total: number };
  creditoPorNF: Map<string, DuplicidadeHistorica[]>; // `${fid}|${nf}`
}

export function prepararContexto(s: Store): ContextoAnalise {
  const bancos = bancosHistoricos(s);
  const comunicacoes = analisarComunicacoes(s, bancos);
  const comunicacoesPorFornecedor = new Map<string, ComunicacaoAnalisada[]>();
  for (const c of comunicacoes) if (c.fornecedor_id) comunicacoesPorFornecedor.set(c.fornecedor_id, [...(comunicacoesPorFornecedor.get(c.fornecedor_id) ?? []), c]);
  const historico = duplicidadesHistoricas(s);
  const creditoPorNF = new Map<string, DuplicidadeHistorica[]>();
  for (const h of historico.itens) {
    const [fid, nf] = h.chave.split("|");
    const k = `${fid}|${nf}`;
    creditoPorNF.set(k, [...(creditoPorNF.get(k) ?? []), h]);
  }
  return {
    politicas: lerPoliticas(s.politicas),
    extratos: indexarExtratos(s),
    bancos,
    duplicidade: indexarDuplicidade(s),
    trocas: analisarTrocasBancarias(s),
    comunicacoes,
    comunicacoesPorFornecedor,
    historico,
    creditoPorNF,
  };
}

function analisarTitulo(a: Linha, s: Store, ctx: ContextoAnalise): EstadoTitulo & { _motivosDupla: string[]; _excedente: boolean } {
  const t = s.titulo.get(a.titulo_id);
  const f = s.fornecedor.get(a.fornecedor_id);
  const valor = num(a.valor);
  const achados: Achado[] = [];
  const motivosDupla: string[] = [];
  let excedente = false;

  const base = {
    titulo_id: a.titulo_id,
    lote: a.lote_remessa,
    banco: a.banco_pagador,
    fechamento: `${a.data_prevista}T${a.horario_fechamento}`,
    fornecedor_id: a.fornecedor_id,
    fornecedor_nome: f?.nome_fantasia ?? "?",
    categoria: f?.categoria ?? "?",
    valor,
    vencimento: a.vencimento,
    forma_pagamento: a.forma_pagamento,
    destino: a.destino_pagamento,
    numero_nf: t?.numero_nf_digitado ?? "",
    oc_id: t?.oc_id ?? "",
    origem_lancamento: t?.origem_lancamento ?? "",
    lancado_por: t?.lancado_por ?? "",
  };

  if (!t || !f) {
    achados.push({ tipo: "INTEGRIDADE", severidade: "ALTA", detalhe: !t ? "título não existe no ERP" : "fornecedor não existe no cadastro", evidencias: [a.titulo_id], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
    return fechar(base, achados, motivosDupla, [], ctx, excedente);
  }

  // ---------- integridade ----------
  if (t.status !== "agendado")
    achados.push({ tipo: "JA_PAGO_ERP", severidade: "ALTA", detalhe: `status no ERP = ${t.status} ${t.data_pagamento}`.trim(), evidencias: [t.titulo_id], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
  if (Math.abs(num(t.valor) - valor) > 0.009)
    achados.push({ tipo: "INTEGRIDADE", severidade: "ALTA", detalhe: `valor na agenda ${brl(valor)} ≠ título ${brl(num(t.valor))}`, evidencias: [t.titulo_id], acaoMinima: "corrigir_lancamento" });
  if (t.fornecedor_id !== a.fornecedor_id)
    achados.push({ tipo: "INTEGRIDADE", severidade: "ALTA", detalhe: `fornecedor na agenda ≠ título (${t.fornecedor_id})`, evidencias: [t.titulo_id], acaoMinima: "corrigir_lancamento" });
  if (f.status_cadastro !== "ativo")
    achados.push({ tipo: "CADASTRO_INATIVO", severidade: "MEDIA", detalhe: `fornecedor com status_cadastro = ${f.status_cadastro}`, evidencias: [f.fornecedor_id], acaoMinima: "escalar_aprovacao" });
  const u = s.usuarios.get(t.lancado_por);
  if (u?.data_desligamento && dataHora(t.data_lancamento)! > dataHora(u.data_desligamento)!)
    achados.push({ tipo: "USUARIO_DESLIGADO", severidade: "ALTA", detalhe: `lançado por ${t.lancado_por} depois do desligamento (${u.data_desligamento})`, evidencias: [t.titulo_id], acaoMinima: "escalar_aprovacao" });

  // ---------- já pago ----------
  const mer = ctx.extratos.meridianoPorDocumento.get(t.titulo_id);
  if (mer) achados.push({ tipo: "JA_PAGO_EXTRATO", severidade: "ALTA", detalhe: `Banco Meridiano já debitou este título em ${mer.data}`, evidencias: [`MER ${mer.data} ${mer.descricao}`], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
  for (const r of s.retornoPorTitulo.get(t.titulo_id) ?? [])
    if (r.codigo_ocorrencia === "00")
      achados.push({ tipo: "JA_PAGO_RETORNO", severidade: "ALTA", detalhe: `pago no lote ${r.lote_remessa} em ${r.data_pagamento}`, evidencias: [`retorno ${r.arquivo_retorno} seq ${r.sequencial}`], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
  const av = avulsoDoTitulo(t, f, ctx.extratos, s);
  if (av)
    achados.push({ tipo: "JA_PAGO_AVULSO", severidade: "ALTA", detalhe: `pago fora do lote e sem baixa: ${av.ref} (${brl(av.valor)})`, evidencias: [av.ref], acaoMinima: "retirar_do_lote", valorEmRisco: valor });

  // ---------- duplicidade ----------
  if (t.numero_nf_digitado) {
    const grupo = ctx.duplicidade.get(chaveDup(t)) ?? [];
    if (grupo.length > 1) {
      const mantido = tituloMantido(grupo)!;
      const outros = grupo.filter((o) => o.titulo_id !== t.titulo_id).map((o) => `${o.titulo_id} (${o.status}, NF '${o.numero_nf_digitado}', ${o.origem_lancamento})`);
      if (mantido.titulo_id !== t.titulo_id) {
        excedente = true;
        achados.push({
          tipo: "DUPLICIDADE",
          severidade: "ALTA",
          detalhe: `mesma NF/parcela de ${outros.join(", ")}; manter ${mantido.titulo_id} e cancelar este`,
          evidencias: grupo.map((o) => o.titulo_id),
          acaoMinima: "retirar_do_lote",
          valorEmRisco: valor,
        });
      } else {
        achados.push({ tipo: "DUPLICIDADE_PAR_MANTIDO", severidade: "BAIXA", detalhe: `título mantido; duplicata(s) a cancelar: ${outros.join(", ")}`, evidencias: grupo.map((o) => o.titulo_id) });
      }
    }
    const creditos = ctx.creditoPorNF.get(`${t.fornecedor_id}|${normNF(t.numero_nf_digitado)}`);
    if (creditos?.length) {
      const total = creditos.reduce((x, c) => x + c.pagoAMais, 0);
      achados.push({
        tipo: "CREDITO_FORNECEDOR",
        severidade: "MEDIA",
        detalhe: `outra(s) parcela(s) desta NF já foram pagas em dobro (${brl(total)} de crédito com o fornecedor)`,
        evidencias: creditos.flatMap((c) => c.titulos),
      });
    }
  }

  // ---------- 3 vias ----------
  const rNF = conferirNF(t, f, a.data_prevista, s);
  // no lançamento duplicado que será cancelado, divergência de valor é ruído (ex.: +R$ 3,50 de tarifa do boleto)
  achados.push(...(excedente ? rNF.achados.filter((x) => x.tipo !== "NF_X_TITULO" && x.tipo !== "NF_X_TITULO_ENCARGOS") : rNF.achados));
  motivosDupla.push(...rNF.motivosDupla);
  const rOC = conferirOC(t, f, rNF.nf, s);
  achados.push(...rOC.achados);
  motivosDupla.push(...rOC.motivosDupla);

  // ---------- boleto ----------
  if (a.forma_pagamento === "boleto") achados.push(...conferirBoleto(t, f, ctx.bancos, s, rNF.achados.some((x) => x.tipo === "NF_X_TITULO")));

  // ---------- troca bancária (ted/pix vão para o cadastro atual) ----------
  for (const tr of ctx.trocas.get(f.fornecedor_id) ?? []) {
    if (tr.valida || !tr.recente) continue;
    motivosDupla.push("troca bancária < 30 dias sem confirmação válida");
    if (a.forma_pagamento === "boleto") continue; // boleto não usa a conta do cadastro
    achados.push({
      tipo: "TROCA_BANCARIA_SUSPEITA",
      severidade: "ALTA",
      detalhe: `troca em ${tr.quando} (${Object.entries(tr.campos).map(([c, v]) => `${c} ${v.de}→${v.para}`).join(", ")}) via ${tr.origem} por ${tr.alterado_por}: ${tr.veredito}${tr.telefoneTrocadoMenos30d ? " + telefone trocado < 30d" : ""}. Destino atual: ${a.destino_pagamento}`,
      evidencias: tr.alteracao_ids,
      acaoMinima: "escalar_aprovacao",
      valorEmRisco: valor,
      motivoDupla: "troca bancária < 30 dias sem confirmação válida",
      sugestao: { campo: "reverter_alteracao_cadastro", valor_novo: tr.alteracao_ids.join(","), fonte: "valores anteriores do cadastro", exigeAprovador: true },
    });
  }

  // ---------- comunicações ----------
  const nfTitulo = normNF(t.numero_nf_digitado);
  const comms = (ctx.comunicacoesPorFornecedor.get(f.fornecedor_id) ?? []).filter(
    (c) => (c.nfs.length ? c.nfs.includes(nfTitulo) : c.suspeita || c.sinais.includes("pedido_troca_bancaria")),
  );
  for (const c of comms) {
    if (!c.suspeita) continue;
    const grave = c.via === "dominio_parecido" || c.via === "nao_oficial" || c.sinais.includes("boleto_divergente");
    achados.push({ tipo: "COMUNICACAO_SUSPEITA", severidade: grave ? "ALTA" : "MEDIA", detalhe: `${c.id} ${c.data_hora} ${c.canal} de ${c.remetente}: ${c.motivo}`, evidencias: [c.id] });
  }

  // ---------- antecipação ----------
  if (a.data_prevista < t.vencimento) {
    achados.push({ tipo: "ANTECIPACAO", severidade: "MEDIA", detalhe: `pagamento previsto ${a.data_prevista}, vencimento ${t.vencimento}`, evidencias: [t.titulo_id], acaoMinima: "escalar_aprovacao", motivoDupla: "antecipação" });
    motivosDupla.push("antecipação");
  }

  return fechar(base, achados, motivosDupla, comms.map((c) => c.id), ctx, excedente);
}

function fechar(
  base: Omit<EstadoTitulo, "achados" | "acaoMinima" | "valorEmRisco" | "status" | "alcada" | "comunicacoes">,
  achados: Achado[],
  motivosDupla: string[],
  comunicacoes: string[],
  ctx: ContextoAnalise,
  excedente: boolean,
) {
  const alcada = calcularAlcada(base.valor, motivosDupla, ctx.politicas.analistaAte, ctx.politicas.aprovadorAte);
  const est = { ...base, achados, comunicacoes, alcada, acaoMinima: "manter_no_lote" as Acao, valorEmRisco: 0, status: "limpo" as EstadoTitulo["status"], _motivosDupla: motivosDupla, _excedente: excedente };
  recalcular(est);
  return est;
}

function recalcular(e: EstadoTitulo) {
  let acao: Acao = "manter_no_lote";
  for (const x of e.achados) if (x.acaoMinima && FORCA_ACAO[x.acaoMinima] > FORCA_ACAO[acao]) acao = x.acaoMinima;
  e.acaoMinima = acao;
  e.valorEmRisco = Math.max(0, ...e.achados.map((x) => x.valorEmRisco ?? 0));
  const relevante = e.achados.some((x) => x.severidade !== "BAIXA");
  e.status = FORCA_ACAO[acao] >= 2 ? "bloqueio" : FORCA_ACAO[acao] === 1 || relevante ? "atencao" : "limpo";
}

/** Fracionamento: mesmo fornecedor + mesma NF + mesmo dia, parcelas distintas, cuja soma cruza uma alçada. */
function aplicarFracionamento(estados: ReturnType<typeof analisarTitulo>[], s: Store, ctx: ContextoAnalise) {
  const grupos = new Map<string, ReturnType<typeof analisarTitulo>[]>();
  for (const e of estados) {
    if (e._excedente || !e.numero_nf) continue;
    const dia = e.fechamento.slice(0, 10);
    const k = `${e.fornecedor_id}|${normNF(e.numero_nf)}|${dia}`;
    grupos.set(k, [...(grupos.get(k) ?? []), e]);
  }
  const { analistaAte, aprovadorAte } = ctx.politicas;
  for (const [k, g] of grupos) {
    if (g.length < 2) continue;
    const soma = Math.round(g.reduce((x, e) => x + e.valor, 0) * 100) / 100;
    const maior = Math.max(...g.map((e) => e.valor));
    const cruza = (maior <= analistaAte && soma > analistaAte) || (maior <= aprovadorAte && soma > aprovadorAte);
    if (!cruza) continue;
    for (const e of g) {
      e.achados.push({ tipo: "FRACIONAMENTO", severidade: "MEDIA", detalhe: `soma ${brl(soma)} em ${g.length} títulos do mesmo fornecedor/NF/dia (${k}); alçada pela soma`, evidencias: g.map((x) => x.titulo_id) });
      e.alcada = calcularAlcada(soma, e._motivosDupla, analistaAte, aprovadorAte);
      recalcular(e);
    }
  }
}

export interface ResultadoAnalise {
  geradoEm: string;
  estados: EstadoTitulo[];
  comunicacoes: ComunicacaoAnalisada[];
  trocas: TrocaBancaria[];
  duplicidadesHistoricas: { itens: DuplicidadeHistorica[]; total: number };
}

export function analisarAgenda(s: Store = carregarStore()): ResultadoAnalise {
  const ctx = prepararContexto(s);
  const brutos = s.agenda.map((a) => analisarTitulo(a, s, ctx));
  aplicarFracionamento(brutos, s, ctx);
  // garante que a aprovação dupla eleva a ação mínima
  for (const e of brutos) {
    if (e.alcada.dupla && FORCA_ACAO[e.acaoMinima] < FORCA_ACAO.escalar_aprovacao && e.acaoMinima !== "retirar_do_lote") {
      e.acaoMinima = "escalar_aprovacao";
      e.status = "bloqueio";
    }
  }
  const estados: EstadoTitulo[] = brutos.map(({ _motivosDupla, _excedente, ...e }) => e);
  return {
    geradoEm: new Date().toISOString(),
    estados,
    comunicacoes: ctx.comunicacoes,
    trocas: [...ctx.trocas.values()].flat(),
    duplicidadesHistoricas: ctx.historico,
  };
}

// ---------- resumo para relatório / painel ----------
export function resumir(r: ResultadoAnalise) {
  const soma = (xs: EstadoTitulo[], f: (e: EstadoTitulo) => number = (e) => e.valor) => Math.round(xs.reduce((a, e) => a + f(e), 0) * 100) / 100;
  const porTipo: Record<string, { titulos: number; valor: number; emRisco: number }> = {};
  for (const e of r.estados) {
    const tipos = new Set(e.achados.map((x) => x.tipo));
    for (const tp of tipos) {
      const emRisco = Math.max(0, ...e.achados.filter((x) => x.tipo === tp).map((x) => x.valorEmRisco ?? 0));
      const o = (porTipo[tp] ??= { titulos: 0, valor: 0, emRisco: 0 });
      o.titulos++;
      o.valor = Math.round((o.valor + e.valor) * 100) / 100;
      o.emRisco = Math.round((o.emRisco + emRisco) * 100) / 100;
    }
  }
  const por = <K extends string>(f: (e: EstadoTitulo) => K) => {
    const m: Record<string, { titulos: number; valor: number }> = {};
    for (const e of r.estados) {
      const o = (m[f(e)] ??= { titulos: 0, valor: 0 });
      o.titulos++;
      o.valor = Math.round((o.valor + e.valor) * 100) / 100;
    }
    return m;
  };
  return {
    agenda: { titulos: r.estados.length, valor: soma(r.estados) },
    porLote: por((e) => e.lote),
    porStatus: por((e) => e.status),
    porAcao: por((e) => e.acaoMinima),
    porAlcada: por((e) => e.alcada.nivel),
    duplas: r.estados.filter((e) => e.alcada.dupla).length,
    valorEmRisco: soma(r.estados, (e) => e.valorEmRisco),
    porTipo,
    comunicacoesSuspeitas: r.comunicacoes.filter((c) => c.suspeita).length,
    trocasInvalidasRecentes: r.trocas.filter((t) => t.recente && !t.valida).length,
    duplicidadesHistoricas: { parcelas: r.duplicidadesHistoricas.itens.length, pagoAMais: r.duplicidadesHistoricas.total },
  };
}
