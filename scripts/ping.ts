// npm run ping → testa o wrapper fora do Next. Carrega .env / .env.local sem imprimir o token.
import { existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

async function main() {
  const { ping } = await import("../lib/ai/ping");
  const r = await ping();
  console.log("\nchat →", r.chat.resposta);
  console.log("jev  →", JSON.stringify(r.jev.respostas));
}

main().catch((e) => {
  console.error("falhou:", (e as Error).message);
  process.exit(1);
});
