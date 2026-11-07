import type { CasoView } from "@/lib/contratos/types";
import { Pareceres } from "./Pareceres";
import { Timeline } from "./Timeline";
import { brl, ChipAcao, num, SeloSimulado } from "./ui";

export function PainelCaso({ caso }: { caso?: CasoView }) {
  if (!caso) return <div className="rounded-lg border border-dashed border-white/15 p-10 text-center text-sm opacity-60">Nenhum caso aberto ainda. Avance até o próximo corte para os agentes analisarem o lote.</div>;
  const d = caso.decisao;
  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-lg border border-white/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide opacity-60">
              caso {caso.tipo.replace(/_/g, " ")} · {caso.fornecedor_id} {caso.simulado && <SeloSimulado texto="cenário simulado" />}
            </p>
            <h2 className="text-lg font-semibold leading-snug">{caso.titulo}</h2>
          </div>
          <div className="text-right">
            <div className={`text-xl font-semibold ${num}`}>{brl(caso.valorTotal)}</div>
            <div className="text-[11px] opacity-60">{caso.titulos.length} título(s)</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="opacity-60">Decisão final:</span>
          <ChipAcao acao={d.acao} />
          <span className="opacity-60">origem {d.origem}</span>
          <span className="opacity-60">{d.executaSozinho ? "executa sozinho" : "requer humano"}</span>
          {d.contencaoNoCorte && <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-300">contenção no corte: {d.contencaoNoCorte}</span>}
          {d.semJev && <span className="rounded bg-white/10 px-1.5 py-0.5">sem Jev</span>}
          {d.semAgente && <span className="rounded bg-white/10 px-1.5 py-0.5">sem agente (só piso)</span>}
        </div>
        <p className="mt-2 text-sm">{d.justificativa}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {caso.titulos.map((t) => (
            <span key={t} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">{t}</span>
          ))}
        </div>
      </header>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Pareceres dos especialistas</h3>
        <Pareceres pareceres={caso.pareceres} />
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Conversa dos agentes</h3>
        <Timeline trace={caso.trace} />
      </section>
    </div>
  );
}
