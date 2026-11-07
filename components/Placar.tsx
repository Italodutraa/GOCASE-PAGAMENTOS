import type { AblacaoResultado, ExecucaoView } from "@/lib/contratos/types";
import { brl, num } from "./ui";

const NOMES: Record<AblacaoResultado["config"], string> = { so_regras: "Só regras", llm_puro: "Só LLM", hibrido: "Híbrido (Guardião)" };
const ORDEM: AblacaoResultado["config"][] = ["llm_puro", "so_regras", "hibrido"];

// Barra horizontal proporcional à perda (quanto menor, melhor).
function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const w = max > 0 ? Math.max(0.6, (Math.abs(valor) / max) * 100) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-white/5">
      <div className={`h-2.5 rounded-full ${cor} transition-[width] duration-700`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Placar({ view }: { view: ExecucaoView }) {
  const { placar, custos, ablacao } = view;
  const usd = custos.jev.usd.toLocaleString("pt-BR", { maximumFractionDigits: 7 });
  const max = Math.abs(placar.semSistema) || 1;
  const reducao = placar.semSistema !== 0 ? 1 - placar.comSistema / placar.semSistema : 0;
  const ab = ablacao ? ORDEM.map((c) => ablacao.find((r) => r.config === c)).filter((r): r is AblacaoResultado => !!r) : [];
  const maxAb = Math.max(max, ...ab.map((r) => Math.abs(r.placar)));

  return (
    <section className="border-t border-white/10 px-4 py-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Placar: antes × depois</h2>
        <span className="text-[11px] opacity-60">placar = −(dinheiro indevido + custo de atraso + R$ 60 por acionamento desnecessário)</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg border border-white/10 p-4">
          <div className="grid gap-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="uppercase tracking-wide opacity-70">Sem o sistema (tesoureiro assina sem conferir)</span>
                <span className={`text-lg font-semibold text-red-300 ${num}`}>{brl(placar.semSistema)}</span>
              </div>
              <Barra valor={placar.semSistema} max={max} cor="bg-red-400/80" />
            </div>
            <div>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="uppercase tracking-wide opacity-70">Com o Guardião (esta execução)</span>
                <span className={`text-lg font-semibold text-sky-300 ${num}`}>{brl(placar.comSistema)}</span>
              </div>
              <Barra valor={placar.comSistema} max={max} cor="bg-sky-400" />
            </div>
          </div>
          <dl className={`mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 ${num}`}>
            <div>
              <dt className="opacity-60">Perda evitada</dt>
              <dd className="text-base font-semibold">{(reducao * 100).toFixed(1).replace(".", ",")}%</dd>
            </div>
            <div>
              <dt className="opacity-60">Indevido evitado</dt>
              <dd className="text-base font-semibold">{brl(placar.indevidoEvitado)}</dd>
            </div>
            <div>
              <dt className="opacity-60">Custo de atraso</dt>
              <dd className="text-base font-semibold">{brl(placar.custoAtraso)}</dd>
            </div>
            <div>
              <dt className="opacity-60">Acionamentos humanos</dt>
              <dd className="text-base font-semibold">{placar.acionamentosHumanos}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-white/10 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide opacity-70">Ablação medida (analise/ablacao.json)</span>
            <span className="text-[10px] opacity-50">placar final, 876 títulos</span>
          </div>
          {ab.length === 0 ? (
            <p className="text-xs opacity-60">Ablação ainda não rodada.</p>
          ) : (
            <ul className="grid gap-2.5">
              {ab.map((r) => (
                <li key={r.config}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className={r.config === "hibrido" ? "font-semibold text-sky-200" : "opacity-80"}>
                      {NOMES[r.config]}
                      {r.amostra && <span className="ml-1 text-[10px] text-amber-300/90">· amostra declarada</span>}
                    </span>
                    <span className={`font-semibold ${num} ${r.config === "hibrido" ? "text-sky-300" : ""}`}>{brl(r.placar)}</span>
                  </div>
                  <Barra valor={r.placar} max={maxAb} cor={r.config === "hibrido" ? "bg-sky-400" : r.config === "llm_puro" ? "bg-amber-400/70" : "bg-slate-400/70"} />
                  <div className={`mt-0.5 text-[10px] opacity-60 ${num}`}>
                    recall {(r.recall * 100).toFixed(0)}% · falsos positivos {r.falsosPositivos} · acionamentos {r.acionamentos}
                  </div>
                </li>
              ))}
            </ul>
          )}
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
