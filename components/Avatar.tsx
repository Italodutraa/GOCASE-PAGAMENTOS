// Avatares dos participantes: ícones SVG inline em círculos coloridos (public/agentes/ vazio).
import type { ReactNode } from "react";

export const PESSOAS: Record<string, { nome: string; papel: string }> = {
  PS01: { nome: "Renata Paiva", papel: "coord. contas a pagar" },
  PS02: { nome: "Marcos Teles", papel: "tesoureiro" },
  PS03: { nome: "Helena Duarte", papel: "diretora" },
  PS04: { nome: "Carla Menezes", papel: "compras produto" },
  PS05: { nome: "Diego Prado", papel: "compras insumos" },
  PS06: { nome: "Bruno Sá", papel: "marketing" },
  PS07: { nome: "Fernanda Rocha", papel: "frete" },
  PS08: { nome: "Lívia Campos", papel: "jurídico" },
  PS09: { nome: "Rafael Nunes", papel: "controller" },
  PS10: { nome: "Tiago Lins", papel: "facilities" },
  PS11: { nome: "Paula Viana", papel: "TI" },
  aprovador: { nome: "Aprovador", papel: "alçada até R$ 50 mil" },
};

const P = (d: string) => <path d={d} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />;

const ICONES: Record<string, ReactNode> = {
  compras: <>{P("M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2")}<circle cx="9" cy="19" r="1.3" fill="currentColor" /><circle cx="17" cy="19" r="1.3" fill="currentColor" /></>,
  bancario: <>{P("M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z")}</>,
  cadastro_fraude: <>{P("M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z")}{P("M9 12l2 2 4-4")}</>,
  jev: <>{P("M4 18l5-6 4 3 7-9")}{P("M15 6h5v5")}</>,
  orquestrador: <><circle cx="12" cy="12" r="2.5" fill="currentColor" />{P("M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8")}</>,
  politica: <>{P("M5 21V7l2-3 2 3v14M15 21V7l2-3 2 3v14M3 10h18M3 16h18")}</>,
  critico: <>{P("M9 11l3 3 8-8")}{P("M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9")}</>,
  passo_a: <>{P("M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16")}</>,
  runner: <>{P("M12 8v4l3 2")}<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth={1.8} /></>,
  fornecedor: <>{P("M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5")}</>,
};

const CORES: Record<string, string> = {
  compras: "bg-amber-500/20 text-amber-300 ring-amber-400/40",
  bancario: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/40",
  cadastro_fraude: "bg-rose-500/20 text-rose-300 ring-rose-400/40",
  jev: "bg-violet-500/20 text-violet-300 ring-violet-400/40",
  orquestrador: "bg-sky-500/20 text-sky-300 ring-sky-400/40",
  politica: "bg-red-500/20 text-red-300 ring-red-400/40",
  critico: "bg-teal-500/20 text-teal-300 ring-teal-400/40",
  passo_a: "bg-slate-500/25 text-slate-200 ring-slate-400/40",
  runner: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
  fornecedor: "bg-zinc-500/25 text-zinc-200 ring-zinc-400/40",
  pessoa: "bg-sky-900/60 text-sky-100 ring-sky-400/40",
};

export const NOMES_AGENTE: Record<string, string> = {
  compras: "Especialista · Compras",
  bancario: "Especialista · Bancário",
  cadastro_fraude: "Especialista · Cadastro e fraude",
  jev: "Jev · triagem",
  orquestrador: "Orquestrador",
  politica: "Política (a cerca)",
  critico: "Crítico",
  passo_a: "Regras · Passo A",
  runner: "Sistema",
  fornecedor: "Fornecedor",
};

export const nomeParticipante = (id?: string) => (id ? PESSOAS[id]?.nome ?? NOMES_AGENTE[id] ?? id : "Sistema");
export const papelPessoa = (id: string) => PESSOAS[id]?.papel;

const iniciais = (nome: string) => nome.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

export function Avatar({ id, tamanho = 32 }: { id?: string; tamanho?: number }) {
  const chave = id ?? "runner";
  const pessoa = PESSOAS[chave];
  const cor = pessoa ? CORES.pessoa : CORES[chave] ?? CORES.runner;
  const icone = ICONES[chave];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-1 ${cor}`}
      style={{ width: tamanho, height: tamanho }}
    >
      {pessoa || !icone ? (
        <span className="text-[11px] font-semibold" style={{ fontSize: Math.round(tamanho * 0.36) }}>{iniciais(pessoa?.nome ?? chave)}</span>
      ) : (
        <svg viewBox="0 0 24 24" width={Math.round(tamanho * 0.58)} height={Math.round(tamanho * 0.58)}>{icone}</svg>
      )}
    </span>
  );
}
