import { ping } from "@/lib/ai/ping";
import { ProxyError } from "@/lib/ai/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return Response.json(await ping());
  } catch (e) {
    const status = e instanceof ProxyError && e.status >= 400 ? e.status : 500;
    return Response.json({ erro: (e as Error).message }, { status });
  }
}
