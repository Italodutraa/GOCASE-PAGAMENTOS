// Extratos Meridiano/Litoral: pagamentos por lote x avulsos (fora de lote).
import type { Store, Linha } from "@/lib/data/store";
import { chaveNome, dataBRparaISO, num, numBR } from "@/lib/data/normalize";

export interface PagamentoAvulso {
  banco: "MER" | "LIT";
  data: string; // ISO
  valor: number; // positivo
  descricao: string;
  ref: string; // evidência: "MER 2026-10-28 PAGTO AVULSO ..." / "LIT docto 123"
}

export interface IndiceExtratos {
  meridianoPorDocumento: Map<string, Linha>; // titulo_id → débito do lote
  avulsos: PagamentoAvulso[];
  avulsosPorValor: Map<string, PagamentoAvulso[]>; // valor.toFixed(2)
}

export function indexarExtratos(s: Store): IndiceExtratos {
  const meridianoPorDocumento = new Map<string, Linha>();
  const avulsos: PagamentoAvulso[] = [];

  for (const m of s.extratoMeridiano) {
    const v = num(m.valor);
    if (!(v < 0) || m.tipo === "TARIFA") continue;
    if (m.documento) meridianoPorDocumento.set(m.documento, m);
    else avulsos.push({ banco: "MER", data: m.data, valor: -v, descricao: `${m.tipo} ${m.descricao}`, ref: `MER ${m.data} ${m.tipo} ${m.descricao}` });
  }

  // Litoral não traz título: débito sem par (data+valor) no retorno CNAB dos lotes -LIT é avulso
  const pares = new Map<string, number>();
  for (const r of s.retorno) {
    if (!r.lote_remessa.endsWith("-LIT") || r.codigo_ocorrencia !== "00") continue;
    const k = `${r.data_pagamento}|${num(r.valor_pago).toFixed(2)}`;
    pares.set(k, (pares.get(k) ?? 0) + 1);
  }
  for (const l of s.extratoLitoral) {
    const v = numBR(l["Valor (R$)"]);
    const hist = l["Histórico"];
    if (!(v < 0) || hist.startsWith("TAR")) continue;
    const data = dataBRparaISO(l.Data);
    const k = `${data}|${(-v).toFixed(2)}`;
    const n = pares.get(k) ?? 0;
    if (n > 0) pares.set(k, n - 1);
    else avulsos.push({ banco: "LIT", data, valor: -v, descricao: hist, ref: `LIT ${data} docto ${l.Docto} ${hist}` });
  }

  const avulsosPorValor = new Map<string, PagamentoAvulso[]>();
  for (const a of avulsos) {
    const k = a.valor.toFixed(2);
    avulsosPorValor.set(k, [...(avulsosPorValor.get(k) ?? []), a]);
  }
  return { meridianoPorDocumento, avulsos, avulsosPorValor };
}

/**
 * Avulso que pagou ESTE título (e não foi baixado): mesmo valor, nome do favorecido casa com o fornecedor,
 * não é anterior ao lançamento (−15 dias) e não está baixado em outro título do fornecedor na mesma data
 * (caso clássico de falso positivo: parcela anterior de mesmo valor).
 */
export function avulsoDoTitulo(t: Linha, f: Linha, idx: IndiceExtratos, s: Store): PagamentoAvulso | undefined {
  const valor = num(t.valor);
  const nome = chaveNome(f.razao_social);
  const limite = t.data_lancamento.slice(0, 10);
  for (const av of idx.avulsosPorValor.get(valor.toFixed(2)) ?? []) {
    if (!av.descricao.toUpperCase().includes(nome)) continue;
    if (new Date(av.data).getTime() < new Date(limite).getTime() - 15 * 86_400_000) continue;
    const baixadoEmOutro = s.titulos.some(
      (o) => o.fornecedor_id === t.fornecedor_id && o.status === "pago" && o.data_pagamento === av.data && Math.abs(num(o.valor) - valor) < 0.01,
    );
    if (!baixadoEmOutro) return av;
  }
  return undefined;
}
