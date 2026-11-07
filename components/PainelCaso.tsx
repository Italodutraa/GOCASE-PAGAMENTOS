"use client";
import { useState } from "react";
import type { CasoView, TituloView } from "@/lib/contratos/types";
import type { ReciboWriteBack } from "@/lib/orquestrador/autonomia";
import { AgenteAvatar, agenteDoEvento, Elenco } from "./AgenteAvatar";
import { GovernancaZeroTrust } from "./GovernancaZeroTrust";
import { Pareceres } from "./Pareceres";
import { ReciboAutonomo } from "./ReciboAutonomo";
import { Timeline } from "./Timeline";
import { brl, Carimbo, CARIMBO_DA_ACAO, ChipAcao, num, Pilula, SeloSimulado } from "./ui";

export function PainelCaso({
  caso,
  titulos = [],
  recibo,
  limiar = 0.9,
}: {
  caso?: CasoView;
  titulos?: TituloView[];
  recibo?: ReciboWriteBack;
  limiar?: number;
}) {
  const [gavetaAberta, setGavetaAberta] = useState(false);

  if (!caso)
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#2659a5]/40 bg-white p-10 text-center text-sm text-[#2659a5]">
        Nenhum caso aberto ainda. Avance até o próximo corte para os agentes analisarem o lote.
      </div>
    );
  const d = caso.decisao;
  const ultimo = caso.trace[caso.trace.length - 1];
  const ativo = ultimo ? agenteDoEvento(ultimo) : "maestro";
  const titulosDoCaso = titulos.filter((t) => t.casoId === caso.id || caso.titulos.includes(t.titulo_id));

  return (
    <div className="flex flex-col gap-4">
      {/* CARD EXECUTIVO PRINCIPAL: Título do Caso, Carimbo de Decisão, Valor em R$ e Parecer Executivo */}
      <header className="rounded-2xl bg-[#2659a5] p-6 text-white shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Pilula>caso {caso.tipo.replace(/_/g, " ")}</Pilula>
              <span className="font-mono text-xs font-bold text-[#d7d900]">{caso.fornecedor_id}</span>
              {caso.simulado && <SeloSimulado texto="cenário simulado" />}
            </div>
            <h2 className="text-2xl font-bold leading-snug">{caso.titulo}</h2>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className={`text-3xl font-bold text-[#d7d900] ${num}`}>{brl(caso.valorTotal)}</div>
            <div className="flex flex-wrap justify-end gap-2">
              {recibo?.efetivadoAuto && (
                <span className="inline-flex items-center gap-1 rounded-md border-2 border-[#2659a5] bg-[#d7d900] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#2659a5] shadow-sm">
                  ✓ EFETIVADO_AUTO ({(recibo.indiceSeguranca * 100).toFixed(1).replace(".", ",")}%)
                </span>
              )}
              {caso.trace.some((e) => e.kind === "injecao") && <Carimbo tipo="INJEÇÃO IGNORADA" />}
              {caso.trace.some((e) => e.kind === "rejeicao_politica") && (
                <span className="inline-flex items-center gap-1">
                  <AgenteAvatar id="cerca" size="sm" />
                  <Carimbo tipo="BARRADO PELA CERCA" />
                </span>
              )}
              <Carimbo tipo={CARIMBO_DA_ACAO[d.acao]} grande />
            </div>
          </div>
        </div>

        {/* Parecer Executivo em Destaque */}
        <div className="mt-4 rounded-xl border border-white/25 bg-white/10 p-4">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#d7d900]">Parecer Executivo Consolidado</span>
            <div className="flex flex-wrap items-center gap-2">
              <ChipAcao acao={d.acao} />
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold">
                {recibo?.efetivadoAuto ? "auto-efetivado (≥ limiar)" : d.executaSozinho ? "executa sozinho" : "requer humano"}
              </span>
              {d.contencaoNoCorte && !recibo?.efetivadoAuto && (
                <span className="rounded-full bg-[#f8ae13] px-2.5 py-0.5 font-bold text-[#2659a5]">
                  contenção: {d.contencaoNoCorte}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/95">{d.justificativa}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] opacity-80">{caso.titulos.length} título(s):</span>
            {caso.titulos.map((t) => (
              <span key={t} className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#2659a5]">
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Recibo Bancário de Auto-Efetivação (visível quando auto-efetivado ou no cenário 94%) */}
      {recibo && (recibo.efetivadoAuto || caso.id === "caso-inj-auto_efetivacao_94" || caso.tipo === "auto_cura_dda") && (
        <ReciboAutonomo caso={caso} recibo={recibo} limiar={limiar} />
      )}

      {/* GAVETA COLAPSÁVEL: Detalhes da Auditoria / Agentes (7 avatares, Pareceres, Trace e Governança Zero-Trust) */}
      <section className="rounded-2xl border-2 border-[#2659a5]/30 bg-white shadow-sm">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const y = typeof window !== "undefined" ? window.scrollY : 0;
            setGavetaAberta((v) => !v);
            if (typeof window !== "undefined") {
              requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }));
            }
          }}
          className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left text-[#2659a5] transition hover:bg-[#2659a5]/5"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-[#2659a5] px-3 py-1 text-xs font-bold text-[#d7d900]">
              🔍 Detalhes da Auditoria / Agentes
            </span>
            <span className="text-xs font-semibold text-[#2659a5]/80">
              7 agentes · {caso.pareceres.length} pareceres · {caso.trace.length} eventos · Governança Zero-Trust
            </span>
          </div>
          <span className="rounded-full border border-[#2659a5]/30 px-3 py-1 text-xs font-bold text-[#2659a5]">
            {gavetaAberta ? "Recolher ▲" : "Expandir Auditoria ▼"}
          </span>
        </button>

        {gavetaAberta && (
          <div className="flex flex-col gap-4 border-t-2 border-[#2659a5]/15 p-4">
            <div className="rounded-xl bg-[#2659a5] px-4 py-3 text-white">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Pilula>Elenco de agentes · Gogroup</Pilula>
                <span className="text-[11px] opacity-90">destaque no agente do último evento</span>
              </div>
              <Elenco ativo={ativo} />
            </div>

            {recibo && !recibo.efetivadoAuto && caso.id !== "caso-inj-auto_efetivacao_94" && (
              <ReciboAutonomo caso={caso} recibo={recibo} limiar={limiar} />
            )}

            <GovernancaZeroTrust caso={caso} titulos={titulosDoCaso} />

            <div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#2659a5]">Pareceres dos especialistas</h3>
                <Pilula>{caso.pareceres.length}</Pilula>
              </div>
              <Pareceres pareceres={caso.pareceres} />
            </div>

            <div className="rounded-xl border border-[#2659a5]/25 bg-white p-3">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#2659a5]">Conversa dos agentes (Trace)</h3>
                <Pilula>{caso.trace.length} eventos</Pilula>
              </div>
              <Timeline trace={caso.trace} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
