// Reanálise incremental: aplica linhas novas ao Store (índices coerentes) e roda o motor existente.
import type { Linha, Store } from "@/lib/data/store";
import { normNF, raizCnpj } from "@/lib/data/normalize";
import { analisarAgenda, type ResultadoAnalise } from "./engine";
import type { EstadoTitulo } from "./tipos";

export interface Mutacao {
  fornecedores?: Linha[];
  alteracoes?: Linha[];
  comunicacoes?: Linha[];
  notas?: Linha[];
  duplicatas?: Linha[];
  titulos?: Linha[];
  agenda?: Linha[];
  pedidos?: Linha[];
}

function empilhar(m: Map<string, Linha[]>, k: string, l: Linha) {
  const a = m.get(k);
  if (a) a.push(l);
  else m.set(k, [l]);
}

/** Insere as linhas novas (ignora IDs que já existem, então é idempotente). */
export function aplicarMutacao(s: Store, m: Mutacao): void {
  for (const f of m.fornecedores ?? []) {
    if (s.fornecedor.has(f.fornecedor_id)) continue;
    s.fornecedores.push(f);
    s.fornecedor.set(f.fornecedor_id, f);
    empilhar(s.fornecedoresPorRaiz, raizCnpj(f.cnpj), f);
  }
  for (const a of m.alteracoes ?? []) {
    if (s.alteracoes.some((x) => x.alteracao_id === a.alteracao_id)) continue;
    s.alteracoes.push(a);
    empilhar(s.alteracoesPorFornecedor, a.fornecedor_id, a);
  }
  for (const c of m.comunicacoes ?? []) {
    if (s.comunicacoes.some((x) => x.comunicacao_id === c.comunicacao_id)) continue;
    s.comunicacoes.push(c);
  }
  for (const n of m.notas ?? []) {
    if (s.notas.some((x) => x.chave_acesso === n.chave_acesso)) continue;
    s.notas.push(n);
    empilhar(s.nfPorRaizNumero, `${raizCnpj(n.cnpj_emitente)}|${normNF(n.numero_nf)}`, n);
    empilhar(s.nfPorNumero, normNF(n.numero_nf), n);
  }
  for (const d of m.duplicatas ?? []) {
    const atual = s.duplicatasPorChave.get(d.chave_acesso) ?? [];
    if (atual.some((x) => x.n_dup === d.n_dup)) continue;
    empilhar(s.duplicatasPorChave, d.chave_acesso, d);
  }
  for (const o of m.pedidos ?? []) if (!s.pedidos.has(o.oc_id)) s.pedidos.set(o.oc_id, o);
  for (const t of m.titulos ?? []) {
    if (s.titulo.has(t.titulo_id)) continue;
    s.titulos.push(t);
    s.titulo.set(t.titulo_id, t);
  }
  for (const a of m.agenda ?? []) {
    if (s.agenda.some((x) => x.titulo_id === a.titulo_id)) continue;
    s.agenda.push(a);
  }
}

/** Roda o motor sobre o store mutado e devolve a análise completa + só os estados afetados. */
export function reanalisarCompleto(s: Store, fornecedorIds: string[], tituloIds: string[]): { analise: ResultadoAnalise; afetados: EstadoTitulo[] } {
  const analise = analisarAgenda(s);
  const fs = new Set(fornecedorIds);
  const ts = new Set(tituloIds);
  const afetados = analise.estados.filter((e) => ts.has(e.titulo_id) || fs.has(e.fornecedor_id));
  return { analise, afetados };
}

export function reanalisar(s: Store, fornecedorIds: string[], tituloIds: string[]): EstadoTitulo[] {
  return reanalisarCompleto(s, fornecedorIds, tituloIds).afetados;
}
