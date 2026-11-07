import { resetRunner, view } from "@/lib/orquestrador/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  resetRunner();
  return Response.json({ ok: true, view: view() });
}
