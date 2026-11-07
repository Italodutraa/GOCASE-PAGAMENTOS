"use client";
import { useState } from "react";
import type { Acionamento } from "@/lib/contratos/types";
import { AgenteAvatar } from "./AgenteAvatar";
import { Avatar, PESSOAS } from "./Avatar";
import type { Decisao } from "./useExecucao";
import { brl, num, Pilula, SeloSimulado } from "./ui";

const CANAIS = ["PS01", "PS02", "PS03", "PS04", "PS05", "PS08", "PS09", "aprovador"];
const nomePessoa = (id: string) => (PESSOAS[id] ? `${PESSOAS[id].nome} · ${PESSOAS[id].papel}` : id);

export function GavetaChat({
  aberta,
  onClose,
  acionamentos,
  onAcao,
  ocupado,
}: {
  aberta: boolean;
  onClose: () => void;
  acionamentos: Acionamento[];
  onAcao: (id: string, d: Decisao) => void;
  ocupado: boolean;
}) {
  const [canal, setCanal] = useState("PS01");
  const outros = [...new Set(acionamentos.map((a) => a.pessoa))].filter((p) => !CANAIS.includes(p));
  const canais = [...CANAIS, ...outros];
  const pend = (p: string) => acionamentos.filter((a) => a.pessoa === p && a.status === "pendente").length;
  const tot = (p: string) => acionamentos.filter((a) => a.pessoa === p).length;
  const msgs = acionamentos.filter((a) => a.pessoa === canal);
  const info = PESSOAS[canal];

  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[#2659a5]/60 backdrop-blur-xs" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-3xl flex-col border-l-4 border-[#d7d900] bg-white pb-14 text-[#2659a5] shadow-2xl sm:flex-row"
      >
        <nav className="flex shrink-0 gap-1.5 overflow-x-auto border-b-2 border-[#2659a5]/20 bg-[#2659a5] p-2.5 text-white sm:w-64 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r-2">
          <div className="hidden px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#d7d900] sm:block">
            Canais WhatsApp (simulado)
          </div>
          {canais.map((p) => {
            const ativo = canal === p;
            return (
              <button
                type="button"
                key={p}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCanal(p)}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                  ativo ? "bg-[#d7d900] font-bold text-[#2659a5]" : "text-white hover:bg-white/10"
                }`}
              >
                <Avatar id={p} tamanho={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{PESSOAS[p]?.nome ?? p}</div>
                  <div className="truncate text-[10px] opacity-85">{PESSOAS[p]?.papel ?? "Aprovador"}</div>
                </div>
                {pend(p) > 0 ? (
                  <span className="rounded-full bg-[#e5381a] px-2 py-0.5 text-[10px] font-bold text-white">{pend(p)}</span>
                ) : (
                  tot(p) > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${ativo ? "bg-[#2659a5] text-white" : "bg-white/20 text-white"}`}>{tot(p)}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-2 bg-[#2659a5] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <Avatar id={canal} tamanho={38} />
              <div>
                <h2 className="text-sm font-bold">{nomePessoa(canal)}</h2>
                <p className="text-[11px] text-[#d7d900]">{info?.alçada ?? "Simulador de aprovações · WhatsApp corporativo"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SeloSimulado texto="humano simulado" />
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClose} className="rounded-full bg-[#d7d900] px-3 py-1 text-xs font-bold text-[#2659a5] hover:bg-[#3dbfef]">
                Fechar
              </button>
            </div>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto bg-[#3dbfef]/10 p-4">
            {msgs.length === 0 && (
              <p className="rounded-2xl border-2 border-dashed border-[#2659a5]/30 bg-white p-6 text-center text-xs">
                Nenhuma mensagem neste canal ainda. Avance até o próximo corte para disparar os acionamentos.
              </p>
            )}
            {msgs.map((a) => (
              <div key={a.id} className="space-y-2.5">
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm border-2 border-[#2659a5] bg-white p-3.5 text-sm shadow-xs">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <AgenteAvatar id="maestro" size="sm" />
                    <span>Maestro · GoLastro</span>
                    <Pilula>{a.janela}</Pilula>
                  </div>
                  <p className="leading-snug">{a.mensagem}</p>
                  <dl className="mt-2.5 grid gap-1 rounded-xl bg-[#2659a5]/5 p-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-bold">Títulos ({a.titulos.length}):</span>
                      {a.titulos.slice(0, 8).map((t) => (
                        <span key={t} className="rounded-full bg-[#2659a5] px-2 py-0.5 font-mono text-[10px] text-white">
                          {t}
                        </span>
                      ))}
                      {a.titulos.length > 8 && <span className="text-[10px] font-bold">+{a.titulos.length - 8}</span>}
                    </div>
                    <div>
                      <span className="font-bold">Valor total:</span> <span className={`font-bold ${num}`}>{brl(a.valorTotal)}</span>
                    </div>
                    {a.acaoSolicitada && (
                      <div>
                        <span className="font-bold">Ação solicitada:</span> <span className="font-mono font-semibold">{a.acaoSolicitada}</span>
                      </div>
                    )}
                  </dl>
                  <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] font-bold text-[#2659a5]/70">
                    <span>1 acionamento agrupado (R$ 0 desnecessário)</span>
                    <span aria-hidden>✓✓</span>
                  </div>
                  {a.status === "pendente" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={ocupado}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onAcao(a.id, "aprovar")}
                        className="rounded-full bg-[#d7d900] px-3.5 py-1 text-xs font-bold text-[#2659a5] hover:bg-[#3dbfef] disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onAcao(a.id, "recusar")}
                        className="rounded-full bg-[#e5381a] px-3.5 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onAcao(a.id, "mais_info")}
                        className="rounded-full border-2 border-[#2659a5] bg-white px-3.5 py-1 text-xs font-bold text-[#2659a5] hover:bg-[#f8ae13] disabled:opacity-50"
                      >
                        Pedir mais info
                      </button>
                    </div>
                  )}
                </div>
                {a.resposta && (
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border-2 border-[#2659a5] bg-[#2659a5] p-3.5 text-sm text-white shadow-xs">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      <Avatar id={a.resposta.pessoa} tamanho={24} />
                      <span>{nomePessoa(a.resposta.pessoa)}</span>
                      <Pilula>{a.resposta.decisao.replace("_", " ")}</Pilula>
                      <SeloSimulado texto={a.resposta.simulada ? "humano simulado" : "humano"} />
                    </div>
                    <p className="leading-snug">{a.resposta.motivo}</p>
                    {a.resposta.pergunta && <p className="mt-1 italic text-[#d7d900]">{a.resposta.pergunta}</p>}
                    <div className="mt-1 flex justify-end text-[10px] text-[#3dbfef]">✓✓ registrado na auditoria</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
