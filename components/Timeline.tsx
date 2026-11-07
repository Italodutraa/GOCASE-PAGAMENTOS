import type { ReactNode } from "react";
import type { Acao, Parecer, TraceEvento } from "@/lib/contratos/types";
import { Avatar, nomeParticipante } from "./Avatar";
import { Carimbo, ChipAcao, num, ORDEM_ACAO } from "./ui";

// Trace como conversa: cada participante fala com avatar; ferramentas e execuções viram linhas compactas.
type Item =
  | { tipo: "msg"; e: TraceEvento }
  | { tipo: "ferramentas"; agente?: string; t: number; pares: { call: string; result?: string }[] }
  | { tipo: "execucoes"; t: number; linhas: string[] };

function agrupar(trace: TraceEvento[]): Item[] {
  const out: Item[] = [];
  for (const e of trace) {
    const ult = out[out.length - 1];
    if (e.kind === "tool_call") {
      if (ult?.tipo === "ferramentas" && ult.agente === e.agente) ult.pares.push({ call: e.texto });
      else out.push({ tipo: "ferramentas", agente: e.agente, t: e.t, pares: [{ call: e.texto }] });
    } else if (e.kind === "tool_result") {
      if (ult?.tipo === "ferramentas" && ult.agente === e.agente) {
        const aberto = [...ult.pares].reverse().find((p) => p.result === undefined);
        if (aberto) aberto.result = e.texto;
        else ult.pares.push({ call: "", result: e.texto });
      } else out.push({ tipo: "ferramentas", agente: e.agente, t: e.t, pares: [{ call: "", result: e.texto }] });
    } else if (e.kind === "execucao") {
      if (ult?.tipo === "execucoes") ult.linhas.push(e.texto);
      else out.push({ tipo: "execucoes", t: e.t, linhas: [e.texto] });
    } else out.push({ tipo: "msg", e });
  }
  return out;
}

const hora = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dec = (n: number) => n.toFixed(2).replace(".", ",");

function maisConservador(ps: Parecer[]): Acao | undefined {
  return ps.reduce<Acao | undefined>((m, p) => (m === undefined || ORDEM_ACAO.indexOf(p.acao) > ORDEM_ACAO.indexOf(m) ? p.acao : m), undefined);
}

function CartaoConflito({ e }: { e: TraceEvento }) {
  const ps = ((e.dados as { pareceres?: Parecer[] } | undefined)?.pareceres ?? []).filter((p) => p && p.especialista);
  const vence = maisConservador(ps);
  return (
    <div className="rounded-lg border border-fuchsia-400/50 bg-fuchsia-500/5 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-fuchsia-300">Conflito entre especialistas</span>
        <span className="text-[11px] opacity-60">regra: vence o mais conservador</span>
      </div>
      {ps.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {ps.map((p) => (
            <div key={p.especialista} className={`rounded-md border p-2 ${p.acao === vence ? "border-fuchsia-400/60 bg-fuchsia-500/10" : "border-white/10 opacity-80"}`}>
              <div className="mb-1 flex items-center gap-2">
                <Avatar id={p.especialista} tamanho={22} />
                <span className="text-xs font-medium">{nomeParticipante(p.especialista)}</span>
                {p.acao === vence && <span className="ml-auto text-[10px] font-bold uppercase text-fuchsia-300">vence</span>}
              </div>
              <div className={`flex items-center gap-3 text-[11px] ${num}`}>
                <ChipAcao acao={p.acao} />
                <span className="opacity-70">risco {dec(p.risco)}</span>
                <span className="opacity-70">confiança {dec(p.confianca)}</span>
              </div>
              <p className="mt-1 line-clamp-3 text-[11px] leading-snug opacity-80">{p.resumo}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">{e.texto}</p>
      )}
      {ps.length > 0 && <p className="mt-2 text-[11px] opacity-70">{e.texto}</p>}
    </div>
  );
}

function Balao({ e }: { e: TraceEvento }) {
  const externo = e.kind === "resposta_fornecedor" || e.kind === "resposta_humano";
  const barrado = e.kind === "rejeicao_politica";
  // A rejeição é a fala da política (a cerca), dirigida ao especialista que propôs.
  const autor = barrado ? "politica" : externo && e.kind === "resposta_fornecedor" ? "fornecedor" : e.agente;
  const destinatario = barrado && e.agente && e.agente !== "politica" ? e.agente : undefined;
  const sistema = e.agente === "runner" || e.kind === "critico";

  if (sistema) {
    return (
      <li className="flex items-center justify-center gap-2 py-0.5 text-[11px] opacity-60">
        <Avatar id={e.agente} tamanho={16} />
        <span>{e.texto}</span>
      </li>
    );
  }
  if (e.kind === "conflito") {
    return (
      <li className="flex gap-2">
        <Avatar id="orquestrador" />
        <div className="min-w-0 flex-1">
          <Cabecalho autor="orquestrador" t={e.t} />
          <CartaoConflito e={e} />
        </div>
      </li>
    );
  }

  const estilo = barrado
    ? "border border-red-400/50 bg-red-500/10"
    : e.kind === "correcao"
      ? "border border-amber-400/40 bg-amber-500/10"
      : e.kind === "injecao"
        ? "border border-orange-400/50 bg-orange-500/10"
        : e.kind === "parecer" || e.kind === "proposta"
          ? "bg-white/[0.07]"
          : externo
            ? "bg-sky-600/25"
            : "bg-white/[0.04]";

  return (
    <li className={`flex gap-2 ${externo ? "flex-row-reverse" : ""}`}>
      <Avatar id={autor} />
      <div className={`min-w-0 max-w-[88%] ${externo ? "text-right" : ""}`}>
        <Cabecalho autor={autor} t={e.t} destinatario={destinatario} direita={externo}>
          {barrado && <Carimbo tipo="BARRADO PELA CERCA" />}
          {e.kind === "correcao" && <Carimbo tipo="REFEITO" />}
          {e.kind === "injecao" && <Carimbo tipo="INJEÇÃO IGNORADA" />}
          {externo && <Carimbo tipo="SIMULADO" inclinado={false} />}
        </Cabecalho>
        <div className={`inline-block rounded-2xl px-3 py-2 text-left text-sm leading-snug ${externo ? "rounded-tr-sm" : "rounded-tl-sm"} ${estilo}`}>
          {e.texto}
        </div>
      </div>
    </li>
  );
}

function Cabecalho({ autor, t, destinatario, direita, children }: { autor?: string; t: number; destinatario?: string; direita?: boolean; children?: ReactNode }) {
  return (
    <div className={`mb-1 flex flex-wrap items-center gap-2 text-[11px] ${direita ? "justify-end" : ""}`}>
      <span className="font-semibold">{nomeParticipante(autor)}</span>
      {destinatario && <span className="opacity-60">→ {nomeParticipante(destinatario)}</span>}
      <span className={`opacity-50 ${num}`}>{hora(t)}</span>
      {children}
    </div>
  );
}

export function Timeline({ trace }: { trace: TraceEvento[] }) {
  if (trace.length === 0) return <p className="text-xs opacity-60">Sem eventos de trace.</p>;
  const itens = agrupar(trace);
  return (
    <ol className="flex flex-col gap-3">
      {itens.map((it, i) => {
        if (it.tipo === "msg") return <Balao key={i} e={it.e} />;
        if (it.tipo === "ferramentas")
          return (
            <li key={i} className="ml-10">
              <details className="group rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px]">
                <summary className="cursor-pointer list-none opacity-70 hover:opacity-100">
                  <span className="mr-1 inline-block transition group-open:rotate-90">›</span>
                  {nomeParticipante(it.agente)} consultou {it.pares.length} ferramenta(s): {it.pares.map((p) => p.call.split("(")[0] || (p.result ?? "").split(" ")[0]).join(", ")}
                </summary>
                <ul className="mt-1 space-y-0.5 font-mono opacity-75">
                  {it.pares.map((p, j) => (
                    <li key={j} className="break-words">
                      {p.call} {p.result && <span className="text-emerald-300/80">→ {p.result.replace(/^\S+\s/, "")}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        return (
          <li key={i} className="ml-10">
            <details className="group rounded-md border border-emerald-400/20 bg-emerald-500/5 px-2 py-1 text-[11px]">
              <summary className="flex cursor-pointer list-none items-center gap-2 opacity-80 hover:opacity-100">
                <span className="inline-block transition group-open:rotate-90">›</span>
                <span>{it.linhas.length} ação(ões) executada(s) nas ferramentas</span>
                <Carimbo tipo="SIMULADO" inclinado={false} />
              </summary>
              <ul className="mt-1 space-y-0.5 font-mono opacity-75">
                {it.linhas.map((l, j) => (
                  <li key={j} className="break-words">{l}</li>
                ))}
              </ul>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
