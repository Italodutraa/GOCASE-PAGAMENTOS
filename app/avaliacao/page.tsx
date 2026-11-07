"use client";
import Link from "next/link";
import { useExecucao } from "@/components/useExecucao";
import { brl, num, Pilula } from "@/components/ui";

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
    <main className="mx-auto max-w-5xl p-4 text-[#2659a5]">
      <header className="mb-4 flex items-center justify-between rounded-2xl bg-[#2659a5] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Avaliação: ablação das 3 configurações</h1>
          <Pilula>Gogroup</Pilula>
          {exemplo && <span className="rounded-full bg-[#f8ae13] px-2.5 py-0.5 text-[11px] font-bold text-[#2659a5]">dados de exemplo</span>}
        </div>
        <Link href="/" className="rounded-full bg-[#d7d900] px-3.5 py-1 text-xs font-bold text-[#2659a5] hover:bg-[#3dbfef]">
          Voltar ao painel
        </Link>
      </header>
      {!view ? (
        <p className="text-sm">Carregando…</p>
      ) : !ab ? (
        <section className="rounded-2xl border-2 border-dashed border-[#2659a5]/40 p-6">
          <h2 className="mb-3 text-base font-bold">Ablação ainda não rodada</h2>
          <ul className="space-y-2 text-sm">
            {EXPLICA.map(([t, d]) => (
              <li key={t}>
                <strong>{t}:</strong> <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-2xl border-2 border-[#2659a5] bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#2659a5] text-left text-[11px] font-bold uppercase tracking-wide text-white">
              <tr>
                <th className="p-3">Configuração</th>
                <th className="p-3 text-right">Indevido evitado (R$)</th>
                <th className="p-3 text-right">% do indevido</th>
                <th className="p-3 text-right">Recall</th>
                <th className="p-3 text-right">Falsos positivos</th>
                <th className="p-3 text-right">Acionamentos</th>
                <th className="p-3 text-right">Placar</th>
                <th className="p-3">Amostra</th>
              </tr>
            </thead>
            <tbody>
              {ab.map((r) => {
                const total = Math.max(...ab.map((x) => x.indevidoEvitado / (x.recall || 1)), 0);
                const base = total > 0 ? r.indevidoEvitado / total : r.recall;
                return (
                  <tr key={r.config} className={`border-t border-[#2659a5]/20 ${r.config === "hibrido" ? "bg-[#d7d900]/30 font-bold" : ""}`}>
                    <td className="p-3">{NOMES[r.config]}</td>
                    <td className={`p-3 text-right ${num}`}>{brl(r.indevidoEvitado)}</td>
                    <td className={`p-3 text-right ${num}`}>{pct(base)}</td>
                    <td className={`p-3 text-right ${num}`}>{pct(r.recall)}</td>
                    <td className={`p-3 text-right ${num}`}>{r.falsosPositivos}</td>
                    <td className={`p-3 text-right ${num}`}>{r.acionamentos}</td>
                    <td className={`p-3 text-right ${num}`}>{brl(r.placar)}</td>
                    <td className="p-3 text-xs">{r.amostra ?? "876 títulos (agenda completa)"}</td>
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
