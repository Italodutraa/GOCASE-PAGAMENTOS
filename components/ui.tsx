// Utilitários visuais compartilhados — Paleta Gogroup (#2659a5, #d7d900, #3dbfef, #f8ae13, #e5381a, #e5273c, #e61782, #ffffff).
// Contraste: nunca texto branco sobre #d7d900; nunca depender só de cor.
import type { Acao } from "@/lib/contratos/types";

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const CORES_ACAO: Record<Acao, string> = {
  manter: "bg-[#3dbfef] text-[#2659a5] border-[#2659a5]",
  corrigir: "bg-[#f8ae13] text-[#2659a5] border-[#2659a5]",
  retirar: "bg-[#d7d900] text-[#2659a5] border-[#2659a5]",
  escalar: "bg-[#2659a5] text-white border-white/60",
  bloquear: "bg-[#e5381a] text-white border-white/60",
};

export function ChipAcao({ acao }: { acao: Acao }) {
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${CORES_ACAO[acao]}`}>{acao}</span>;
}

/** Rótulo em pílula amarelo-esverdeada (#d7d900) com texto azul (#2659a5), padrão Gogroup. */
export function Pilula({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-full bg-[#d7d900] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#2659a5]">{children}</span>;
}

const SEMAFORO: Record<"limpo" | "atencao" | "bloqueio", { bg: string; txt: string; rotulo: string; icone: string }> = {
  limpo: { bg: "bg-[#3dbfef]", txt: "text-[#2659a5]", rotulo: "ok", icone: "✓" },
  atencao: { bg: "bg-[#f8ae13]", txt: "text-[#2659a5]", rotulo: "atenção", icone: "!" },
  bloqueio: { bg: "bg-[#e5381a]", txt: "text-white", rotulo: "bloqueado", icone: "×" },
};

export function Semaforo({ status }: { status: "limpo" | "atencao" | "bloqueio" }) {
  const s = SEMAFORO[status];
  return (
    <span
      title={`status: ${s.rotulo}`}
      aria-label={`status: ${s.rotulo}`}
      className={`inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-black leading-none ${s.bg} ${s.txt}`}
    >
      {s.icone}
    </span>
  );
}

export function SeloSimulado({ texto = "simulado" }: { texto?: string }) {
  return (
    <span className="inline-block rounded-full border-2 border-dashed border-[#3dbfef] bg-white px-2 py-0.5 text-[10px] font-black uppercase leading-none tracking-[0.1em] text-[#2659a5]">
      {texto}
    </span>
  );
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
  BLOQUEADO: "border-[#e5381a] bg-[#e5381a] text-white",
  "RETIRADO DO LOTE": "border-[#2659a5] bg-[#d7d900] text-[#2659a5]",
  ESCALADO: "border-white bg-[#2659a5] text-white",
  CORRIGIDO: "border-[#2659a5] bg-[#f8ae13] text-[#2659a5]",
  "INJEÇÃO IGNORADA": "border-[#2659a5] bg-[#d7d900] text-[#2659a5]",
  SIMULADO: "border-[#3dbfef] border-dashed bg-white text-[#2659a5]",
  "BARRADO PELA CERCA": "border-[#e5273c] bg-[#e5273c] text-white",
  REFEITO: "border-[#2659a5] bg-[#f8ae13] text-[#2659a5]",
  LIBERADO: "border-[#2659a5] bg-[#3dbfef] text-[#2659a5]",
};

/** Carimbo padronizado para estados de destaque (paleta Gogroup). */
export function Carimbo({ tipo, grande = false, inclinado = true }: { tipo: TipoCarimbo; grande?: boolean; inclinado?: boolean }) {
  return (
    <span
      className={`inline-block select-none rounded-md border-2 font-black uppercase leading-none tracking-[0.1em] ${CORES_CARIMBO[tipo]} ${
        grande ? "px-2.5 py-1.5 text-xs" : "px-1.5 py-1 text-[10px]"
      } ${inclinado ? "-rotate-2" : ""}`}
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
