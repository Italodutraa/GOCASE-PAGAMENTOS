// Duplicidade: mesmo fornecedor + mesma NF (normalizada) + mesma parcela.
import type { Store, Linha } from "@/lib/data/store";
import { agruparPor, normNF, num } from "@/lib/data/normalize";

export const chaveDup = (t: Linha) => `${t.fornecedor_id}|${normNF(t.numero_nf_digitado)}|${t.parcela}`;

export function indexarDuplicidade(s: Store) {
  return agruparPor(
    s.titulos.filter((t) => t.status !== "cancelado" && t.numero_nf_digitado),
    chaveDup,
  );
}

/**
 * Dentro de um grupo duplicado, qual título é o legítimo a manter:
 * 1) se algum já foi pago, todos os abertos são excedentes;
 * 2) senão, prefere o lançado a partir do XML (xml_portal), depois o de menor ID.
 */
export function tituloMantido(grupo: Linha[]): Linha | undefined {
  if (grupo.some((t) => t.status === "pago")) return grupo.find((t) => t.status === "pago");
  return [...grupo].sort((a, b) => {
    const pa = a.origem_lancamento === "xml_portal" ? 0 : 1;
    const pb = b.origem_lancamento === "xml_portal" ? 0 : 1;
    return pa - pb || a.titulo_id.localeCompare(b.titulo_id);
  })[0];
}

export interface DuplicidadeHistorica {
  chave: string;
  titulos: string[];
  valores: number[];
  pagoEm: string[];
  pagoAMais: number;
}

/** Parcelas que já saíram 2x (recuperação com o controller). */
export function duplicidadesHistoricas(s: Store): { itens: DuplicidadeHistorica[]; total: number } {
  const grupos = agruparPor(
    s.titulos.filter((t) => t.status === "pago" && t.numero_nf_digitado),
    chaveDup,
  );
  const itens: DuplicidadeHistorica[] = [];
  for (const [chave, g] of grupos) {
    if (g.length < 2) continue;
    const valores = g.map((t) => num(t.valor));
    const ordenados = [...valores].sort((a, b) => a - b);
    const pagoAMais = ordenados.slice(0, -1).reduce((a, b) => a + b, 0);
    itens.push({ chave, titulos: g.map((t) => t.titulo_id), valores, pagoEm: g.map((t) => t.data_pagamento), pagoAMais });
  }
  const total = Math.round(itens.reduce((a, i) => a + i.pagoAMais, 0) * 100) / 100;
  return { itens, total };
}
