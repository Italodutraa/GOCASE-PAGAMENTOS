import type { AblacaoResultado, ExecucaoView } from "@/lib/contratos/types";
import type { ResumoAutonomia } from "@/lib/orquestrador/autonomia";
import { brl, num, Pilula } from "./ui";

const NOMES: Record<AblacaoResultado["config"], string> = { so_regras: "Só regras", llm_puro: "Só LLM", hibrido: "Híbrido (GoLastro · Gogroup)" };
const ORDEM: AblacaoResultado["config"][] = ["llm_puro", "so_regras", "hibrido"];

// Barra horizontal proporcional à perda (quanto menor, melhor) — cores da paleta Gogroup.
function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const w = max > 0 ? Math.max(1, (Math.abs(valor) / max) * 100) : 0;
  return (
    <div className="h-3 w-full rounded-full bg-white/25">
      <div className={`h-3 rounded-full ${cor} transition-[width] duration-700`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Placar({ view, resumoAutonomia }: { view: ExecucaoView; resumoAutonomia?: ResumoAutonomia }) {
  const { placar, custos, ablacao } = view;
  const usd = custos.jev.usd.toLocaleString("pt-BR", { maximumFractionDigits: 7 });
  // placar do evento, sem créditos de autonomia (mesmo número de calcularPlacar)
  const comSistemaEfetivo = placar.comSistema;
  const acionamentosEfetivos = placar.acionamentosHumanos;
  const max = Math.abs(placar.semSistema) || 1;
  const reducao = placar.semSistema !== 0 ? 1 - comSistemaEfetivo / placar.semSistema : 0;
  const ab = ablacao ? ORDEM.map((c) => ablacao.find((r) => r.config === c)).filter((r): r is AblacaoResultado => !!r) : [];
  const maxAb = Math.max(max, ...ab.map((r) => Math.abs(r.placar)));

  return (
    <section className="mx-4 my-4 rounded-2xl bg-[#2659a5] p-5 text-white shadow-md">
      {/* Manchete Executiva de ROI (Fintech Executive Design) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#d7d900] bg-white/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-[#d7d900] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#2659a5]">
            ROI Executivo Medido
          </span>
          <span className={`font-['Poppins',sans-serif] text-base font-bold text-white sm:text-lg ${num}`}>
            {(reducao * 100).toFixed(2).replace(".", ",")}% menos perda · indevido evitado {brl(placar.indevidoEvitado)} (simulação, dados fictícios)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border border-[#3dbfef] bg-[#3dbfef]/20 px-3 py-1 text-xs font-bold text-white ${num}`}>
            🔍 Visão 360° Retroativa: R$ 406.636,83 em recuperação com Controller (PS09)
          </span>
          {resumoAutonomia && (
            <span className={`rounded-full bg-[#d7d900] px-3 py-1 text-xs font-bold text-[#2659a5] ${num}`}>
              ⚡ {resumoAutonomia.titulosEfetivados} auto-efetivados (≥{Math.round(resumoAutonomia.limiar * 100)}%) · simulado, fora do placar
            </span>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold">Placar: antes × depois</h2>
          <Pilula>medido na simulação</Pilula>
        </div>
        <span className="text-[11px] opacity-90">placar = −(dinheiro indevido + custo de atraso + R$ 60 por acionamento desnecessário)</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border-2 border-white/30 bg-white/10 p-4">
          <div className="grid gap-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-bold uppercase tracking-wide">Sem o sistema (tesoureiro assina sem conferir)</span>
                <span className={`rounded-full bg-[#e5381a] px-2.5 py-0.5 text-base font-bold text-white ${num}`}>{brl(placar.semSistema)}</span>
              </div>
              <Barra valor={placar.semSistema} max={max} cor="bg-[#e5381a]" />
            </div>
            <div>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-bold uppercase tracking-wide">Com o GoLastro (esta execução)</span>
                <span className={`rounded-full bg-[#d7d900] px-2.5 py-0.5 text-base font-bold text-[#2659a5] ${num}`}>{brl(comSistemaEfetivo)}</span>
              </div>
              <Barra valor={comSistemaEfetivo} max={max} cor="bg-[#3dbfef]" />
            </div>
          </div>
          <dl className={`mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 ${num}`}>
            <div className="rounded-xl bg-white p-2.5 text-[#2659a5]">
              <dt className="text-[11px] font-semibold">Perda evitada</dt>
              <dd className="text-base font-bold">{(reducao * 100).toFixed(1).replace(".", ",")}%</dd>
            </div>
            <div className="rounded-xl bg-white p-2.5 text-[#2659a5]">
              <dt className="text-[11px] font-semibold">Indevido evitado</dt>
              <dd className="text-base font-bold">{brl(placar.indevidoEvitado)}</dd>
            </div>
            <div className="rounded-xl bg-white p-2.5 text-[#2659a5]">
              <dt className="text-[11px] font-semibold">Custo de atraso</dt>
              <dd className="text-base font-bold">{brl(placar.custoAtraso)}</dd>
            </div>
            <div className="rounded-xl bg-white p-2.5 text-[#2659a5]">
              <dt className="text-[11px] font-semibold">Acionamentos humanos</dt>
              <dd className="text-base font-bold">{acionamentosEfetivos}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border-2 border-white/30 bg-white/10 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide">Ablação medida (analise/ablacao.json)</span>
            <Pilula>876 títulos</Pilula>
          </div>
          {ab.length === 0 ? (
            <p className="text-xs opacity-90">Ablação ainda não rodada.</p>
          ) : (
            <ul className="grid gap-3">
              {ab.map((r) => (
                <li key={r.config}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className={r.config === "hibrido" ? "font-bold text-[#d7d900]" : "font-semibold"}>
                      {NOMES[r.config]}
                      {r.amostra && <span className="ml-1.5 rounded-full bg-[#f8ae13] px-2 py-0.5 text-[10px] font-bold text-[#2659a5]">amostra 79+60</span>}
                    </span>
                    <span className={`font-bold ${num} ${r.config === "hibrido" ? "text-[#d7d900]" : ""}`}>{brl(r.placar)}</span>
                  </div>
                  <Barra
                    valor={r.placar}
                    max={maxAb}
                    cor={r.config === "hibrido" ? "bg-[#3dbfef]" : r.config === "llm_puro" ? "bg-[#f8ae13]" : "bg-[#d7d900]"}
                  />
                  <div className={`mt-0.5 text-[10px] opacity-90 ${num}`}>
                    recall {(r.recall * 100).toFixed(0)}% · falsos positivos {r.falsosPositivos} · acionamentos {r.acionamentos}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs opacity-95">
        <span className={num}>Chat (LLM): {custos.chat.chamadas} chamadas, {custos.chat.tokens.toLocaleString("pt-BR")} tokens</span>
        <span className={num}>Jev: US$ {usd}</span>
        <span className="opacity-85">(tokens de chat e dólar do Jev são medidas separadas)</span>
      </div>
    </section>
  );
}
