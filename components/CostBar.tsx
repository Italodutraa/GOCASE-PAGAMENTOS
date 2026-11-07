"use client";
// Barra fixa com as linhas 💲 do AI Proxy (via SSE /api/custos). Chat em tokens e Jev em US$, sempre separados.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Sessao = { chatChamadas: number; chatTokens: number; jevChamadas: number; jevUsd: number };
type Ev = { tipo: "chat" | "jev"; linha: string; em: string; sessao: Sessao };

const usd = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 7, useGrouping: false });

export function CostBar() {
  const pathname = usePathname();
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
  // a tela simples (/hoje) não mostra custos de IA (vocabulário técnico)
  if (pathname?.startsWith("/hoje")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-[#d7d900] bg-[#2659a5] text-xs text-white shadow-lg">
      <button onClick={() => setAberta((a) => !a)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-left">
        <span className="rounded-full bg-[#d7d900] px-2.5 py-0.5 font-bold text-[#2659a5]">AI Proxy · Gogroup</span>
        <span className="font-semibold">Chat: {s.chatChamadas} chamadas, {s.chatTokens.toLocaleString("pt-BR")} tok</span>
        <span className="font-semibold">Jev: {s.jevChamadas} chamadas, US$ {usd(s.jevUsd)}</span>
        <span className="min-w-0 flex-1 truncate font-mono opacity-90">{ultima?.linha ?? "nenhuma chamada ainda"}</span>
        <span className="font-bold text-[#d7d900]">{aberta ? "▾" : "▴"}</span>
      </button>
      {aberta && (
        <ul className="max-h-56 overflow-y-auto px-4 pb-3 font-mono">
          {linhas.map((l, i) => (
            <li key={i} className={l.tipo === "jev" ? "text-[#3dbfef]" : "text-white"}>
              {new Date(l.em).toLocaleTimeString("pt-BR")} {l.linha}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
