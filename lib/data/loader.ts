// Leitura dos CSVs de ./pagamentos (só servidor).
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export type Linha = Record<string, string>;

export const DIR_DADOS = process.env.DADOS_DIR || path.join(process.cwd(), "pagamentos");

export function lerCsv(nome: string, delimitador = ",", dir = DIR_DADOS): Linha[] {
  const texto = fs.readFileSync(path.join(dir, nome), "utf8").replace(/^﻿/, "");
  const r = Papa.parse<Linha>(texto, { header: true, delimiter: delimitador, skipEmptyLines: true });
  if (r.errors.length) {
    const e = r.errors[0];
    throw new Error(`${nome}: erro de parse na linha ${e.row}: ${e.message}`);
  }
  return r.data;
}
