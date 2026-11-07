// Cache em disco (analise/replay/*.json): live grava, replay lê. A demo roda sem tocar o proxy.
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "analise", "replay");

export function lerReplay<T>(nome: string): Record<string, T> {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, `${nome}.json`), "utf8"));
  } catch {
    return {};
  }
}

/** Nada sai para disco com conta/chave completa: "9517944-5" → "…44-5". */
export const mascararContas = (s: string) => s.replace(/\b\d{5,}-\d\b/g, (m) => `…${m.slice(-4)}`).replace(/\b\d{9,}\b/g, (m) => `…${m.slice(-4)}`);

/** JSON com contas mascaradas SÓ nos textos: números (timestamps, valores) ficam intactos e o JSON continua válido. */
export const jsonMascarado = (v: unknown, espaco?: number) => JSON.stringify(v, (_k, x) => (typeof x === "string" ? mascararContas(x) : x), espaco);

export function gravarReplay<T>(nome: string, chave: string, valor: T) {
  const arq = path.join(DIR, `${nome}.json`);
  // arquivo existente ilegível: aborta em vez de sobrescrever (perderia o cache inteiro)
  if (fs.existsSync(arq)) JSON.parse(fs.readFileSync(arq, "utf8"));
  const atual = lerReplay<T>(nome);
  atual[chave] = valor;
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(arq, jsonMascarado(atual, 1));
}
