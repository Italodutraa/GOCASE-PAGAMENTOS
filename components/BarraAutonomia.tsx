"use client";
import type { ModoPoliticaAutonomia, ResumoAutonomia } from "@/lib/orquestrador/autonomia";
import { brl, num, Pilula } from "./ui";

export function BarraAutonomia({
  limiar,
  setLimiar,
  modoPolitica,
  setModoPolitica,
  resumo,
}: {
  limiar: number;
  setLimiar: (v: number) => void;
  modoPolitica: ModoPoliticaAutonomia;
  setModoPolitica: (m: ModoPoliticaAutonomia) => void;
  resumo: ResumoAutonomia;
}) {
  const pct = Math.round(limiar * 100);
  return (
    <section className="rounded-2xl border-2 border-[#2659a5] bg-[#2659a5] p-4 text-white shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold">Gatilho de Auto-Efetivação: {pct}% de Segurança</h2>
          <Pilula>Índice = min(1 − risco_fraude, confiança)</Pilula>
        </div>
        <div className="inline-flex overflow-hidden rounded-full border-2 border-white/40 text-xs font-bold">
          <button
            type="button"
            onClick={() => setModoPolitica("estrita")}
            className={`px-3 py-1 transition ${
              modoPolitica === "estrita" ? "bg-[#d7d900] text-[#2659a5]" : "text-white hover:bg-white/10"
            }`}
          >
            Alçada Estrita (≤ R$ 5 mil + Auto-Cura)
          </button>
          <button
            type="button"
            onClick={() => setModoPolitica("expandida")}
            className={`px-3 py-1 transition ${
              modoPolitica === "expandida" ? "bg-[#d7d900] text-[#2659a5]" : "text-white hover:bg-white/10"
            }`}
          >
            Full ≥ {pct}% (Autonomia Expandida)
          </button>
        </div>
      </div>

      <div className="mt-3 grid items-center gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <div className="rounded-xl bg-white/10 p-3">
          <label htmlFor="slider-autonomia" className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span>Limiar de Segurança Operacional (75% a 99%)</span>
            <span className={`rounded-full bg-[#d7d900] px-2.5 py-0.5 text-[#2659a5] ${num}`}>{pct}%</span>
          </label>
          <input
            id="slider-autonomia"
            type="range"
            min={75}
            max={99}
            step={1}
            value={pct}
            onChange={(e) => setLimiar(Number(e.target.value) / 100)}
            className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-[#d7d900]"
          />
          <div className={`mt-1 flex justify-between text-[10px] opacity-85 ${num}`}>
            <span>75% (mais autônomo)</span>
            <span>90% (padrão executivo)</span>
            <span>99% (supervisão máxima)</span>
          </div>
        </div>

        <dl className={`grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 ${num}`}>
          <div className="rounded-xl bg-white p-2.5 text-[#2659a5]">
            <dt className="text-[10px] font-bold uppercase">Auto-Efetivados</dt>
            <dd className="text-base font-bold">
              {resumo.casosEfetivados} caso(s) · {resumo.titulosEfetivados} tít.
            </dd>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-[#2659a5]">
            <dt className="text-[10px] font-bold uppercase">Escalados a Humano</dt>
            <dd className="text-base font-bold">{resumo.casosEscalados} caso(s)</dd>
          </div>
          <div className="rounded-xl bg-[#d7d900] p-2.5 text-[#2659a5]">
            <dt className="text-[10px] font-bold uppercase">Economia Humana</dt>
            <dd className="text-base font-bold">+{brl(resumo.economiaAcionamentosBrl)}</dd>
          </div>
          <div className="rounded-xl bg-[#3dbfef] p-2.5 text-[#2659a5]">
            <dt className="text-[10px] font-bold uppercase">Write-Back</dt>
            <dd className="text-xs font-bold">ERP + MER 612 / LIT 437</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
