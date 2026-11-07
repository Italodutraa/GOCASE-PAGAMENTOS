// CONTRATO de entrada dos especialistas. Dono: LÍDER.
import type { EstadoTitulo } from "@/lib/rules/tipos";
import type { ContextoTool, RegistroTools } from "./tools";
import type { Acao, Especialista, Parecer, TraceEvento } from "./types";

/** Comunicação já higienizada: corpo só entra se NÃO houver sinal de instrução ao agente. */
export interface ComunicacaoCaso {
  id: string;
  data_hora: string;
  canal: string;
  remetente: string;
  via: string; // oficial | mesmo_dominio | dominio_parecido | nao_oficial | desconhecido
  sinais: string[];
  assunto: string;
  corpo?: string; // ausente quando há injecao_instrucao
}

export interface JevCaso {
  decisao: string; // manter_no_lote | retirar_do_lote | corrigir_lancamento | escalar_aprovacao
  confianca: number;
  riscoFraude: number;
  urgencia: number;
}

/** Um caso = títulos agrupados por fornecedor (e tipo de problema). */
export interface CasoEntrada {
  id: string;
  tipo: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  categoria: string;
  titulos: EstadoTitulo[]; // com achados do Passo A (fatos)
  piso: Acao; // ação mais forte entre os títulos (vocabulário curto)
  comunicacoes: ComunicacaoCaso[];
  jev?: JevCaso;
  especialistas: Especialista[]; // quem deve rodar
}

export interface DepsEspecialista {
  registro: RegistroTools;
  ctxTool: ContextoTool;
  emit: (ev: TraceEvento) => void;
  /** política aplicada ao parecer (null = aceito) */
  validar: (p: Parecer) => string | null;
  model?: string;
}

export interface ResultadoEspecialista {
  parecer: Parecer | null;
  erro?: string;
  rejeicoes: number;
  chamadas: number;
}

export type FnEspecialista = (caso: CasoEntrada, deps: DepsEspecialista) => Promise<ResultadoEspecialista>;
