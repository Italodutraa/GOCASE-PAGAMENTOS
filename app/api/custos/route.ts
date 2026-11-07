// Server-Sent Events: envia o histórico e cada nova linha 💲 ao frontend.
import { sessao, snapshot, type EventoCusto } from "@/lib/ai/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const enc = new TextEncoder();
  let ouvinte: ((ev: EventoCusto) => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const enviar = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      enviar({ tipo: "inicio", historico: sessao.historico.slice(-20), sessao: snapshot() });
      ouvinte = (ev) => enviar(ev);
      sessao.bus.on("custo", ouvinte);
      req.signal.addEventListener("abort", () => {
        if (ouvinte) sessao.bus.off("custo", ouvinte);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      if (ouvinte) sessao.bus.off("custo", ouvinte);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
