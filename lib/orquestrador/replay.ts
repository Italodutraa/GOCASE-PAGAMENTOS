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

export function gravarReplay<T>(nome: string, chave: string, valor: T) {
  const atual = lerReplay<T>(nome);
  atual[chave] = valor;
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${nome}.json`), JSON.stringify(atual, null, 1));
}
