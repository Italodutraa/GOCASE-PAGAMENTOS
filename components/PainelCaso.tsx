import type { CasoView } from "@/lib/contratos/types";
import { AgenteAvatar, agenteDoEvento, Elenco } from "./AgenteAvatar";
import { Pareceres } from "./Pareceres";
import { Timeline } from "./Timeline";
import { brl, Carimbo, CARIMBO_DA_ACAO, ChipAcao, num, Pilula, SeloSimulado } from "./ui";

export function PainelCaso({ caso }: { caso?: CasoView }) {
  if (!caso)
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#2659a5]/40 bg-white p-10 text-center text-sm text-[#2659a5]">
        Nenhum caso aberto ainda. Avance até o próximo corte para os agentes analisarem o lote.
      </div>
    );
  const d = caso.decisao;
  const ultimo = caso.trace[caso.trace.length - 1];
  const ativo = ultimo ? agenteDoEvento(ultimo) : "maestro";

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-[#2659a5] px-4 py-2.5 text-white shadow-sm">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Pilula>Elenco de agentes · Gogroup</Pilula>
          <span className="text-[11px] opacity-90">destaque no agente do último evento</span>
        </div>
        <Elenco ativo={ativo} />
      </section>

      <header className="rounded-2xl bg-[#2659a5] p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Pilula>caso {caso.tipo.replace(/_/g, " ")}</Pilula>
              <span className="font-mono text-xs font-bold text-[#d7d900]">{caso.fornecedor_id}</span>
              {caso.simulado && <SeloSimulado texto="cenário simulado" />}
            </div>
            <h2 className="text-xl font-bold leading-snug">{caso.titulo}</h2>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className={`text-2xl font-bold text-[#d7d900] ${num}`}>{brl(caso.valorTotal)}</div>
            <div className="text-xs opacity-90">{caso.titulos.length} título(s)</div>
            <div className="flex flex-wrap justify-end gap-2">
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
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="opacity-90">Decisão final:</span>
          <ChipAcao acao={d.acao} />
          <Pilula>origem: {d.origem}</Pilula>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold">{d.executaSozinho ? "executa sozinho" : "requer humano"}</span>
          {d.contencaoNoCorte && <span className="rounded-full bg-[#f8ae13] px-2.5 py-0.5 font-bold text-[#2659a5]">contenção no corte: {d.contencaoNoCorte}</span>}
          {d.semJev && <span className="rounded-full bg-white/20 px-2 py-0.5">sem Jev</span>}
          {d.semAgente && <span className="rounded-full bg-white/20 px-2 py-0.5">sem agente (só piso)</span>}
        </div>
        <p className="mt-2.5 text-sm leading-relaxed">{d.justificativa}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {caso.titulos.map((t) => (
            <span key={t} className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#2659a5]">
              {t}
            </span>
          ))}
        </div>
      </header>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-bold text-[#2659a5]">Pareceres dos especialistas</h3>
          <Pilula>{caso.pareceres.length}</Pilula>
        </div>
        <Pareceres pareceres={caso.pareceres} />
      </section>

      <section className="rounded-2xl border-2 border-[#2659a5] bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#2659a5]">Conversa dos agentes</h3>
          <Pilula>{caso.trace.length} eventos</Pilula>
        </div>
        <Timeline trace={caso.trace} />
      </section>
    </div>
  );
}
