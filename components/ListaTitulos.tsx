"use client";
import { useMemo, useState } from "react";
import type { TituloView } from "@/lib/contratos/types";
import { brl, ChipAcao, num, Semaforo } from "./ui";

export function ListaTitulos({ titulos, selecionado, onSelect }: { titulos: TituloView[]; selecionado?: string; onSelect: (casoId: string | undefined, tituloId: string) => void }) {
  const [soAchado, setSoAchado] = useState(false);

  const grupos = useMemo(() => {
    const m = new Map<string, TituloView[]>();
    for (const t of titulos) {
      if (soAchado && t.achados.length === 0 && t.status === "limpo") continue;
      (m.get(t.lote) ?? m.set(t.lote, []).get(t.lote)!).push(t);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [titulos, soAchado]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Títulos por lote</h2>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs">
          <input type="checkbox" checked={soAchado} onChange={(e) => setSoAchado(e.target.checked)} className="accent-sky-400" />
          só com achado
        </label>
      </div>
      {grupos.length === 0 && <p className="rounded border border-dashed border-white/15 p-4 text-center text-xs opacity-60">Nenhum título para exibir.</p>}
      {grupos.map(([lote, ts]) => (
        <section key={lote} className="rounded-lg border border-white/10">
          <header className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs">
            <span className="font-mono font-semibold">{lote}</span>
            <span className={`opacity-60 ${num}`}>
              {ts.length} título(s) · {brl(ts.reduce((s, t) => s + t.valor, 0))}
            </span>
          </header>
          <ul>
            {ts.map((t) => (
              <li key={t.titulo_id}>
                <button
                  onClick={() => onSelect(t.casoId, t.titulo_id)}
                  className={`flex w-full flex-col gap-1 border-b border-white/5 px-3 py-2 text-left last:border-0 hover:bg-white/5 ${t.casoId && t.casoId === selecionado ? "bg-sky-500/10" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <Semaforo status={t.status} />
                    <span className="font-mono text-xs">{t.titulo_id}</span>
                    <span className="min-w-0 flex-1 truncate text-xs opacity-80">{t.fornecedor_nome}</span>
                    <span className={`text-xs font-medium ${num}`}>{brl(t.valor)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 pl-4 text-[11px] opacity-90">
                    <ChipAcao acao={t.acao} />
                    <span className="opacity-60">origem: {t.origem}</span>
                    <span className="opacity-60">{t.situacao.replace("_", " ")}</span>
                    {t.valorEmRisco > 0 && <span className={`text-red-300 ${num}`}>risco {brl(t.valorEmRisco)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
