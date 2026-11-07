// npm run rodar -- [--modo live|replay] [--lotes N] → avança N cortes e imprime o resumo (sem UI).
import { existsSync } from "node:fs";
for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};

async function main() {
  const { avancar, view, resetRunner } = await import("../lib/orquestrador/runner");
  const modo = arg("--modo", "live") as "live" | "replay";
  const lotes = Number(arg("--lotes", "1"));
  resetRunner();
  for (let i = 0; i < lotes; i++) {
    const t0 = Date.now();
    const r = await avancar({ modo, humanos: "auto" });
    console.log(`\n== corte ${r.lote ?? "fim"}: ${r.casos ?? 0} caso(s) em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    if (r.fim) break;
  }
  const v = view();
  for (const c of v.casos.filter((c) => c.trace.length)) {
    console.log(`\n# ${c.titulo} | ${c.decisao.acao} (${c.decisao.origem}) | ${c.decisao.justificativa}`);
    for (const p of c.pareceres) console.log(`   parecer ${p.especialista}: ${p.acao} risco ${p.risco} conf ${p.confianca} | ${p.resumo.slice(0, 140)}`);
    for (const t of c.trace.filter((t) => ["conflito", "rejeicao_politica", "correcao", "resposta_fornecedor", "resposta_humano", "execucao", "critico"].includes(t.kind)))
      console.log(`   [${t.kind}] ${t.agente}: ${t.texto.slice(0, 200)}`);
  }
  console.log("\nAcionamentos:");
  for (const a of v.acionamentos) console.log(`  ${a.id} ${a.pessoa} ${a.status} ${a.titulos.length} tít ${a.valorTotal} | ${a.acaoSolicitada ?? ""} | ${a.mensagem.slice(0, 160)}`);
  console.log("\nPlacar:", JSON.stringify(v.placar));
  console.log("Custos:", JSON.stringify({ chat: v.custos.chat, jev: v.custos.jev }));
}
main().catch((e) => {
  console.error("falhou:", e);
  process.exit(1);
});
