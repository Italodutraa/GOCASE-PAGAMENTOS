// Utilitários visuais compartilhados.
import type { Acao } from "@/lib/contratos/types";

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const CORES_ACAO: Record<Acao, string> = {
  manter: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  corrigir: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  retirar: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  escalar: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
  bloquear: "bg-red-500/15 text-red-300 ring-red-500/30",
};

export function ChipAcao({ acao }: { acao: Acao }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ${CORES_ACAO[acao]}`}>{acao}</span>;
}

export function Semaforo({ status }: { status: "limpo" | "atencao" | "bloqueio" }) {
  const c = status === "limpo" ? "bg-emerald-400" : status === "atencao" ? "bg-amber-400" : "bg-red-500";
  return <span title={status} aria-label={status} className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${c}`} />;
}

export function SeloSimulado({ texto = "simulado" }: { texto?: string }) {
  // Mesmo estilo do carimbo SIMULADO (padronizado), sem inclinação para caber em linha.
  return <span className="inline-block rounded-sm border-2 border-dashed border-sky-400 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none tracking-[0.12em] text-sky-300 opacity-90">{texto}</span>;
}

export type TipoCarimbo =
  | "BLOQUEADO"
  | "RETIRADO DO LOTE"
  | "ESCALADO"
  | "CORRIGIDO"
  | "INJEÇÃO IGNORADA"
  | "SIMULADO"
  | "BARRADO PELA CERCA"
  | "REFEITO"
  | "LIBERADO";

const CORES_CARIMBO: Record<TipoCarimbo, string> = {
  BLOQUEADO: "border-red-400 text-red-300",
  "RETIRADO DO LOTE": "border-orange-400 text-orange-300",
  ESCALADO: "border-fuchsia-400 text-fuchsia-300",
  CORRIGIDO: "border-amber-400 text-amber-300",
  "INJEÇÃO IGNORADA": "border-orange-400 text-orange-300",
  SIMULADO: "border-sky-400 text-sky-300 border-dashed",
  "BARRADO PELA CERCA": "border-red-400 text-red-300",
  REFEITO: "border-amber-400 text-amber-300",
  LIBERADO: "border-emerald-400 text-emerald-300",
};

/** Carimbo de borracha: rótulo único e padronizado para estados de destaque. */
export function Carimbo({ tipo, grande = false, inclinado = true }: { tipo: TipoCarimbo; grande?: boolean; inclinado?: boolean }) {
  return (
    <span
      className={`inline-block select-none rounded-sm border-2 font-black uppercase leading-none tracking-[0.12em] ${CORES_CARIMBO[tipo]} ${
        grande ? "px-2.5 py-1.5 text-sm" : "px-1.5 py-1 text-[10px]"
      } ${inclinado ? "-rotate-3" : ""} opacity-90`}
    >
      {tipo}
    </span>
  );
}

export const CARIMBO_DA_ACAO: Record<Acao, TipoCarimbo> = {
  manter: "LIBERADO",
  corrigir: "CORRIGIDO",
  retirar: "RETIRADO DO LOTE",
  escalar: "ESCALADO",
  bloquear: "BLOQUEADO",
};

export const ORDEM_ACAO: Acao[] = ["manter", "corrigir", "retirar", "escalar", "bloquear"];

export const num = "tabular-nums [font-variant-numeric:tabular-nums]";

export const fmtHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
