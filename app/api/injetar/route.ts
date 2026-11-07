import { NextResponse } from "next/server";
import { CENARIOS, type NomeCenario } from "@/lib/mock/cenarios";
import { estadoRunner, processarCasoInjetado } from "@/lib/orquestrador/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let cenario = "";
  let modo: "live" | "replay" | undefined;
  try {
    const body = (await req.json()) as { cenario?: unknown; modo?: unknown };
    cenario = typeof body.cenario === "string" ? body.cenario : "";
    if (body.modo === "live" || body.modo === "replay") modo = body.modo;
  } catch {
    /* corpo inválido tratado abaixo */
  }
  if (!Object.prototype.hasOwnProperty.call(CENARIOS, cenario)) {
    return NextResponse.json({ erro: `cenário inválido: '${cenario}'`, validos: Object.keys(CENARIOS) }, { status: 400 });
  }
  try {
    const st = estadoRunner();
    const { entrada, eventoInicial } = CENARIOS[cenario as NomeCenario](st.store);
    const casoId = await processarCasoInjetado(entrada, eventoInicial, modo);
    return NextResponse.json({ casoId });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
