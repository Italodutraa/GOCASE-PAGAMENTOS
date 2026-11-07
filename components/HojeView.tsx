"use client";
// Tela /hoje: o que é, o que precisa de decisão e quanto tempo há. Só apresentação; os dados vêm de derivarHoje(view).
import Link from "next/link";
import type { ExecucaoView } from "@/lib/contratos/types";
import { derivarHoje, emMilhoes } from "@/lib/ui/hoje";
import { PESSOAS } from "./Avatar";
import { num, SeloSimulado } from "./ui";

export interface HojeProps {
  view: ExecucaoView | null;
  erro: boolean;
  ocupado: string | null;
  onConferir: () => void;
  onAcao: (acionamentoId: string, decisao: "aprovar" | "recusar" | "mais_info") => void;
  onTentar: () => void;
}

const transicao = "motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out";
export const nomePessoa = (id: string) => (PESSOAS[id] ? `${PESSOAS[id].nome} · ${PESSOAS[id].papel}` : id);

export function HojeView(p: HojeProps) {
  const { view } = p;
  if (!view)
    return (
      <main className="mx-auto max-w-3xl px-4 py-10" aria-busy="true">
        <h1 className="font-['Poppins',sans-serif] text-3xl font-extrabold text-[#2659a5]">GoLastro</h1>
        <p className="mt-6 rounded-2xl bg-[#2659a5]/10 p-6 text-[#2659a5]">Carregando os pagamentos…</p>
      </main>
    );

  const h = derivarHoje(view, nomePessoa);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-['Poppins',sans-serif] text-3xl font-extrabold text-[#2659a5]">
          GoLastro <span className="ml-1 rounded-full bg-[#3dbfef]/25 px-2.5 py-0.5 align-middle text-xs font-bold">Gogroup</span>
        </h1>
        <Link href="/" className={`rounded-full border-2 border-[#2659a5] px-3 py-1 text-xs font-bold text-[#2659a5] hover:bg-[#2659a5] hover:text-white ${transicao}`}>
          Detalhes técnicos
        </Link>
      </header>

      {p.erro && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#e5381a] bg-white p-3 text-sm text-[#2659a5]">
          <span>Não consegui carregar os dados atuais. O que aparece abaixo é um exemplo.</span>
          <button type="button" onClick={p.onTentar} className={`rounded-full bg-[#2659a5] px-3 py-1 text-xs font-bold text-white hover:bg-[#3dbfef] hover:text-[#2659a5] ${transicao}`}>
            Tentar de novo
          </button>
        </div>
      )}

      <section aria-labelledby="proximo" className="mt-5 rounded-2xl bg-[#2659a5] p-5 text-white">
        {h.proximo ? (
          <>
            <p id="proximo" className="text-xs font-bold uppercase tracking-wide text-[#3dbfef]">Próximo fechamento</p>
            <p className="mt-1 text-xl font-bold [overflow-wrap:anywhere]">
              Lote das {h.proximo.hora} · {h.proximo.banco}
            </p>
            <p className={`text-sm ${num}`}>
              {h.proximo.dia}, faltam {h.proximo.faltam} <span className="opacity-80">(relógio simulado)</span>
            </p>
            <p className={`mt-3 text-sm ${num}`}>
              {h.total.qtd.toLocaleString("pt-BR")} pagamentos · {emMilhoes(h.total.valor)}
            </p>
            <button
              type="button"
              onClick={p.onConferir}
              disabled={!!p.ocupado}
              className={`mt-4 w-full rounded-full bg-[#d7d900] px-5 py-3 text-base font-bold text-[#2659a5] hover:bg-[#f8ae13] disabled:opacity-60 sm:w-auto ${transicao}`}
            >
              {p.ocupado ? "Conferindo…" : `Conferir o lote das ${h.proximo.hora}`}
            </button>
          </>
        ) : (
          <>
            <p id="proximo" className="text-xs font-bold uppercase tracking-wide text-[#3dbfef]">Fechamentos</p>
            <p className="mt-1 text-xl font-bold">Todos os lotes foram conferidos</p>
            <p className={`mt-2 text-sm ${num}`}>
              {h.total.qtd.toLocaleString("pt-BR")} pagamentos · {emMilhoes(h.total.valor)}
            </p>
          </>
        )}
      </section>

      <p className="mt-6 flex items-center gap-2 text-xs text-[#2659a5]">
        <SeloSimulado texto="simulado" /> Dados fictícios; respostas de fornecedores e de aprovadores são simuladas.
      </p>
    </main>
  );
}
