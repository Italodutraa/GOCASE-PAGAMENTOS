// Orçamento global de chamadas de chat por execução (protege o token compartilhado do evento).
export const LIMITE_CHAT_POR_EXECUCAO = 600;

const g = globalThis as unknown as { __orcamentoChat?: { usadas: number } };
const estado = (g.__orcamentoChat ??= { usadas: 0 });

export function consumirChamada(): boolean {
  if (estado.usadas >= LIMITE_CHAT_POR_EXECUCAO) return false;
  estado.usadas++;
  return true;
}
export const chamadasUsadas = () => estado.usadas;
export function resetOrcamento() {
  estado.usadas = 0;
}
