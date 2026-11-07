"use client";
import type { Cenario } from "./useExecucao";
import { SeloSimulado } from "./ui";

const ITENS: { c: Cenario; t: string }[] = [
  { c: "troca_conta_fornecedor_novo", t: "Troca de conta por fornecedor novo" },
  { c: "cnpj_clonado", t: "CNPJ clonado" },
  { c: "injecao_prompt_v2", t: "Nova injeção de prompt" },
];

export function BotoesInjecao({ onInjetar, desabilitado }: { onInjetar: (c: Cenario) => void; desabilitado: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Injetar anomalia</h2>
        <SeloSimulado texto="cenário simulado" />
      </div>
      <div className="flex flex-wrap gap-2">
        {ITENS.map((i) => (
          <button key={i.c} disabled={desabilitado} onClick={() => onInjetar(i.c)} className="rounded-md border border-orange-400/40 px-2.5 py-1.5 text-xs text-orange-200 hover:bg-orange-500/15 disabled:opacity-50">
            {i.t}
          </button>
        ))}
      </div>
    </div>
  );
}
