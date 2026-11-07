"use client";
import { useState } from "react";
import type { Acionamento } from "@/lib/contratos/types";
import type { Decisao } from "./useExecucao";
import { brl, num, SeloSimulado } from "./ui";

const PESSOAS: Record<string, string> = {
  PS01: "Renata Paiva · coord. CP",
  PS02: "Marcos Teles · tesoureiro",
  PS03: "Helena Duarte · diretora",
  PS04: "Carla Menezes · compras",
  PS05: "Diego Prado · compras",
  PS08: "Lívia Campos · jurídico",
  PS09: "Rafael Nunes · controller",
  aprovador: "Aprovador",
};
const CANAIS = ["PS01", "PS02", "PS03", "PS04", "PS05", "PS08", "PS09", "aprovador"];
const nomePessoa = (id: string) => PESSOAS[id] ?? id;

export function GavetaChat({ aberta, onClose, acionamentos, onAcao, ocupado }: { aberta: boolean; onClose: () => void; acionamentos: Acionamento[]; onAcao: (id: string, d: Decisao) => void; ocupado: boolean }) {
  const [canal, setCanal] = useState("PS01");
  const outros = [...new Set(acionamentos.map((a) => a.pessoa))].filter((p) => !CANAIS.includes(p));
  const canais = [...CANAIS, ...outros];
  const pend = (p: string) => acionamentos.filter((a) => a.pessoa === p && a.status === "pendente").length;
  const msgs = acionamentos.filter((a) => a.pessoa === canal);

  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-2xl flex-col border-l border-white/15 bg-[#17171a] pb-14 shadow-2xl sm:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-2 sm:w-48 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
          {canais.map((p) => (
            <button key={p} onClick={() => setCanal(p)} className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs ${canal === p ? "bg-sky-500/20 text-sky-100" : "hover:bg-white/5"}`}>
              <span className="whitespace-nowrap sm:whitespace-normal">{nomePessoa(p)}</span>
              {pend(p) > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{pend(p)}</span>}
            </button>
          ))}
        </nav>
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <div>
              <h2 className="text-sm font-semibold">{nomePessoa(canal)}</h2>
              <p className="text-[10px] opacity-60">Simulador de chat de aprovações</p>
            </div>
            <div className="flex items-center gap-2">
              <SeloSimulado texto="chat simulado" />
              <button onClick={onClose} className="rounded border border-white/15 px-2 py-0.5 text-xs hover:bg-white/10">Fechar</button>
            </div>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {msgs.length === 0 && <p className="text-center text-xs opacity-60">Nenhuma mensagem neste canal.</p>}
            {msgs.map((a) => (
              <div key={a.id} className="space-y-2">
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white/10 p-3 text-sm">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-300">Agente Guardião · {a.janela}</div>
                  <p>{a.mensagem}</p>
                  <dl className="mt-2 space-y-0.5 text-[11px] opacity-80">
                    <div>Títulos: <span className="font-mono">{a.titulos.join(", ")}</span></div>
                    <div>Valor total: <span className={num}>{brl(a.valorTotal)}</span></div>
                    {a.acaoSolicitada && <div>Ação solicitada: <span className="font-mono">{a.acaoSolicitada}</span></div>}
                  </dl>
                  {a.status === "pendente" && (
                    <div className="mt-3 flex gap-2">
                      <button disabled={ocupado} onClick={() => onAcao(a.id, "aprovar")} className="rounded bg-emerald-500/80 px-3 py-1 text-xs font-medium text-black hover:bg-emerald-400 disabled:opacity-50">Aprovar</button>
                      <button disabled={ocupado} onClick={() => onAcao(a.id, "recusar")} className="rounded bg-red-500/80 px-3 py-1 text-xs font-medium text-black hover:bg-red-400 disabled:opacity-50">Recusar</button>
                      <button disabled={ocupado} onClick={() => onAcao(a.id, "mais_info")} className="rounded border border-white/25 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-50">Mais info</button>
                    </div>
                  )}
                </div>
                {a.resposta && (
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-sky-600/30 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
                      <span>{nomePessoa(a.resposta.pessoa)} · {a.resposta.decisao.replace("_", " ")}</span>
                      <SeloSimulado texto={a.resposta.simulada ? "humano simulado" : "humano"} />
                    </div>
                    <p>{a.resposta.motivo}</p>
                    {a.resposta.pergunta && <p className="mt-1 italic opacity-80">{a.resposta.pergunta}</p>}
                  </div>
                )}
                {a.status !== "pendente" && !a.resposta && <p className="text-right text-[11px] opacity-60">status: {a.status}</p>}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
