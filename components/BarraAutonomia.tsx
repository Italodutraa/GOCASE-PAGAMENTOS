"use client";
import { useState } from "react";
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
  const [aberto, setAberto] = useState(false);
  const pct = Math.round(limiar * 100);

  return (
    <div className="relative">
      {/* Pílula superior discreta na TopBar com slider rápido integrado */}
      <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#d7d900] bg-white/10 px-3 py-1 text-xs text-white shadow-sm">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="inline-flex items-center gap-1.5 font-bold text-[#d7d900] hover:underline"
          title="Configurar Gatilho de Auto-Efetivação e Política de Governança"
        >
          <span>⚡ Auto ≥{pct}%</span>
          <span className={`rounded-full bg-[#d7d900] px-2 py-0.5 text-[11px] font-bold text-[#2659a5] ${num}`}>
            {resumo.titulosEfetivados} efetivados
          </span>
        </button>
        <input
          aria-label="Limiar de Segurança Operacional"
          type="range"
          min={75}
          max={99}
          step={1}
          value={pct}
          onChange={(e) => setLimiar(Number(e.target.value) / 100)}
          className="hidden h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/30 accent-[#d7d900] sm:block"
        />
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/25"
        >
          {modoPolitica === "estrita" ? "Estrita" : "Full"} {aberto ? "▲" : "▼"}
        </button>
      </div>

      {/* Card flutuante de controle de autonomia */}
      {aberto && (
        <section className="absolute right-0 top-full z-40 mt-2 w-[360px] max-w-[92vw] rounded-2xl border-2 border-[#d7d900] bg-[#2659a5] p-4 text-white shadow-2xl sm:w-[440px]">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#d7d900]">
                Gatilho de Auto-Efetivação: {pct}%
              </h2>
              <Pilula>min(1 − risco, conf.)</Pilula>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/30"
            >
              ✕
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-white/10 p-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setModoPolitica("estrita")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                modoPolitica === "estrita" ? "bg-[#d7d900] text-[#2659a5]" : "text-white hover:bg-white/10"
              }`}
            >
              Alçada Estrita (≤ R$ 5 mil + Auto-Cura)
            </button>
            <button
              type="button"
              onClick={() => setModoPolitica("expandida")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                modoPolitica === "expandida" ? "bg-[#d7d900] text-[#2659a5]" : "text-white hover:bg-white/10"
              }`}
            >
              Full ≥ {pct}% (Expandida)
            </button>
          </div>

          <div className="rounded-xl bg-white/10 p-3">
            <label htmlFor="slider-autonomia" className="mb-1 flex items-center justify-between text-xs font-bold">
              <span>Limiar de Segurança (75% a 99%)</span>
              <span className={`rounded-full bg-[#d7d900] px-2 py-0.5 text-[#2659a5] ${num}`}>{pct}%</span>
            </label>
            <input
              id="slider-autonomia"
              type="range"
              min={75}
              max={99}
              step={1}
              value={pct}
              onChange={(e) => setLimiar(Number(e.target.value) / 100)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-[#d7d900]"
            />
            <div className={`mt-1 flex justify-between text-[10px] opacity-85 ${num}`}>
              <span>75% autônomo</span>
              <span>90% padrão</span>
              <span>99% estrito</span>
            </div>
          </div>

          <dl className={`mt-3 grid grid-cols-3 gap-2 text-xs ${num}`}>
            <div className="rounded-xl bg-white p-2 text-[#2659a5]">
              <dt className="text-[10px] font-bold uppercase">Efetivados</dt>
              <dd className="text-sm font-bold">
                {resumo.casosEfetivados}c · {resumo.titulosEfetivados}t
              </dd>
            </div>
            <div className="rounded-xl bg-white p-2 text-[#2659a5]">
              <dt className="text-[10px] font-bold uppercase">Escalados</dt>
              <dd className="text-sm font-bold">{resumo.casosEscalados} caso(s)</dd>
            </div>
            <div className="rounded-xl bg-[#d7d900] p-2 text-[#2659a5]">
              <dt className="text-[10px] font-bold uppercase">Poupado</dt>
              <dd className="text-sm font-bold">+{brl(resumo.economiaAcionamentosBrl)}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
