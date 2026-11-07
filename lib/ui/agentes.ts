// Fonte única dos agentes da interface: mapa id → nome/papel/cor e derivação a partir do trace.
// Sem JSX e sem acesso a disco (testável em node). O componente visual está em components/AgenteAvatar.tsx.
import type { Especialista, TraceEvento, TraceKind } from "@/lib/contratos/types";

export type AgenteId = "radar" | "confere" | "caixa" | "faro" | "maestro" | "cerca" | "lupa";

export interface AgenteInfo {
  id: AgenteId;
  nome: string;
  papel: string;
  cor: string; // cor de reserva (paleta Gogroup)
  texto: string; // cor da inicial sobre a cor de reserva
}

export const AGENTES: Record<AgenteId, AgenteInfo> = {
  radar: { id: "radar", nome: "Radar", papel: "o Jev: triagem e risco de fraude", cor: "#3dbfef", texto: "#2659a5" },
  confere: { id: "confere", nome: "Confere", papel: "especialista de compras: OC, NF e 3 vias", cor: "#f8ae13", texto: "#2659a5" },
  faro: { id: "faro", nome: "Faro", papel: "especialista de cadastro e fraude", cor: "#e5381a", texto: "#ffffff" },
  caixa: { id: "caixa", nome: "Caixa", papel: "especialista bancário: boleto, extrato, DDA", cor: "#2659a5", texto: "#ffffff" },
  cerca: { id: "cerca", nome: "Cerca", papel: "política e guardrails: piso, alçada, papel", cor: "#e5273c", texto: "#ffffff" },
  lupa: { id: "lupa", nome: "Lupa", papel: "crítico: confere citações e totais", cor: "#d7d900", texto: "#2659a5" },
  maestro: { id: "maestro", nome: "Maestro", papel: "orquestrador: junta pareceres, vence o mais conservador", cor: "#e61782", texto: "#ffffff" },
};

/** Ordem do elenco (evita laranja, vermelho e rosa lado a lado). */
export const ELENCO: AgenteId[] = ["radar", "confere", "faro", "caixa", "cerca", "lupa", "maestro"];

export const AGENTE_DO_ESPECIALISTA: Record<Especialista, AgenteId> = { compras: "confere", bancario: "caixa", cadastro_fraude: "faro" };

const AGENTE_DO_EMISSOR: Record<string, AgenteId> = {
  ...AGENTE_DO_ESPECIALISTA,
  jev: "radar",
  orquestrador: "maestro",
  runner: "maestro",
  politica: "cerca",
  passo_a: "cerca", // o piso do Passo A é o primeiro guardrail
  critico: "lupa",
};

/** Quando o tipo do evento já define quem fala, ele vence o emissor. */
const AGENTE_DO_KIND: Partial<Record<TraceKind, AgenteId>> = {
  conflito: "maestro",
  proposta: "maestro",
  rejeicao_politica: "cerca",
  correcao: "cerca",
  critico: "lupa",
  injecao: "cerca",
};

export const TODOS_KINDS: TraceKind[] = [
  "observacao", "tool_call", "tool_result", "parecer", "conflito", "proposta", "rejeicao_politica",
  "correcao", "critico", "resposta_fornecedor", "resposta_humano", "injecao", "execucao",
];

/** Agente responsável pelo evento (sempre um dos 7). Humano e fornecedor respondem a quem os acionou. */
export function agenteDoEvento(e: Pick<TraceEvento, "kind" | "agente">): AgenteId {
  const porKind = AGENTE_DO_KIND[e.kind];
  if (porKind) return porKind;
  if (e.agente && AGENTE_DO_EMISSOR[e.agente]) return AGENTE_DO_EMISSOR[e.agente];
  if (e.kind === "resposta_fornecedor") return "faro";
  return "maestro";
}

/** Humanos simulados (PS01…PS11, aprovador) não usam avatar de agente: iniciais + selo "simulado". */
export const ehHumano = (agente?: string) => !!agente && (/^PS\d{2}$/.test(agente) || agente === "aprovador");
