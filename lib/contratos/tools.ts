// CONTRATO das ferramentas simuladas (implementação: subagente tools-sim em lib/tools/).
// Espelha pagamentos/ferramentas.csv: papéis, limites e custos. Tudo SIMULADO, estado em memória.

export type Papel = "analista_cp" | "auditor" | "aprovador";

export interface ContextoTool {
  papel: Papel;
  agente: string; // quem chama: "cadastro_fraude", "orquestrador", "PS01"...
  casoId?: string;
  agora: string; // ISO da simulação
  /** aprovações já obtidas para a ação (ex.: ["aprovador","PS01"]) — exigidas por ações de aprovação dupla */
  aprovacoes?: string[];
}

export type ResultadoTool = { ok: true; dados: unknown; custoRs?: number } | { ok: false; erro: string };

export interface FerramentaSim {
  nome: string;
  descricao: string;
  /** JSON Schema dos argumentos (vai direto para o tool calling do LLM) */
  parametros: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  papeis: Papel[];
  tipo: "leitura" | "execucao" | "investigacao" | "aprovacao" | "comunicacao";
  executar(args: Record<string, unknown>, ctx: ContextoTool): ResultadoTool;
}

/** Efeitos acumulados das ferramentas de execução (lido pelo runner/placar). */
export interface EstadoSimulado {
  retirados: Record<string, string>; // titulo_id → motivo
  cancelados: Record<string, string>;
  bloqueados: Record<string, string>;
  fornecedoresBloqueados: Record<string, string>;
  correcoes: { titulo_id: string; campo: string; de: string; para: string; justificativa: string }[];
  alteracoesRevertidas: string[]; // AC…
  incidentes: { id: string; tipo: string; causa_provavel: string; titulos: string[]; descricao: string }[];
  propostasProcesso: { processo: string; descricao: string }[];
  contatos: { fornecedor_id: string; canal: string; mensagem: string; resposta: unknown }[];
  acionamentosPorDia: Record<string, number>; // "2026-11-03" → n (máx. 40)
  solicitacoes: { id: string; acao: string; parametros: unknown; aprovador_humano?: string }[];
}

export interface RegistroTools {
  listar(): FerramentaSim[];
  get(nome: string): FerramentaSim | undefined;
  /** Valida papel e limites ANTES de executar; erro explícito se violar. */
  executar(nome: string, args: Record<string, unknown>, ctx: ContextoTool): ResultadoTool;
  estado(): EstadoSimulado;
  reset(): void;
}
