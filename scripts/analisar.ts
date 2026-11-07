// npm run analisar → roda o Passo A sobre ./pagamentos, imprime o resumo e grava analise/estado_agenda.json.
import fs from "node:fs";
import path from "node:path";
import { analisarAgenda, resumir } from "../lib/rules/engine";
import { brl } from "../lib/data/normalize";

const t0 = Date.now();
const r = analisarAgenda();
const ms = Date.now() - t0;
const s = resumir(r);

const out = path.join(process.cwd(), "analise");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "estado_agenda.json"), JSON.stringify(r, null, 1));

const linha = (k: string, v: { titulos: number; valor: number }) => console.log(`  ${k.padEnd(22)} ${String(v.titulos).padStart(4)} tít  ${brl(v.valor).padStart(18)}`);
console.log(`\nAgenda: ${s.agenda.titulos} títulos, ${brl(s.agenda.valor)}  (análise em ${ms} ms)`);
console.log("\nStatus:");
Object.entries(s.porStatus).forEach(([k, v]) => linha(k, v));
console.log("\nAção mínima (Passo A):");
Object.entries(s.porAcao).forEach(([k, v]) => linha(k, v));
console.log("\nAlçada:");
Object.entries(s.porAlcada).forEach(([k, v]) => linha(k, v));
console.log(`  aprovação dupla        ${s.duplas} títulos`);
console.log("\nAchados por tipo (títulos | valor dos títulos | valor em risco):");
Object.entries(s.porTipo)
  .sort((a, b) => b[1].emRisco - a[1].emRisco || b[1].titulos - a[1].titulos)
  .forEach(([k, v]) => console.log(`  ${k.padEnd(26)} ${String(v.titulos).padStart(4)}  ${brl(v.valor).padStart(16)}  ${brl(v.emRisco).padStart(16)}`));
console.log(`\nValor em risco (máx. por título, sem dupla contagem): ${brl(s.valorEmRisco)}`);
console.log(`Comunicações suspeitas: ${s.comunicacoesSuspeitas} | trocas bancárias inválidas < 30d: ${s.trocasInvalidasRecentes}`);
console.log(`Histórico pago 2x: ${s.duplicidadesHistoricas.parcelas} parcelas, ${brl(s.duplicidadesHistoricas.pagoAMais)}`);
console.log(`\nGravado: analise/estado_agenda.json`);
