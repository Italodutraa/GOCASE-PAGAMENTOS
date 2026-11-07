"use client";
// Tela /hoje: o que é, o que precisa de decisão e quanto tempo há. Só apresentação; os dados vêm de derivarHoje(view).
import Link from "next/link";
import { useState } from "react";
import type { CasoView, ExecucaoView } from "@/lib/contratos/types";
import { type CartaoHoje, derivarHoje, emMilhoes } from "@/lib/ui/hoje";
import { PESSOAS } from "./Avatar";
import { Pareceres } from "./Pareceres";
import { Timeline } from "./Timeline";
import { brl, num, SeloSimulado } from "./ui";

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

const LIMITE_CARTOES = 25;

function Cartao({ c, caso, ocupado, onAcao }: { c: CartaoHoje; caso?: CasoView; ocupado: boolean; onAcao: HojeProps["onAcao"] }) {
  const [aberta, setAberta] = useState(false);
  const btn = `rounded-full px-4 py-2 text-sm font-bold disabled:opacity-60 ${transicao}`;
  return (
    <li className="rounded-2xl border-2 border-[#2659a5] bg-white p-4 text-[#2659a5]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h3 className="min-w-0 flex-1 text-base font-bold [overflow-wrap:anywhere]">{c.quem}</h3>
        <p className={`text-xl font-extrabold ${num}`}>{brl(c.valor)}</p>
      </div>
      <p className="mt-1 text-sm">{c.porque}</p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline font-bold">Pede: </dt><dd className="inline">{c.pedido}</dd></div>
        <div><dt className="inline font-bold">Quem decide: </dt><dd className="inline [overflow-wrap:anywhere]">{c.pedidoA}</dd></div>
        <div><dt className="inline font-bold">Prazo: </dt><dd className={`inline ${num}`}>{c.prazo}</dd></div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={ocupado} onClick={() => onAcao(c.id, "aprovar")} className={`${btn} bg-[#2659a5] text-white hover:bg-[#3dbfef] hover:text-[#2659a5]`}>Aprovar</button>
        <button type="button" disabled={ocupado} onClick={() => onAcao(c.id, "recusar")} className={`${btn} border-2 border-[#2659a5] hover:bg-[#2659a5] hover:text-white`}>Recusar</button>
        <button type="button" disabled={ocupado} onClick={() => onAcao(c.id, "mais_info")} className={`${btn} border-2 border-[#2659a5] hover:bg-[#2659a5] hover:text-white`}>Pedir mais informação</button>
      </div>
      {caso && (
        <div className="mt-3 border-t border-[#2659a5]/20 pt-2">
          <button type="button" aria-expanded={aberta} onClick={() => setAberta((a) => !a)} className={`text-sm font-bold underline-offset-2 hover:underline ${transicao}`}>
            {aberta ? "Esconder como o GoLastro chegou nisso" : "Ver como o GoLastro chegou nisso"}
          </button>
          {aberta && (
            <div className="mt-2 space-y-3">
              <Pareceres pareceres={caso.pareceres} />
              <Timeline trace={caso.trace} />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function PrecisaDeVoce({ view, cartoes, ocupado, onAcao }: { view: ExecucaoView; cartoes: CartaoHoje[]; ocupado: boolean; onAcao: HojeProps["onAcao"] }) {
  const [todos, setTodos] = useState(false);
  const visiveis = todos ? cartoes : cartoes.slice(0, LIMITE_CARTOES);
  const casos = new Map(view.casos.map((c) => [c.id, c]));
  return (
    <section aria-labelledby="precisa" className="mt-6">
      <h2 id="precisa" className="font-['Poppins',sans-serif] text-xl font-bold text-[#2659a5]">Precisa de você ({cartoes.length})</h2>
      {cartoes.length === 0 ? (
        <p className="mt-2 rounded-2xl bg-[#3dbfef]/20 p-4 text-[#2659a5]">Nada precisa de você agora.</p>
      ) : (
        <>
          <ul className="mt-2 space-y-3">
            {visiveis.map((c) => (
              <Cartao key={c.id} c={c} caso={c.casoId ? casos.get(c.casoId) : undefined} ocupado={ocupado} onAcao={onAcao} />
            ))}
          </ul>
          {cartoes.length > LIMITE_CARTOES && !todos && (
            <button type="button" onClick={() => setTodos(true)} className={`mt-3 rounded-full border-2 border-[#2659a5] px-4 py-2 text-sm font-bold text-[#2659a5] hover:bg-[#2659a5] hover:text-white ${transicao}`}>
              Mostrar os outros {cartoes.length - LIMITE_CARTOES}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Resumo({ h }: { h: ReturnType<typeof derivarHoje> }) {
  const blocos: { rotulo: string; b: { qtd: number; valor: number }; cor: string }[] = [
    { rotulo: "Liberados sem ajuda", b: h.resumo.liberados, cor: "bg-[#3dbfef]/25" },
    { rotulo: "Resolvidos pelo GoLastro", b: h.resumo.resolvidos, cor: "bg-white border-2 border-[#2659a5]" },
    { rotulo: "Aguardando você", b: h.resumo.aguardando, cor: "bg-[#f8ae13]/30" },
    { rotulo: "Travados por segurança", b: h.resumo.travados, cor: "bg-[#e5381a]/15" },
  ];
  return (
    <section aria-labelledby="resumo" className="mt-8">
      <h2 id="resumo" className="font-['Poppins',sans-serif] text-xl font-bold text-[#2659a5]">Resumo do lote</h2>
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {blocos.map((x) => (
          <li key={x.rotulo} className={`rounded-2xl p-3 text-[#2659a5] ${x.cor}`}>
            <p className={`text-2xl font-extrabold ${num}`}>{x.b.qtd.toLocaleString("pt-BR")}</p>
            <p className="text-xs font-bold">{x.rotulo}</p>
            <p className={`text-xs ${num}`}>{brl(x.b.valor)}</p>
          </li>
        ))}
      </ul>
      {h.resumo.naoConferidos.qtd > 0 && (
        <p className={`mt-2 text-xs text-[#2659a5] ${num}`}>
          Ainda não conferidos: {h.resumo.naoConferidos.qtd.toLocaleString("pt-BR")} pagamentos · {brl(h.resumo.naoConferidos.valor)}
        </p>
      )}
    </section>
  );
}

function JaResolvido({ h }: { h: ReturnType<typeof derivarHoje> }) {
  return (
    <details className="mt-6 rounded-2xl border-2 border-[#2659a5]/40 bg-white p-3 text-[#2659a5]">
      <summary className="cursor-pointer text-sm font-bold">Já resolvido pelo GoLastro ({h.resumo.resolvidos.qtd.toLocaleString("pt-BR")})</summary>
      {h.resolvidos.length === 0 ? (
        <p className="mt-2 text-sm">Ainda nada. Confira o lote para ver o que o GoLastro resolve sozinho.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {h.resolvidos.map((r) => (
            <li key={r.casoId} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-[#2659a5]/15 pb-2 text-sm last:border-0">
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <strong>{r.rotulo}</strong> · {r.titulo}
              </span>
              <span className={`whitespace-nowrap ${num}`}>
                {r.qtd} {r.qtd === 1 ? "pagamento" : "pagamentos"} · {brl(r.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

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

      {h.conferiu && (
        <p role="status" className="mt-4 rounded-2xl bg-[#3dbfef]/20 p-3 text-sm font-bold text-[#2659a5]">
          Lote conferido.{" "}
          {h.cartoes.length === 0
            ? "Nada precisa de você agora."
            : `${h.cartoes.length} ${h.cartoes.length === 1 ? "pedido de decisão aguarda" : "pedidos de decisão aguardam"} você.`}
        </p>
      )}

      <PrecisaDeVoce view={view} cartoes={h.cartoes} ocupado={!!p.ocupado} onAcao={p.onAcao} />
      <Resumo h={h} />
      <JaResolvido h={h} />

      <p className="mt-6 flex items-center gap-2 text-xs text-[#2659a5]">
        <SeloSimulado texto="simulado" /> Dados fictícios; respostas de fornecedores e de aprovadores são simuladas.
      </p>
    </main>
  );
}
