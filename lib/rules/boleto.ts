// Boleto: banco e beneficiário habituais, valor da linha digitável e situação no DDA.
import type { Store, Linha } from "@/lib/data/store";
import { brl, lerLinhaDigitavel, normNF, num, raizCnpj } from "@/lib/data/normalize";
import type { Achado } from "./tipos";
import { TOL_TITULO_DUP } from "./politicas";

/** Bancos de cobrança que cada fornecedor já usou (boletos pagos + DDA liquidado). */
export function bancosHistoricos(s: Store): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  const add = (fid: string, b: string) => (m.get(fid) ?? m.set(fid, new Set()).get(fid)!).add(b);
  for (const t of s.titulos) if (t.status === "pago" && t.linha_digitavel) add(t.fornecedor_id, t.linha_digitavel.slice(0, 3));
  for (const b of s.dda) {
    if (b.situacao !== "liquidado") continue;
    for (const f of s.fornecedoresPorRaiz.get(raizCnpj(b.cnpj_beneficiario)) ?? []) add(f.fornecedor_id, b.banco_cobrador);
  }
  return m;
}

/** Boleto legítimo em aberto no DDA para a mesma NF/parcela do fornecedor (para substituir uma 2ª via falsa). */
export function boletoLegitimoNoDDA(t: Linha, f: Linha, s: Store): Linha | undefined {
  const nf = normNF(t.numero_nf_digitado);
  const parcela = t.parcela.split("/")[0];
  return s.dda.find(
    (b) =>
      b.situacao === "em aberto" &&
      raizCnpj(b.cnpj_beneficiario) === raizCnpj(f.cnpj) &&
      normNF(b.numero_documento) === nf &&
      (b.numero_documento.split("/")[1] ?? "1") === parcela &&
      b.linha_digitavel !== t.linha_digitavel,
  );
}

export function conferirBoleto(t: Linha, f: Linha, historico: Map<string, Set<string>>, s: Store, temDivergenciaNF: boolean): Achado[] {
  const achados: Achado[] = [];
  const valor = num(t.valor);
  const ld = t.linha_digitavel;
  if (!ld) return [{ tipo: "BOLETO_SEM_LINHA", severidade: "ALTA", detalhe: "forma boleto sem linha digitável", evidencias: [t.titulo_id], acaoMinima: "corrigir_lancamento" }];

  const linha = lerLinhaDigitavel(ld);
  if (Math.abs(linha.valor - valor) > TOL_TITULO_DUP)
    achados.push({
      tipo: "BOLETO_X_TITULO",
      severidade: temDivergenciaNF ? "MEDIA" : "ALTA",
      detalhe: `valor na linha digitável ${brl(linha.valor)} vs título ${brl(valor)}`,
      evidencias: [t.titulo_id],
      ...(temDivergenciaNF ? {} : { acaoMinima: "corrigir_lancamento" as const }),
    });

  const benefDiverge = !!t.cnpj_beneficiario_boleto && raizCnpj(t.cnpj_beneficiario_boleto) !== raizCnpj(f.cnpj);
  const hist = historico.get(f.fornecedor_id);
  const bancoNovo = !!hist && hist.size > 0 && !hist.has(linha.banco);

  if (benefDiverge || bancoNovo) {
    const legit = boletoLegitimoNoDDA(t, f, s);
    const sugestao = legit ? { campo: "linha_digitavel", valor_novo: legit.linha_digitavel, fonte: `DDA ${legit.dda_id} (${legit.nome_banco_cobrador}, ${legit.beneficiario})`, exigeAprovador: true } : undefined;
    const acao = legit ? ("corrigir_lancamento" as const) : ("retirar_do_lote" as const);
    if (benefDiverge)
      achados.push({ tipo: "BOLETO_BENEFICIARIO", severidade: "ALTA", detalhe: `CNPJ do beneficiário ${t.cnpj_beneficiario_boleto} ≠ fornecedor ${f.cnpj}`, evidencias: [t.titulo_id], acaoMinima: acao, valorEmRisco: valor, ...(sugestao ? { sugestao } : {}) });
    if (bancoNovo)
      achados.push({ tipo: "BOLETO_BANCO_NOVO", severidade: "ALTA", detalhe: `banco ${linha.banco} nunca usado por este fornecedor (histórico: ${[...hist!].join(", ")})`, evidencias: [t.titulo_id], acaoMinima: acao, valorEmRisco: valor, ...(sugestao ? { sugestao } : {}) });
  }

  const d = s.ddaPorLinha.get(ld);
  if (!d)
    achados.push({ tipo: "BOLETO_FORA_DDA", severidade: "MEDIA", detalhe: `linha digitável não registrada no DDA contra o Gogroup (origem ${t.origem_lancamento})`, evidencias: [t.titulo_id] });
  else if (d.situacao !== "em aberto")
    achados.push({ tipo: "BOLETO_DDA_BAIXADO", severidade: "ALTA", detalhe: `boleto ${d.situacao} na CIP em ${d.data_situacao}`, evidencias: [d.dda_id], acaoMinima: "retirar_do_lote", valorEmRisco: valor });
  return achados;
}
