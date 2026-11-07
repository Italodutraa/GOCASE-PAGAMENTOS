"use client";
import Link from "next/link";
import { useExecucao } from "@/components/useExecucao";
import { brl, num } from "@/components/ui";

const NOMES = { llm_puro: "LLM puro", so_regras: "Só regras", hibrido: "Híbrido (regras + Jev + agentes)" } as const;
const EXPLICA = [
  ["LLM puro", "Só o modelo de linguagem decide, sem piso de regras determinísticas."],
  ["Só regras", "Apenas o Passo A em código (3 vias, duplicidade, extratos, alçadas), sem Jev nem agentes."],
  ["Híbrido", "Regras como piso que nunca é rebaixado, Jev na triagem e especialistas LLM sobre os casos."],
];

export default function Avaliacao() {
  const { view, exemplo } = useExecucao();
  const ab = view?.ablacao;
  const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;
  return (
    <main className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Avaliação: ablação das 3 configurações</h1>
          {exemplo && <span className="text-[11px] text-amber-300">dados de exemplo</span>}
        </div>
        <Link href="/" className="rounded-md border border-white/15 px-3 py-1 text-xs hover:bg-white/10">Voltar ao painel</Link>
      </header>
      {!view ? (
        <p className="text-sm opacity-70">Carregando…</p>
      ) : !ab ? (
        <section className="rounded-lg border border-dashed border-white/20 p-6">
          <h2 className="mb-3 text-base font-semibold">Ablação ainda não rodada</h2>
          <ul className="space-y-2 text-sm">
            {EXPLICA.map(([t, d]) => (
              <li key={t}><strong>{t}:</strong> <span className="opacity-80">{d}</span></li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-white/5 text-left text-[11px] uppercase tracking-wide opacity-70">
              <tr>
                <th className="p-2">Configuração</th>
                <th className="p-2 text-right">Indevido evitado (R$)</th>
                <th className="p-2 text-right">% do indevido</th>
                <th className="p-2 text-right">Recall</th>
                <th className="p-2 text-right">Falsos positivos</th>
                <th className="p-2 text-right">Acionamentos</th>
                <th className="p-2 text-right">Placar</th>
                <th className="p-2">Amostra</th>
              </tr>
            </thead>
            <tbody>
              {ab.map((r) => {
                const total = Math.max(...ab.map((x) => x.indevidoEvitado / (x.recall || 1)), 0);
                const base = total > 0 ? r.indevidoEvitado / total : r.recall;
                return (
                  <tr key={r.config} className={`border-t border-white/10 ${r.config === "hibrido" ? "bg-sky-500/10" : ""}`}>
                    <td className="p-2 font-medium">{NOMES[r.config]}</td>
                    <td className={`p-2 text-right ${num}`}>{brl(r.indevidoEvitado)}</td>
                    <td className={`p-2 text-right ${num}`}>{pct(base)}</td>
                    <td className={`p-2 text-right ${num}`}>{pct(r.recall)}</td>
                    <td className={`p-2 text-right ${num}`}>{r.falsosPositivos}</td>
                    <td className={`p-2 text-right ${num}`}>{r.acionamentos}</td>
                    <td className={`p-2 text-right ${num}`}>{brl(r.placar)}</td>
                    <td className="p-2 text-xs opacity-70">{r.amostra ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
