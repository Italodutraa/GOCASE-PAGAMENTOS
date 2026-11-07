// Tipos compartilhados do Passo A (fatos determinísticos).

export type Severidade = "ALTA" | "MEDIA" | "BAIXA";

/** Mesmas opções do `decisao_lote` do Jev. */
export type Acao = "manter_no_lote" | "corrigir_lancamento" | "escalar_aprovacao" | "retirar_do_lote";

/** Força da ação: o orquestrador nunca rebaixa abaixo da ação mínima do Passo A. */
export const FORCA_ACAO: Record<Acao, number> = {
  manter_no_lote: 0,
  corrigir_lancamento: 1,
  escalar_aprovacao: 2,
  retirar_do_lote: 3,
};

export type TipoAchado =
  | "INTEGRIDADE"
  | "JA_PAGO_ERP"
  | "JA_PAGO_EXTRATO"
  | "JA_PAGO_RETORNO"
  | "JA_PAGO_AVULSO"
  | "DUPLICIDADE"
  | "DUPLICIDADE_PAR_MANTIDO"
  | "CREDITO_FORNECEDOR"
  | "SEM_NF"
  | "NF_INEXISTENTE"
  | "NF_NAO_AUTORIZADA"
  | "CNPJ_DIVERGENTE"
  | "PARCELA_INEXISTENTE"
  | "NF_X_TITULO"
  | "NF_X_TITULO_ENCARGOS"
  | "SEM_OC"
  | "OC_INEXISTENTE"
  | "OC_NAO_APROVADA"
  | "OC_ENCERRADA"
  | "OC_OUTRO_FORNECEDOR"
  | "OC_X_NF"
  | "OC_DIVERGENTE_NA_NF"
  | "BOLETO_SEM_LINHA"
  | "BOLETO_X_TITULO"
  | "BOLETO_BENEFICIARIO"
  | "BOLETO_BANCO_NOVO"
  | "BOLETO_FORA_DDA"
  | "BOLETO_DDA_BAIXADO"
  | "TROCA_BANCARIA_SUSPEITA"
  | "COMUNICACAO_SUSPEITA"
  | "ANTECIPACAO"
  | "FRACIONAMENTO"
  | "RECEBIMENTO"
  | "USUARIO_DESLIGADO"
  | "CADASTRO_INATIVO";

export interface Sugestao {
  campo: string;
  valor_novo: string;
  fonte: string; // de onde veio o valor correto (NF, DDA, cadastro anterior…)
  exigeAprovador?: boolean;
}

export interface Achado {
  tipo: TipoAchado;
  severidade: Severidade;
  detalhe: string;
  /** IDs de origem: TP…, NF chave/número, OC-…, EM…, AC…, linha de extrato, DDA… */
  evidencias: string[];
  acaoMinima?: Acao;
  sugestao?: Sugestao;
  /** R$ que sairiam indevidamente se nada for feito. */
  valorEmRisco?: number;
  motivoDupla?: string;
}

export type NivelAlcada = "analista_cp" | "aprovador" | "diretoria";

export interface Alcada {
  nivel: NivelAlcada;
  valorBase: number; // valor do título ou soma do fracionamento
  dupla: boolean;
  motivosDupla: string[];
  aprovadores: string[]; // papéis/pessoas: "aprovador", "PS01", "PS03"
}

export interface EstadoTitulo {
  titulo_id: string;
  lote: string;
  banco: string;
  fechamento: string; // ISO local "2026-11-03T10:00"
  fornecedor_id: string;
  fornecedor_nome: string;
  categoria: string;
  valor: number;
  vencimento: string;
  forma_pagamento: string;
  destino: string;
  numero_nf: string;
  oc_id: string;
  origem_lancamento: string;
  lancado_por: string;
  achados: Achado[];
  acaoMinima: Acao;
  valorEmRisco: number;
  status: "limpo" | "atencao" | "bloqueio";
  alcada: Alcada;
  comunicacoes: string[]; // EM… vinculadas
}
