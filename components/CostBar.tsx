"use client";
// Barra fixa com as linhas 💲 do AI Proxy (via SSE /api/custos). Chat em tokens e Jev em US$, sempre separados.
import { useEffect, useState } from "react";

type Sessao = { chatChamadas: number; chatTokens: number; jevChamadas: number; jevUsd: number };
type Ev = { tipo: "chat" | "jev"; linha: string; em: string; sessao: Sessao };

const usd = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 7, useGrouping: false });

export function CostBar() {
  const [linhas, setLinhas] = useState<Ev[]>([]);
  const [s, setS] = useState<Sessao>({ chatChamadas: 0, chatTokens: 0, jevChamadas: 0, jevUsd: 0 });
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/custos");
    es.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.tipo === "inicio") {
        setLinhas(d.historico);
        setS(d.sessao);
      } else {
        setLinhas((l) => [...l.slice(-49), d]);
        setS(d.sessao);
      }
    };
    return () => es.close();
  }, []);

  const ultima = linhas[linhas.length - 1];
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-[var(--bg)]/95 text-xs backdrop-blur dark:border-white/10">
      <button onClick={() => setAberta((a) => !a)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-left">
        <span className="font-semibold">AI Proxy</span>
        <span>Chat: {s.chatChamadas} chamadas, {s.chatTokens.toLocaleString("pt-BR")} tok</span>
        <span>Jev: {s.jevChamadas} chamadas, US$ {usd(s.jevUsd)}</span>
        <span className="min-w-0 flex-1 truncate font-mono opacity-70">{ultima?.linha ?? "nenhuma chamada ainda"}</span>
        <span className="opacity-60">{aberta ? "▾" : "▴"}</span>
      </button>
      {aberta && (
        <ul className="max-h-56 overflow-y-auto px-4 pb-3 font-mono">
          {linhas.map((l, i) => (
            <li key={i} className={l.tipo === "jev" ? "text-violet-700 dark:text-violet-300" : ""}>
              {new Date(l.em).toLocaleTimeString("pt-BR")} {l.linha}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
