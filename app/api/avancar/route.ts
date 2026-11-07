import { avancar, view } from "@/lib/orquestrador/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { modo?: "live" | "replay"; humanos?: "auto" | "manual" };
  try {
    const r = await avancar({ modo: body.modo, humanos: body.humanos });
    return Response.json({ ...r, view: view() });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
