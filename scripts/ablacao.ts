// npm run ablacao [-- --so so_regras|llm_puro|hibrido] [--limite N] [--modo live|replay]
// Compara so_regras × llm_puro × hibrido e grava analise/ablacao.json. Chama o proxy de verdade (llm_puro e hibrido live).
import { existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const so = arg("so");
  if (so && !["so_regras", "llm_puro", "hibrido"].includes(so)) throw new Error(`--so inválido: ${so}`);
  const modo = arg("modo");
  if (modo && !["live", "replay"].includes(modo)) throw new Error(`--modo inválido: ${modo}`);
  const limite = arg("limite") ? Number(arg("limite")) : undefined;
  if (limite !== undefined && !(limite > 0)) throw new Error("--limite deve ser > 0");

  const { executarAblacao, gravarAblacao } = await import("../lib/avaliacao/ablacao");
  const saida = await executarAblacao({ so: so as never, limite, modo: modo as never, log: (s) => console.log(s) });
  const arq = gravarAblacao(saida, limite);
  console.table(saida.resultados.map((r) => ({ config: r.config, indevidoEvitado: r.indevidoEvitado, recall: r.recall, falsosPositivos: r.falsosPositivos, acionamentos: r.acionamentos, placar: r.placar })));
  for (const r of saida.resultados) if (r.amostra) console.log(`${r.config}: ${r.amostra}`);
  console.log(`gravado em ${arq}`);
}

main().catch((e) => {
  console.error("falhou:", (e as Error).message);
  process.exit(1);
});
