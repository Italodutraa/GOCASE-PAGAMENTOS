"use client";
import type { Cenario } from "./useExecucao";
import { Pilula, SeloSimulado } from "./ui";

const ITENS: { c: Cenario; t: string; destaque?: boolean }[] = [
  { c: "auto_efetivacao_94", t: "⚡ Injetar Caso Auto-Efetivação (94% Segurança)", destaque: true },
  { c: "troca_conta_fornecedor_novo", t: "Troca de conta por fornecedor novo" },
  { c: "cnpj_clonado", t: "CNPJ clonado" },
  { c: "injecao_prompt_v2", t: "Nova injeção de prompt" },
];

export function BotoesInjecao({ onInjetar, desabilitado }: { onInjetar: (c: Cenario) => void; desabilitado: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-[#2659a5] bg-white p-3.5 text-[#2659a5]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">Injetar anomalia ao vivo</h2>
          <Pilula>Auto-Cura 94% + 3 cenários de estresse</Pilula>
        </div>
        <SeloSimulado texto="cenário simulado" />
      </div>
      <div className="flex flex-wrap gap-2">
        {ITENS.map((i) => (
          <button
            key={i.c}
            disabled={desabilitado}
            onClick={() => onInjetar(i.c)}
            className={
              i.destaque
                ? "rounded-full border-2 border-[#2659a5] bg-[#d7d900] px-3.5 py-1.5 text-xs font-bold text-[#2659a5] shadow-xs hover:bg-[#3dbfef] disabled:opacity-50"
                : "rounded-full border-2 border-[#2659a5] bg-[#f8ae13] px-3 py-1 text-xs font-bold text-[#2659a5] hover:bg-[#d7d900] disabled:opacity-50"
            }
          >
            {i.destaque ? i.t : `+ ${i.t}`}
          </button>
        ))}
      </div>
    </div>
  );
}
