// GET /api/analise → resultado do Passo A (determinístico) + resumo. Base do painel (M3) e do Jev (M2).
import { analisarAgenda, resumir } from "@/lib/rules/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const r = analisarAgenda();
  return Response.json({ resumo: resumir(r), ...r });
}
