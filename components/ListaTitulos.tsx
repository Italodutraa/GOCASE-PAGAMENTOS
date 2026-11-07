"use client";
import { useMemo, useState } from "react";
import type { TituloView } from "@/lib/contratos/types";
import { brl, Carimbo, CARIMBO_DA_ACAO, ChipAcao, num, Pilula, Semaforo } from "./ui";

export function ListaTitulos({ titulos, selecionado, onSelect }: { titulos: TituloView[]; selecionado?: string; onSelect: (casoId: string | undefined, tituloId: string) => void }) {
  const [soAchado, setSoAchado] = useState(true);

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
      <div className="flex items-center justify-between rounded-2xl bg-[#2659a5] px-3.5 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">Títulos por lote</h2>
          <Pilula>{titulos.length}</Pilula>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
          <input type="checkbox" checked={soAchado} onChange={(e) => setSoAchado(e.target.checked)} className="accent-[#d7d900]" />
          só com achado
        </label>
      </div>
      {grupos.length === 0 && <p className="rounded-2xl border-2 border-dashed border-[#2659a5]/30 p-4 text-center text-xs text-[#2659a5]">Nenhum título para exibir.</p>}
      {grupos.map(([lote, ts]) => (
        <section key={lote} className="overflow-hidden rounded-2xl border-2 border-[#2659a5] bg-white">
          <header className="flex items-center justify-between bg-[#2659a5] px-3.5 py-2 text-xs text-white">
            <span className="font-mono font-bold text-[#d7d900]">{lote}</span>
            <span className={num}>
              {ts.length} título(s) · {brl(ts.reduce((s, t) => s + t.valor, 0))}
            </span>
          </header>
          <ul className="max-h-80 overflow-y-auto">
            {ts.map((t) => {
              const sel = t.casoId && t.casoId === selecionado;
              return (
                <li key={t.titulo_id}>
                  <button
                    onClick={() => onSelect(t.casoId, t.titulo_id)}
                    className={`flex w-full flex-col gap-1 border-b border-[#2659a5]/15 px-3 py-2 text-left text-[#2659a5] last:border-0 hover:bg-[#3dbfef]/15 ${sel ? "bg-[#d7d900]/35 font-semibold" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <Semaforo status={t.status} />
                      <span className="font-mono text-xs font-bold">{t.titulo_id}</span>
                      <span className="min-w-0 flex-1 truncate text-xs">{t.fornecedor_nome}</span>
                      <span className={`text-xs font-bold ${num}`}>{brl(t.valor)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 pl-5 text-[11px]">
                      {t.acao === "manter" ? <ChipAcao acao={t.acao} /> : <Carimbo tipo={CARIMBO_DA_ACAO[t.acao]} inclinado={false} />}
                      <span className="opacity-80">origem: {t.origem}</span>
                      <span className="opacity-80">{t.situacao.replace("_", " ")}</span>
                      {t.valorEmRisco > 0 && <span className={`rounded-full bg-[#e5381a] px-2 py-0.5 text-[10px] font-bold text-white ${num}`}>risco {brl(t.valorEmRisco)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
