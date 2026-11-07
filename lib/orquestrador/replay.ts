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

export function gravarReplay<T>(nome: string, chave: string, valor: T) {
  const atual = lerReplay<T>(nome);
  atual[chave] = valor;
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${nome}.json`), mascararContas(JSON.stringify(atual, null, 1)));
}
