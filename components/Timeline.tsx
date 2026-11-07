import type { TraceEvento, TraceKind } from "@/lib/contratos/types";
import { SeloSimulado } from "./ui";

const FORTE: Partial<Record<TraceKind, { borda: string; bg: string; rotulo: string }>> = {
  conflito: { borda: "border-fuchsia-400", bg: "bg-fuchsia-500/10", rotulo: "CONFLITO" },
  rejeicao_politica: { borda: "border-red-400", bg: "bg-red-500/10", rotulo: "REJEIÇÃO DA POLÍTICA" },
  correcao: { borda: "border-amber-400", bg: "bg-amber-500/10", rotulo: "CORREÇÃO" },
  injecao: { borda: "border-orange-400", bg: "bg-orange-500/15", rotulo: "INJEÇÃO DE PROMPT" },
};
const PONTO: Record<TraceKind, string> = {
  observacao: "bg-slate-400", tool_call: "bg-slate-600", tool_result: "bg-slate-600", parecer: "bg-sky-400", conflito: "bg-fuchsia-400",
  proposta: "bg-sky-300", rejeicao_politica: "bg-red-400", correcao: "bg-amber-400", critico: "bg-emerald-400",
  resposta_fornecedor: "bg-sky-400", resposta_humano: "bg-sky-400", injecao: "bg-orange-400", execucao: "bg-emerald-400",
};

export function Timeline({ trace }: { trace: TraceEvento[] }) {
  if (trace.length === 0) return <p className="text-xs opacity-60">Sem eventos de trace.</p>;
  return (
    <ol className="relative ml-2 border-l border-white/15">
      {trace.map((e, i) => {
        const forte = FORTE[e.kind];
        const compacto = e.kind === "tool_call" || e.kind === "tool_result";
        const simulado = e.kind === "resposta_fornecedor" || e.kind === "resposta_humano";
        return (
          <li key={i} className="relative pb-2 pl-4">
            <span className={`absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full ${PONTO[e.kind]} ${forte ? "ring-2 ring-white/40" : ""}`} />
            <div className={forte ? `rounded-md border-l-4 ${forte.borda} ${forte.bg} px-3 py-2` : compacto ? "py-0.5" : "py-1"}>
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide opacity-70">
                <span className={forte ? "font-bold opacity-100" : ""}>{forte?.rotulo ?? e.kind.replace("_", " ")}</span>
                {e.agente && <span className="rounded bg-white/10 px-1 normal-case">{e.agente}</span>}
                <span className="tabular-nums normal-case">{new Date(e.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                {simulado && <SeloSimulado />}
              </div>
              <p className={compacto ? "break-words font-mono text-[11px] opacity-75" : forte ? "mt-0.5 text-sm font-medium" : "mt-0.5 text-xs"}>{e.texto}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
