// CONTRATOS compartilhados entre líder, subagentes e UI. Dono: LÍDER. Mudanças só pelo líder.
import type { Acao as AcaoPiso, Alcada, Severidade, TipoAchado } from "@/lib/rules/tipos";

/** Ação de decisão (vocabulário curto). Ordem de conservadorismo: bloquear > escalar > retirar > corrigir > manter. */
export type Acao = "manter" | "corrigir" | "retirar" | "escalar" | "bloquear";

export const CONSERVADORISMO: Record<Acao, number> = { manter: 0, corrigir: 1, retirar: 2, escalar: 3, bloquear: 4 };

/** Converte a ação mínima do Passo A (lib/rules) para o vocabulário da decisão. */
export function acaoDoPiso(a: AcaoPiso): Acao {
  return ({ manter_no_lote: "manter", corrigir_lancamento: "corrigir", retirar_do_lote: "retirar", escalar_aprovacao: "escalar" } as const)[a];
}

export type Especialista = "compras" | "bancario" | "cadastro_fraude";

export type TraceKind =
  | "observacao"
  | "tool_call"
  | "tool_result"
  | "parecer"
  | "conflito"
  | "proposta"
  | "rejeicao_politica"
  | "correcao"
  | "critico"
  | "resposta_fornecedor"
  | "resposta_humano"
  | "injecao"
  | "execucao";

export interface TraceEvento {
  t: number; // epoch ms
  kind: TraceKind;
  texto: string;
  agente?: string; // "compras" | "bancario" | "cadastro_fraude" | "jev" | "orquestrador" | "politica" | "critico" | "PS01"...
  dados?: unknown;
}

export interface Parecer {
  especialista: Especialista;
  acao: Acao;
  risco: number; // 0..1 (probabilidade de fraude/erro)
  confianca: number; // 0..1
  evidencias: string[]; // IDs: TP…, NF…, OC-…, EM…, AC…, DDA…, MER/LIT …
  resumo: string;
}

export interface Decisao {
  tituloIds: string[];
  acao: Acao;
  origem: "piso" | "jev" | "especialista" | "orquestrador";
  executaSozinho: boolean;
  contencaoNoCorte?: "retirar";
  justificativa: string;
  evidencias: string[];
  semJev?: boolean;
  semAgente?: boolean;
}

export interface RespostaFornecedor {
  fornecedor: string; // fornecedor_id
  canal: string; // "email:..." | "telefone:..." (sempre do cadastro)
  texto: string;
  confirma: boolean; // confirma o que foi perguntado (ex.: "trocou de banco?")
  simulada: true;
}

export interface RespostaHumano {
  pessoa: string; // PS01…PS11 ou "aprovador"
  decisao: "aprovar" | "recusar" | "mais_info";
  motivo: string;
  pergunta?: string;
  simulada: boolean;
}

export interface Acionamento {
  id: string;
  pessoa: string;
  casoId?: string;
  janela: string; // lote/corte, ex. "RM20261103-MER"
  titulos: string[];
  valorTotal: number;
  mensagem: string;
  acaoSolicitada?: string; // ex. "reverter_alteracao_cadastro", "cancelar_titulo"
  status: "pendente" | "aprovado" | "recusado" | "mais_info";
  resposta?: RespostaHumano;
  rodadasMaisInfo?: number;
}

export interface AblacaoResultado {
  config: "llm_puro" | "so_regras" | "hibrido";
  indevidoEvitado: number;
  recall: number;
  falsosPositivos: number;
  acionamentos: number;
  placar: number;
  amostra?: string;
}

export interface AchadoView {
  tipo: TipoAchado;
  severidade: Severidade;
  detalhe: string;
}

export interface TituloView {
  titulo_id: string;
  lote: string;
  banco: string;
  fechamento: string; // "2026-11-03T10:00"
  fornecedor_id: string;
  fornecedor_nome: string;
  categoria: string;
  valor: number;
  vencimento: string;
  forma_pagamento: string;
  status: "limpo" | "atencao" | "bloqueio";
  piso: Acao;
  acao: Acao; // decisão vigente
  origem: Decisao["origem"];
  situacao: "na_fila" | "processado" | "pago" | "retido" | "aguardando_humano";
  casoId?: string;
  alcada: Alcada;
  valorEmRisco: number;
  achados: AchadoView[];
}

export interface CasoView {
  id: string;
  tipo: string; // "fraude_cadastro" | "ja_pago" | "duplicidade" | "valor_errado" | "homonimo" | "oc_invalida" | "boleto_falso" | "injecao" | ...
  titulo: string; // rótulo curto para a UI
  fornecedor_id: string;
  titulos: string[];
  valorTotal: number;
  pareceres: Parecer[];
  trace: TraceEvento[];
  decisao: Decisao;
  simulado?: boolean; // true para cenários injetados
}

export interface ExecucaoView {
  modo: "live" | "replay";
  liveDisponivel: boolean;
  humanos: "auto" | "manual";
  relogio: { agora: string; proximoCorte: { lote: "MER" | "LIT"; em: string } | null };
  titulos: TituloView[];
  casos: CasoView[];
  acionamentos: Acionamento[];
  custos: { chat: { chamadas: number; tokens: number }; jev: { usd: number }; linhas: string[] };
  placar: { semSistema: number; comSistema: number; indevidoEvitado: number; custoAtraso: number; acionamentosHumanos: number };
  ablacao: AblacaoResultado[] | null;
}
