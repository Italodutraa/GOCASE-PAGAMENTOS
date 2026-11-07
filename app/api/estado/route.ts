import { view } from "@/lib/orquestrador/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(view());
}
