// CRÍTICO (código): confere o que a IA escreveu antes de sair do sistema.
// - toda citação TP/EM/AC/OC/DDA/FP existe no store;
// - mensagens de acionamento citam todos os títulos e o valor total correto;
// senão, cai no template determinístico.
import type { Store } from "@/lib/data/store";
import { brl } from "@/lib/data/normalize";

const RE_IDS = /\b(TP\d{6}|EM\d{6}|AC\d{5}|OC-\d{5}|DDA\d{7}|FP\d{4})\b/g;

export function idsCitados(texto: string): string[] {
  return [...new Set(texto.match(RE_IDS) ?? [])];
}

export function idExiste(id: string, s: Store, extras: Set<string> = new Set()): boolean {
  if (extras.has(id)) return true;
  if (id.startsWith("TP")) return s.titulo.has(id);
  if (id.startsWith("FP")) return s.fornecedor.has(id);
  if (id.startsWith("OC-")) return s.pedidos.has(id);
  if (id.startsWith("EM")) return s.comunicacoes.some((c) => c.comunicacao_id === id);
  if (id.startsWith("AC")) return s.alteracoes.some((a) => a.alteracao_id === id);
  if (id.startsWith("DDA")) return s.dda.some((d) => d.dda_id === id);
  return true;
}

export interface ResultadoCritico {
  ok: boolean;
  inexistentes: string[];
  faltando: string[];
  valorOk: boolean;
  motivo: string;
}

/** Valida citações de uma lista de evidências ou de um texto livre. */
export function criticarCitacoes(evidenciasOuTexto: string[] | string, s: Store, extras?: Set<string>): { ok: boolean; inexistentes: string[] } {
  const ids = Array.isArray(evidenciasOuTexto) ? evidenciasOuTexto.flatMap(idsCitados) : idsCitados(evidenciasOuTexto);
  const inexistentes = ids.filter((id) => !idExiste(id, s, extras));
  return { ok: inexistentes.length === 0, inexistentes };
}

/** Formatos aceitos para o total: "R$ 194.440,08" ou "194440.08". */
function citaValor(texto: string, valor: number) {
  const br = brl(valor).replace(/\s/g, " ");
  const norm = texto.replace(/\s/g, " ");
  return norm.includes(br) || norm.includes(br.replace("R$ ", "R$")) || norm.includes(valor.toFixed(2));
}

export function criticarMensagem(msg: string, titulos: string[], valorTotal: number, s: Store, extras?: Set<string>): ResultadoCritico {
  const { inexistentes } = criticarCitacoes(msg, s, extras);
  // mensagens agrupadas grandes podem resumir: exige todos se ≤ 8 títulos, senão o primeiro e a contagem
  const faltando = titulos.length <= 8 ? titulos.filter((t) => !msg.includes(t)) : msg.includes(titulos[0]) && msg.includes(String(titulos.length)) ? [] : [titulos[0]];
  const valorOk = citaValor(msg, valorTotal);
  const ok = inexistentes.length === 0 && faltando.length === 0 && valorOk;
  const motivo = ok
    ? "citações e total conferidos"
    : [inexistentes.length && `IDs inexistentes: ${inexistentes.join(", ")}`, faltando.length && `títulos não citados: ${faltando.join(", ")}`, !valorOk && `total ${brl(valorTotal)} ausente`].filter(Boolean).join("; ");
  return { ok, inexistentes, faltando, valorOk, motivo };
}

/** Template determinístico (fallback do crítico e texto padrão no modo replay sem LLM). */
export function templateAcionamento(p: { pessoa: string; nomePessoa: string; titulos: string[]; valorTotal: number; motivo: string; acaoSolicitada?: string; fornecedor?: string; evidencias?: string[] }) {
  const lista = p.titulos.length <= 8 ? p.titulos.join(", ") : `${p.titulos.slice(0, 6).join(", ")} e mais ${p.titulos.length - 6} (${p.titulos.length} títulos)`;
  return [
    `${p.nomePessoa}, preciso da sua decisão${p.fornecedor ? ` sobre ${p.fornecedor}` : ""}.`,
    `Motivo: ${p.motivo}.`,
    p.acaoSolicitada ? `Ação solicitada: ${p.acaoSolicitada.replace(/_/g, " ")}.` : "",
    `Títulos: ${lista}. Total: ${brl(p.valorTotal)}.`,
    p.evidencias?.length ? `Evidências: ${p.evidencias.slice(0, 8).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
