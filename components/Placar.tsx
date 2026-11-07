import type { ExecucaoView } from "@/lib/contratos/types";
import { brl, num } from "./ui";

export function Placar({ view }: { view: ExecucaoView }) {
  const { placar, custos } = view;
  const usd = custos.jev.usd.toLocaleString("pt-BR", { maximumFractionDigits: 7 });
  return (
    <section className="border-t border-white/10 px-4 py-4">
      <h2 className="mb-3 text-sm font-semibold">Placar: antes × depois</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-red-400/30 p-3">
          <div className="text-[11px] uppercase tracking-wide opacity-60">Sem o sistema</div>
          <div className={`text-2xl font-semibold text-red-300 ${num}`}>{brl(placar.semSistema)}</div>
        </div>
        <div className="rounded-lg border border-sky-400/40 p-3">
          <div className="text-[11px] uppercase tracking-wide opacity-60">Com o Guardião</div>
          <div className={`text-2xl font-semibold text-sky-300 ${num}`}>{brl(placar.comSistema)}</div>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <div className="text-[11px] uppercase tracking-wide opacity-60">Indevido evitado</div>
          <div className={`text-xl font-semibold ${num}`}>{brl(placar.indevidoEvitado)}</div>
          <div className={`mt-1 text-[11px] opacity-70 ${num}`}>custo de atraso {brl(placar.custoAtraso)}</div>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <div className="text-[11px] uppercase tracking-wide opacity-60">Acionamentos humanos</div>
          <div className={`text-xl font-semibold ${num}`}>{placar.acionamentosHumanos}</div>
          <div className="mt-1 text-[11px] opacity-70">R$ 60 cada se desnecessário</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs opacity-80">
        <span className={num}>Chat (LLM): {custos.chat.chamadas} chamadas, {custos.chat.tokens.toLocaleString("pt-BR")} tokens</span>
        <span className={num}>Jev: US$ {usd}</span>
        <span className="opacity-60">(tokens de chat e dólar do Jev são medidas separadas)</span>
      </div>
    </section>
  );
}
