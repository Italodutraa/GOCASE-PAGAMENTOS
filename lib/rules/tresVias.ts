// Conferência de 3 vias: OC x NF (duplicata) x título.
import type { Store, Linha } from "@/lib/data/store";
import { brl, diasEntre, normNF, num, raizCnpj } from "@/lib/data/normalize";
import type { Achado } from "./tipos";
import { JUROS_MES, MULTA, TOL_OC_MIN, TOL_OC_PCT, TOL_TITULO_DUP } from "./politicas";

/** Limite de valor do título frente à duplicata: R$0,10 + multa 2% + juros 1% a.m. pro rata após o vencimento. */
export function limitesTituloDuplicata(valorDup: number, diasAtraso: number) {
  const atraso = Math.max(0, diasAtraso);
  const encargos = atraso > 0 ? valorDup * (MULTA + (JUROS_MES * atraso) / 30) : 0;
  return { min: valorDup - TOL_TITULO_DUP, max: valorDup + encargos + TOL_TITULO_DUP };
}

/** Tolerância OC x NF: o maior entre 2% e R$ 50. */
export const toleranciaOC = (base: number) => Math.max(TOL_OC_PCT * base, TOL_OC_MIN);

export interface ResultadoNF {
  nf?: Linha;
  achados: Achado[];
  motivosDupla: string[];
}

export function conferirNF(t: Linha, f: Linha, dataPrevista: string, s: Store): ResultadoNF {
  const achados: Achado[] = [];
  const motivosDupla: string[] = [];
  const valor = num(t.valor);

  if (!t.numero_nf_digitado) {
    if (f.categoria !== "aluguel") {
      achados.push({ tipo: "SEM_NF", severidade: "MEDIA", detalhe: "título sem NF: exige aprovação dupla", evidencias: [t.titulo_id], acaoMinima: "escalar_aprovacao", motivoDupla: "sem NF" });
      motivosDupla.push("sem NF");
    }
    return { achados, motivosDupla };
  }

  const nfNum = normNF(t.numero_nf_digitado);
  const nf = s.nfPorRaizNumero.get(`${raizCnpj(f.cnpj)}|${nfNum}`)?.[0];
  if (!nf) {
    const outras = s.nfPorNumero.get(nfNum) ?? [];
    if (outras.length) {
      const o = outras[0];
      const certo = s.fornecedoresPorRaiz.get(raizCnpj(o.cnpj_emitente))?.[0];
      achados.push({
        tipo: "CNPJ_DIVERGENTE",
        severidade: "ALTA",
        detalhe: `NF ${t.numero_nf_digitado} foi emitida por ${o.razao_social_emitente} (${o.cnpj_emitente}), não por ${f.razao_social} (${f.cnpj})${certo ? `; fornecedor correto é ${certo.fornecedor_id} ${certo.nome_fantasia}` : ""}`,
        evidencias: [t.titulo_id, `NF ${o.chave_acesso}`],
        acaoMinima: "corrigir_lancamento",
        valorEmRisco: valor,
        ...(certo ? { sugestao: { campo: "fornecedor_id", valor_novo: certo.fornecedor_id, fonte: `NF ${o.chave_acesso}`, exigeAprovador: true } } : {}),
      });
    } else {
      achados.push({ tipo: "NF_INEXISTENTE", severidade: "ALTA", detalhe: `NF '${t.numero_nf_digitado}' não está no portal NF-e`, evidencias: [t.titulo_id], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
    }
    return { achados, motivosDupla };
  }

  if (nf.situacao_sefaz !== "autorizada")
    achados.push({ tipo: "NF_NAO_AUTORIZADA", severidade: "ALTA", detalhe: `NF ${nf.numero_nf} com situação SEFAZ "${nf.situacao_sefaz}"`, evidencias: [`NF ${nf.chave_acesso}`], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
  if (raizCnpj(nf.cnpj_emitente) !== raizCnpj(f.cnpj))
    achados.push({ tipo: "CNPJ_DIVERGENTE", severidade: "ALTA", detalhe: `raiz CNPJ da NF ${nf.cnpj_emitente} ≠ fornecedor ${f.cnpj}`, evidencias: [`NF ${nf.chave_acesso}`], acaoMinima: "corrigir_lancamento", valorEmRisco: valor });

  for (const rc of s.recebimentosPorChave.get(nf.chave_acesso) ?? []) {
    if (rc.situacao === "conferido") continue;
    const ressalva = rc.situacao.startsWith("conferido com ressalva");
    achados.push({
      tipo: "RECEBIMENTO",
      severidade: ressalva ? "BAIXA" : "ALTA",
      detalhe: `WMS: ${rc.situacao}${rc.observacao ? ` (${rc.observacao})` : ""}`,
      evidencias: [rc.recebimento_id],
      ...(ressalva ? {} : { acaoMinima: "escalar_aprovacao" as const }),
    });
  }

  const n = Number(t.parcela.split("/")[0]);
  const dup = (s.duplicatasPorChave.get(nf.chave_acesso) ?? []).find((d) => Number(d.n_dup) === n);
  if (!dup) {
    achados.push({ tipo: "PARCELA_INEXISTENTE", severidade: "ALTA", detalhe: `NF ${nf.numero_nf} não tem a duplicata ${t.parcela}`, evidencias: [`NF ${nf.chave_acesso}`], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
  } else {
    const dv = num(dup.valor);
    const { min, max } = limitesTituloDuplicata(dv, diasEntre(dup.vencimento, dataPrevista));
    const ev = [t.titulo_id, `NF ${nf.chave_acesso} dup ${dup.n_dup}`];
    if (valor > max || valor < min) {
      const aMais = valor > dv;
      achados.push({
        tipo: "NF_X_TITULO",
        severidade: "ALTA",
        detalhe: `título ${brl(valor)} vs duplicata ${brl(dv)} (${aMais ? "pagaria a mais" : "pagaria a menos"} ${brl(Math.abs(valor - dv))})`,
        evidencias: ev,
        acaoMinima: "corrigir_lancamento",
        valorEmRisco: aMais ? Math.round((valor - dv) * 100) / 100 : 0,
        sugestao: { campo: "valor", valor_novo: dv.toFixed(2), fonte: `duplicata ${dup.n_dup} da NF ${nf.numero_nf}` },
      });
    } else if (Math.abs(valor - dv) > TOL_TITULO_DUP) {
      achados.push({ tipo: "NF_X_TITULO_ENCARGOS", severidade: "BAIXA", detalhe: `diferença ${brl(valor - dv)} compatível com multa/juros`, evidencias: ev });
    }
  }
  return { nf, achados, motivosDupla };
}

export function conferirOC(t: Linha, f: Linha, nf: Linha | undefined, s: Store): { achados: Achado[]; motivosDupla: string[] } {
  const achados: Achado[] = [];
  const motivosDupla: string[] = [];
  const valor = num(t.valor);

  if (!t.oc_id) {
    if (f.categoria !== "utilidades" && f.categoria !== "aluguel") {
      achados.push({ tipo: "SEM_OC", severidade: "MEDIA", detalhe: "título sem OC: exige aprovação dupla", evidencias: [t.titulo_id], acaoMinima: "escalar_aprovacao", motivoDupla: "sem OC aprovada" });
      motivosDupla.push("sem OC aprovada");
    }
    return { achados, motivosDupla };
  }
  const oc = s.pedidos.get(t.oc_id);
  if (!oc) {
    achados.push({ tipo: "OC_INEXISTENTE", severidade: "ALTA", detalhe: `${t.oc_id} não existe em Compras`, evidencias: [t.titulo_id], acaoMinima: "retirar_do_lote", valorEmRisco: valor, motivoDupla: "sem OC aprovada" });
    motivosDupla.push("sem OC aprovada");
    return { achados, motivosDupla };
  }
  if (oc.status !== "aprovada" && oc.status !== "encerrada") {
    achados.push({ tipo: "OC_NAO_APROVADA", severidade: "ALTA", detalhe: `${oc.oc_id} com status "${oc.status}"`, evidencias: [oc.oc_id], acaoMinima: "retirar_do_lote", valorEmRisco: valor, motivoDupla: `OC ${oc.status}` });
    motivosDupla.push(`OC ${oc.status}`);
  }
  if (oc.status === "encerrada")
    achados.push({ tipo: "OC_ENCERRADA", severidade: "ALTA", detalhe: `${oc.oc_id} já tem todas as parcelas pagas`, evidencias: [oc.oc_id], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
  if (raizCnpj(oc.cnpj_fornecedor) !== raizCnpj(f.cnpj))
    achados.push({ tipo: "OC_OUTRO_FORNECEDOR", severidade: "ALTA", detalhe: `${oc.oc_id} é de ${oc.nome_fornecedor} (${oc.cnpj_fornecedor}), não de ${f.cnpj}`, evidencias: [oc.oc_id], acaoMinima: "corrigir_lancamento", valorEmRisco: valor });

  if (nf) {
    const base = oc.tipo === "contrato" ? num(oc.valor_mensal) : num(oc.valor_total);
    const nfv = num(nf.valor_total);
    const tol = toleranciaOC(base);
    if (nfv - base > tol)
      achados.push({
        tipo: "OC_X_NF",
        severidade: "ALTA",
        detalhe: `NF ${brl(nfv)} passa da OC ${brl(base)} em ${brl(nfv - base)} (tolerância ${brl(tol)}): acionar comprador`,
        evidencias: [oc.oc_id, `NF ${nf.chave_acesso}`],
        acaoMinima: "escalar_aprovacao",
        valorEmRisco: Math.round((nfv - base) * 100) / 100,
      });
    if (nf.oc_informada && nf.oc_informada !== t.oc_id)
      achados.push({ tipo: "OC_DIVERGENTE_NA_NF", severidade: "MEDIA", detalhe: `NF cita ${nf.oc_informada}, título usa ${t.oc_id}`, evidencias: [`NF ${nf.chave_acesso}`] });
  }
  return { achados, motivosDupla };
}
