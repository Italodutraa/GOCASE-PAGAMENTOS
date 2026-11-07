// Lista casos sem cache de replay (o híbrido em replay cairia no piso). Sem rede.
async function main() {
  delete process.env.AI_PROXY_API_KEY;
  const { estadoRunner } = await import("../lib/orquestrador/runner");
  const { lerReplay } = await import("../lib/orquestrador/replay");
  const cache = lerReplay<{ pareceres: unknown[] }>("casos");
  const st = estadoRunner();
  const sem = st.casos.filter((c) => !cache[c.entrada.id]?.pareceres?.length);
  console.log(`casos: ${st.casos.length} · com cache: ${st.casos.length - sem.length} · sem cache: ${sem.length}`);
  for (const c of sem) console.log(`  ${c.entrada.id} ${c.entrada.fornecedor_nome} esp=[${c.entrada.especialistas.join(",")}] titulos=${c.entrada.titulos.length}`);
}
main();
