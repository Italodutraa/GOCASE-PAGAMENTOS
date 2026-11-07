import type { Parecer } from "@/lib/contratos/types";
import { AGENTE_DO_ESPECIALISTA, AGENTES, AgenteAvatar } from "./AgenteAvatar";
import { ChipAcao, num, Pilula } from "./ui";

export function Pareceres({ pareceres }: { pareceres: Parecer[] }) {
  if (pareceres.length === 0)
    return (
      <p className="rounded-2xl border-2 border-dashed border-[#2659a5]/30 bg-white p-4 text-xs text-[#2659a5]">
        Sem pareceres: decisão determinística do piso (Cerca · Passo A), sem especialistas.
      </p>
    );
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {pareceres.map((p) => {
        const agId = AGENTE_DO_ESPECIALISTA[p.especialista];
        const ag = AGENTES[agId];
        return (
          <article key={p.especialista} className="rounded-2xl border-2 border-[#2659a5] bg-white p-3.5 text-[#2659a5] shadow-sm">
            <header className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <AgenteAvatar id={agId} size="sm" />
                <div className="min-w-0">
                  <h4 className="truncate text-xs font-bold leading-tight">{ag.nome}</h4>
                  <p className="truncate text-[10px] opacity-80">{ag.papel.split(":")[0]}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Pilula>conf. {Math.round(p.confianca * 100)}%</Pilula>
                <ChipAcao acao={p.acao} />
              </div>
            </header>
            <dl className="mb-2.5 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <dt className="font-semibold">risco</dt>
                <dd className={num}>{p.risco.toFixed(2).replace(".", ",")}</dd>
                <div className="mt-0.5 h-1.5 rounded-full bg-[#2659a5]/15">
                  <div className="h-1.5 rounded-full bg-[#e5381a]" style={{ width: `${Math.round(p.risco * 100)}%` }} />
                </div>
              </div>
              <div>
                <dt className="font-semibold">confiança</dt>
                <dd className={num}>{p.confianca.toFixed(2).replace(".", ",")}</dd>
                <div className="mt-0.5 h-1.5 rounded-full bg-[#2659a5]/15">
                  <div className="h-1.5 rounded-full bg-[#3dbfef]" style={{ width: `${Math.round(p.confianca * 100)}%` }} />
                </div>
              </div>
            </dl>
            <p className="mb-2 text-xs leading-snug">{p.resumo}</p>
            <div className="flex flex-wrap gap-1">
              {p.evidencias.map((e) => (
                <span key={e} className="rounded-full bg-[#2659a5] px-2 py-0.5 font-mono text-[10px] text-white">
                  {e}
                </span>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
