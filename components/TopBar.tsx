"use client";
import Link from "next/link";
import type { ExecucaoView } from "@/lib/contratos/types";
import { fmtHora, SeloSimulado } from "./ui";

function contagem(v: ExecucaoView) {
  const c = v.relogio.proximoCorte;
  if (!c) return { rotulo: "sem corte pendente", resto: "" };
  const ms = new Date(c.em).getTime() - new Date(v.relogio.agora).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  const resto = d > 0 ? `${d}d ${h % 24}h ${min % 60}min` : `${h}h ${String(min % 60).padStart(2, "0")}min`;
  const hora = new Date(c.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return { rotulo: `${c.lote === "MER" ? "MER" : "LIT"} ${hora}`, resto };
}

export function TopBar(p: {
  view: ExecucaoView;
  exemplo: boolean;
  ocupado: string | null;
  modo: "live" | "replay";
  setModo: (m: "live" | "replay") => void;
  humanos: "auto" | "manual";
  setHumanos: (h: "auto" | "manual") => void;
  onAvancar: () => void;
  onReset: () => void;
  onChat: () => void;
  pendentes: number;
}) {
  const { view } = p;
  const c = contagem(view);
  const seg = "inline-flex overflow-hidden rounded-md border border-white/15 text-xs";
  const on = "bg-sky-500/25 text-sky-200";
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--bg)]/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
        <div>
          <h1 className="text-base font-semibold leading-tight">Guardião de Pagamentos</h1>
          <p className="text-[11px] opacity-60">Relógio da simulação: {fmtHora(view.relogio.agora)}</p>
        </div>
        <div className="rounded-md border border-white/10 px-3 py-1">
          <div className="text-[10px] uppercase tracking-wide opacity-60">Próximo corte (simulado)</div>
          <div className="text-sm font-semibold tabular-nums">
            {c.rotulo} {c.resto && <span className="ml-1 text-sky-300">em {c.resto}</span>}
          </div>
        </div>
        <button
          onClick={p.onAvancar}
          disabled={!!p.ocupado}
          className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-sky-400 disabled:opacity-50"
        >
          {p.ocupado === "avançar" ? "Avançando…" : "Avançar até o próximo corte"}
        </button>
        <div className="flex items-center gap-1.5" title={view.liveDisponivel ? "" : "Modo live indisponível: sem chave do AI Proxy configurada"}>
          <span className={seg}>
            <button disabled={!view.liveDisponivel} onClick={() => p.setModo("live")} className={`px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${p.modo === "live" ? on : ""}`}>
              live
            </button>
            <button onClick={() => p.setModo("replay")} className={`px-2.5 py-1 ${p.modo === "replay" ? on : ""}`}>
              replay
            </button>
          </span>
          {p.modo === "replay" && <SeloSimulado texto="replay simulado" />}
          {!view.liveDisponivel && <span className="text-[10px] opacity-60">live indisponível</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={seg}>
            <button onClick={() => p.setHumanos("auto")} className={`px-2.5 py-1 ${p.humanos === "auto" ? on : ""}`}>
              humanos auto
            </button>
            <button onClick={() => p.setHumanos("manual")} className={`px-2.5 py-1 ${p.humanos === "manual" ? on : ""}`}>
              manual
            </button>
          </span>
          <SeloSimulado />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {p.exemplo && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300">dados de exemplo</span>}
          <Link href="/avaliacao" className="rounded-md border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10">
            Avaliação (ablação)
          </Link>
          <button onClick={p.onReset} disabled={!!p.ocupado} className="rounded-md border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10 disabled:opacity-50">
            Reiniciar
          </button>
          <button onClick={p.onChat} className="relative rounded-md border border-sky-400/50 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-500/15">
            Chat de aprovações
            {p.pendentes > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{p.pendentes}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
