// npm run snapshot → roda TODOS os cortes em modo replay (sem proxy) e grava analise/snapshot.json (ExecucaoView final).
// Falha (exit 1) se algum caso não tiver cache de replay: o deploy publicado não pode depender do proxy.
import fs from "node:fs";
import path from "node:path";

async function main() {
  delete process.env.AI_PROXY_API_KEY; // garante replay puro
  const { avancar, view, resetRunner } = await import("../lib/orquestrador/runner");
  resetRunner();
  for (let i = 0; i < 50; i++) if ((await avancar({ modo: "replay", humanos: "auto" })).fim) break;
  const v = view();
  const semCache = v.casos.filter((c) => c.trace.some((t) => t.texto.startsWith("replay sem cache")));
  const { jsonMascarado } = await import("../lib/orquestrador/replay");
  fs.writeFileSync(path.join(process.cwd(), "analise", "snapshot.json"), jsonMascarado(v));
  console.log(`snapshot: ${v.casos.length} casos, ${v.acionamentos.length} acionamentos, placar ${JSON.stringify(v.placar)}`);
  if (semCache.length) {
    console.error(`FALHA: ${semCache.length} caso(s) sem cache de replay: ${semCache.map((c) => c.id).join(", ")}`);
    process.exit(1);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
