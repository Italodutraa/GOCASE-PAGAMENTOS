import { acaoHumana, view } from "@/lib/orquestrador/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { acionamentoId?: string; decisao?: "aprovar" | "recusar" | "mais_info"; motivo?: string };
  if (!b.acionamentoId || !b.decisao || !["aprovar", "recusar", "mais_info"].includes(b.decisao))
    return Response.json({ erro: "informe acionamentoId e decisao (aprovar | recusar | mais_info)" }, { status: 400 });
  try {
    const ac = await acaoHumana(b.acionamentoId, b.decisao, b.motivo);
    return Response.json({ acionamento: ac.id, status: ac.status, view: view() });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 400 });
  }
}
