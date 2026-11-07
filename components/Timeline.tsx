import type { ReactNode } from "react";
import type { Acao, Parecer, TraceEvento } from "@/lib/contratos/types";
import { AGENTE_DO_ESPECIALISTA, AGENTES, AgenteAvatar, agenteDoEvento } from "./AgenteAvatar";
import { Avatar, nomeParticipante } from "./Avatar";
import { Carimbo, ChipAcao, num, ORDEM_ACAO, Pilula, SeloSimulado } from "./ui";

// Trace como conversa: cada agente fala com seu <AgenteAvatar>; humanos e fornecedor usam iniciais + selo simulado.
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
    <div className="rounded-2xl border-2 border-[#2659a5] bg-[#2659a5] p-3.5 text-white">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pilula>Conflito entre especialistas</Pilula>
          <span className="text-xs opacity-90">regra: vence o mais conservador</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#2659a5]">
          <AgenteAvatar id="maestro" size="sm" />
          <span>Árbitro: {AGENTES.maestro.nome}</span>
        </div>
      </div>
      {ps.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ps.map((p) => {
            const agId = AGENTE_DO_ESPECIALISTA[p.especialista];
            const ganhou = p.acao === vence;
            return (
              <div
                key={p.especialista}
                className={`rounded-xl border-2 p-2.5 text-[#2659a5] ${ganhou ? "border-[#d7d900] bg-white" : "border-white/40 bg-white/95 opacity-90"}`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <AgenteAvatar id={agId} size="sm" />
                  <span className="text-xs font-bold">{AGENTES[agId].nome}</span>
                  <span className="text-[10px] opacity-75">({p.especialista})</span>
                  {ganhou && (
                    <span className="ml-auto">
                      <Pilula>vence</Pilula>
                    </span>
                  )}
                </div>
                <div className={`flex flex-wrap items-center gap-2 text-[11px] ${num}`}>
                  <ChipAcao acao={p.acao} />
                  <span>risco {dec(p.risco)}</span>
                  <span>conf. {dec(p.confianca)}</span>
                </div>
                <p className="mt-1 line-clamp-3 text-[11px] leading-snug">{p.resumo}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm">{e.texto}</p>
      )}
      {ps.length > 0 && <p className="mt-2 text-xs opacity-90">{e.texto}</p>}
    </div>
  );
}

function Balao({ e }: { e: TraceEvento }) {
  const externo = e.kind === "resposta_fornecedor" || e.kind === "resposta_humano";
  const barrado = e.kind === "rejeicao_politica";
  const refeito = e.kind === "correcao";
  const ehCritico = e.kind === "critico";
  const ehSistema = e.agente === "runner";

  if (ehSistema) {
    return (
      <li className="flex items-center justify-center gap-2 py-1 text-xs text-[#2659a5]">
        <AgenteAvatar id="maestro" size="sm" />
        <span className="rounded-full bg-[#3dbfef]/25 px-3 py-0.5 font-medium">{e.texto}</span>
      </li>
    );
  }
  if (ehCritico) {
    return (
      <li className="flex items-center gap-2 rounded-xl border border-[#2659a5]/30 bg-[#d7d900]/35 px-3 py-1.5 text-xs text-[#2659a5]">
        <AgenteAvatar id="lupa" size="sm" />
        <span className="font-bold">{AGENTES.lupa.nome} (Crítico):</span>
        <span>{e.texto}</span>
        <span className={`ml-auto text-[11px] opacity-75 ${num}`}>{hora(e.t)}</span>
      </li>
    );
  }
  if (e.kind === "conflito") {
    return (
      <li className="flex gap-2.5">
        <AgenteAvatar id="maestro" size="md" />
        <div className="min-w-0 flex-1">
          <Cabecalho autor="orquestrador" t={e.t} />
          <CartaoConflito e={e} />
        </div>
      </li>
    );
  }

  // Rejeição da política e correção levam o avatar da Cerca; externo leva iniciais + selo simulado.
  const idAvatar = externo ? (e.kind === "resposta_fornecedor" ? "fornecedor" : e.agente) : agenteDoEvento(e);
  const autor = barrado ? "politica" : externo && e.kind === "resposta_fornecedor" ? "fornecedor" : e.agente;
  const destinatario = (barrado || refeito) && e.agente && e.agente !== "politica" ? e.agente : undefined;

  const estilo = barrado
    ? "border-2 border-[#e5273c] bg-white text-[#2659a5]"
    : refeito
      ? "border-2 border-[#f8ae13] bg-white text-[#2659a5]"
      : e.kind === "injecao"
        ? "border-2 border-[#2659a5] bg-[#d7d900] text-[#2659a5] font-medium"
        : e.kind === "proposta"
          ? "border-2 border-[#2659a5] bg-[#2659a5] text-white"
          : externo
            ? "border-2 border-[#3dbfef] bg-[#3dbfef]/20 text-[#2659a5]"
            : "border-2 border-[#2659a5]/30 bg-white text-[#2659a5]";

  return (
    <li className={`flex gap-2.5 ${externo ? "flex-row-reverse" : ""}`}>
      {externo ? <Avatar id={idAvatar} tamanho={36} /> : <AgenteAvatar id={idAvatar as ReturnType<typeof agenteDoEvento>} size="md" />}
      <div className={`min-w-0 max-w-[88%] ${externo ? "text-right" : ""}`}>
        <Cabecalho autor={autor} t={e.t} destinatario={destinatario} direita={externo}>
          {barrado && (
            <span className="inline-flex items-center gap-1">
              <AgenteAvatar id="cerca" size="sm" />
              <Carimbo tipo="BARRADO PELA CERCA" />
            </span>
          )}
          {refeito && (
            <span className="inline-flex items-center gap-1">
              <AgenteAvatar id="cerca" size="sm" />
              <Carimbo tipo="REFEITO" />
            </span>
          )}
          {e.kind === "injecao" && <Carimbo tipo="INJEÇÃO IGNORADA" />}
          {externo && <SeloSimulado texto={e.kind === "resposta_humano" ? "humano simulado" : "fornecedor simulado"} />}
        </Cabecalho>
        <div className={`inline-block rounded-2xl px-3.5 py-2.5 text-left text-sm leading-snug ${externo ? "rounded-tr-sm" : "rounded-tl-sm"} ${estilo}`}>
          {e.texto}
        </div>
      </div>
    </li>
  );
}

function Cabecalho({ autor, t, destinatario, direita, children }: { autor?: string; t: number; destinatario?: string; direita?: boolean; children?: ReactNode }) {
  return (
    <div className={`mb-1 flex flex-wrap items-center gap-2 text-[11px] text-[#2659a5] ${direita ? "justify-end" : ""}`}>
      <span className="font-bold">{nomeParticipante(autor)}</span>
      {destinatario && <span className="opacity-80">→ {nomeParticipante(destinatario)}</span>}
      <span className={`opacity-75 ${num}`}>{hora(t)}</span>
      {children}
    </div>
  );
}

export function Timeline({ trace }: { trace: TraceEvento[] }) {
  if (trace.length === 0) return <p className="text-xs text-[#2659a5]">Sem eventos de trace.</p>;
  const itens = agrupar(trace);
  return (
    <ol className="flex flex-col gap-3">
      {itens.map((it, i) => {
        if (it.tipo === "msg") return <Balao key={i} e={it.e} />;
        if (it.tipo === "ferramentas") {
          const agId = agenteDoEvento({ kind: "tool_call", agente: it.agente });
          return (
            <li key={i} className="ml-11">
              <details className="group rounded-xl border-2 border-[#2659a5]/25 bg-white px-3 py-1.5 text-xs text-[#2659a5]">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
                  <AgenteAvatar id={agId} size="sm" />
                  <span className="inline-block transition group-open:rotate-90">›</span>
                  <span>
                    {nomeParticipante(it.agente)} consultou {it.pares.length} ferramenta(s):{" "}
                    {it.pares.map((p) => p.call.split("(")[0] || (p.result ?? "").split(" ")[0]).join(", ")}
                  </span>
                </summary>
                <ul className="mt-1.5 space-y-0.5 font-mono text-[11px]">
                  {it.pares.map((p, j) => (
                    <li key={j} className="break-words">
                      {p.call} {p.result && <span className="font-bold text-[#2659a5]">→ {p.result.replace(/^\S+\s/, "")}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        }
        return (
          <li key={i} className="ml-11">
            <details className="group rounded-xl border-2 border-[#2659a5] bg-[#3dbfef]/20 px-3 py-1.5 text-xs text-[#2659a5]">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-bold">
                <AgenteAvatar id="maestro" size="sm" />
                <span className="inline-block transition group-open:rotate-90">›</span>
                <span>{it.linhas.length} ação(ões) executada(s) nas ferramentas</span>
                <Carimbo tipo="SIMULADO" inclinado={false} />
              </summary>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[11px]">
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
