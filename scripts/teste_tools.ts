// Testa se o proxy aceita function calling (tools) com glm-5.3-flash e latest.
import { existsSync } from "node:fs";
for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

async function main() {
  const { chat } = await import("../lib/ai/proxy");
  const tools = [
    {
      type: "function" as const,
      function: {
        name: "consultar_titulo",
        description: "Consulta um título do ERP pelo ID.",
        parameters: { type: "object", properties: { titulo_id: { type: "string" } }, required: ["titulo_id"] },
      },
    },
  ];
  for (const model of ["glm-5.3-flash", "latest"]) {
    try {
      const r = await chat({
        model,
        max_tokens: 2000,
        tools,
        tool_choice: "auto",
        messages: [{ role: "user", content: "Consulte o título TP432130 usando a ferramenta disponível." }],
      });
      console.log(model, "→ tool_calls:", JSON.stringify(r.toolCalls), "| texto:", r.texto.slice(0, 120));
    } catch (e) {
      console.log(model, "→ ERRO:", (e as Error).message);
    }
  }
}
main();
