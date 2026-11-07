"use client";
import Link from "next/link";
import type { ExecucaoView } from "@/lib/contratos/types";
import { fmtHora, Pilula, SeloSimulado } from "./ui";

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
  const seg = "inline-flex overflow-hidden rounded-full border-2 border-white/40 text-xs font-semibold";
  const on = "bg-[#d7d900] text-[#2659a5] font-bold";
  return (
    <header className="sticky top-0 z-30 border-b-4 border-[#d7d900] bg-[#2659a5] text-white shadow-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold leading-tight">Guardião de Pagamentos</h1>
            <Pilula>Gogroup</Pilula>
          </div>
          <p className="text-[11px] opacity-90">Relógio da simulação: {fmtHora(view.relogio.agora)}</p>
        </div>
        <div className="rounded-xl border-2 border-white/30 bg-white/10 px-3 py-1">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#d7d900]">Próximo corte (simulado)</div>
          <div className="text-sm font-bold tabular-nums">
            {c.rotulo} {c.resto && <span className="ml-1 text-[#3dbfef]">em {c.resto}</span>}
          </div>
        </div>
        <button
          onClick={p.onAvancar}
          disabled={!!p.ocupado}
          className="rounded-full bg-[#d7d900] px-4 py-1.5 text-sm font-bold text-[#2659a5] hover:bg-[#3dbfef] disabled:opacity-50"
        >
          {p.ocupado === "avançar" ? "Avançando…" : "Avançar até o próximo corte"}
        </button>
        <div className="flex items-center gap-1.5" title={view.liveDisponivel ? "" : "Modo live indisponível: sem chave do AI Proxy configurada"}>
          <span className={seg}>
            <button disabled={!view.liveDisponivel} onClick={() => p.setModo("live")} className={`px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${p.modo === "live" ? on : "text-white"}`}>
              live
            </button>
            <button onClick={() => p.setModo("replay")} className={`px-3 py-1 ${p.modo === "replay" ? on : "text-white"}`}>
              replay
            </button>
          </span>
          {p.modo === "replay" && <SeloSimulado texto="replay simulado" />}
          {!view.liveDisponivel && <span className="text-[10px] opacity-80">live indisponível</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={seg}>
            <button onClick={() => p.setHumanos("auto")} className={`px-3 py-1 ${p.humanos === "auto" ? on : "text-white"}`}>
              humanos auto
            </button>
            <button onClick={() => p.setHumanos("manual")} className={`px-3 py-1 ${p.humanos === "manual" ? on : "text-white"}`}>
              manual
            </button>
          </span>
          <SeloSimulado />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {p.exemplo && <span className="rounded-full bg-[#f8ae13] px-2.5 py-0.5 text-[11px] font-bold text-[#2659a5]">dados de exemplo</span>}
          <Link href="/avaliacao" className="rounded-full border-2 border-white px-3 py-1 text-xs font-bold text-white hover:bg-white hover:text-[#2659a5]">
            Avaliação (ablação)
          </Link>
          <button onClick={p.onReset} disabled={!!p.ocupado} className="rounded-full border-2 border-white/60 px-3 py-1 text-xs font-bold text-white hover:bg-white hover:text-[#2659a5] disabled:opacity-50">
            Reiniciar
          </button>
          <button onClick={p.onChat} className="relative rounded-full bg-[#3dbfef] px-3.5 py-1 text-xs font-bold text-[#2659a5] hover:bg-[#d7d900]">
            Chat de aprovações
            {p.pendentes > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-[#e5381a] px-1.5 text-[10px] font-bold text-white">{p.pendentes}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
