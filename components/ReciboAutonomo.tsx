"use client";
import { useState } from "react";
import type { CasoView } from "@/lib/contratos/types";
import type { ReciboWriteBack } from "@/lib/orquestrador/autonomia";
import { brl, num, Pilula, SeloSimulado } from "./ui";

export function ReciboAutonomo({ caso, recibo, limiar }: { caso: CasoView; recibo: ReciboWriteBack; limiar: number }) {
  const [copiado, setCopiado] = useState(false);
  const segPct = (recibo.indiceSeguranca * 100).toFixed(1).replace(".", ",");
  const limPct = Math.round(limiar * 100);
  const riscoPct = (recibo.riscoFraude * 100).toFixed(1).replace(".", ",");
  const confPct = (recibo.confianca * 100).toFixed(1).replace(".", ",");

  const copiarHash = () => {
    navigator.clipboard?.writeText(recibo.hashAutenticacao).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <section
      aria-label="Recibo de Execução e Governança de Autonomia"
      className={`rounded-2xl border-2 border-dashed p-4 shadow-sm ${
        recibo.efetivadoAuto ? "border-[#2659a5] bg-white text-[#2659a5]" : "border-[#2659a5]/50 bg-white text-[#2659a5]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {recibo.efetivadoAuto ? (
              <span className="inline-block rounded-md border-2 border-[#2659a5] bg-[#d7d900] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#2659a5]">
                ✓ EXECUTADO SOB DELEGAÇÃO DE ALÇADA ≥ {limPct}% <SeloSimulado texto="simulado · recibo e hash de demonstração" />
              </span>
            ) : (
              <span className="inline-block rounded-md border-2 border-[#2659a5] bg-[#f8ae13] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#2659a5]">
                SUPERVISÃO HUMANA ATIVA (GATILHO {limPct}%)
              </span>
            )}
            <Pilula>Recibo Multi-Sistema · Write-Back</Pilula>
          </div>
          <p className="mt-1.5 text-xs font-semibold">{recibo.motivoGovernanca}</p>
        </div>

        <div className={`rounded-xl bg-[#2659a5] px-3.5 py-2 text-right text-white ${num}`}>
          <div className="text-[10px] font-bold uppercase text-[#d7d900]">Índice de Segurança</div>
          <div className="text-xl font-bold">{segPct}%</div>
          <div className="text-[10px] opacity-90">
            min(1 − {riscoPct}%, {confPct}%)
          </div>
        </div>
      </div>

      <div className="mt-3 h-2.5 w-full rounded-full bg-[#2659a5]/15">
        <div
          className={`h-2.5 rounded-full transition-[width] duration-500 ${recibo.efetivadoAuto ? "bg-[#3dbfef]" : "bg-[#f8ae13]"}`}
          style={{ width: `${Math.min(100, Math.round(recibo.indiceSeguranca * 100))}%` }}
        />
      </div>

      {recibo.efetivadoAuto && (
        <div className="mt-3.5 grid gap-3 rounded-xl border-2 border-[#2659a5] bg-[#3dbfef]/15 p-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 font-bold">
            <span className="rounded-full bg-[#2659a5] px-2.5 py-0.5 text-white">[✓ ERP Baixado: {recibo.statusErp}]</span>
            <span className="rounded-full bg-[#2659a5] px-2.5 py-0.5 text-white">
              [✓ Remessa Bancária {recibo.bancoCodigo} · Ocorrência {recibo.codigoOcorrencia}]
            </span>
            <span className="rounded-full bg-[#d7d900] px-2.5 py-0.5 text-[#2659a5]">[✓ Conferência 3 Vias OK]</span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[#2659a5]">
              [✓ Economia: +{brl(recibo.economiaHumanoBrl)} · Atraso: {brl(0)}]
            </span>
          </div>

          <div className={`grid gap-2 sm:grid-cols-3 ${num}`}>
            <div className="rounded-lg bg-white p-2">
              <div className="text-[10px] font-bold uppercase opacity-75">Banco / Lote / Retorno</div>
              <div className="font-mono font-bold">
                {recibo.bancoNome} · {recibo.loteRemessa}
              </div>
              <div className="font-mono text-[11px]">{recibo.arquivoRetorno}</div>
            </div>
            <div className="rounded-lg bg-white p-2">
              <div className="text-[10px] font-bold uppercase opacity-75">Via de Liquidação Executada</div>
              <div className="font-semibold leading-snug">{recibo.viaLiquidacao}</div>
            </div>
            <div className="rounded-lg bg-white p-2">
              <div className="text-[10px] font-bold uppercase opacity-75">Hash de Autenticação (16 hex)</div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <code className="rounded bg-[#2659a5] px-2 py-0.5 font-mono text-xs font-bold text-[#d7d900]">
                  {recibo.hashAutenticacao}
                </code>
                <button
                  type="button"
                  onClick={copiarHash}
                  className="rounded-full border border-[#2659a5] bg-[#d7d900] px-2.5 py-0.5 text-[10px] font-bold text-[#2659a5] hover:bg-[#3dbfef]"
                >
                  {copiado ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <div className="mt-0.5 text-[10px]">
                Valor liquidado: <strong>{brl(caso.valorTotal)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
