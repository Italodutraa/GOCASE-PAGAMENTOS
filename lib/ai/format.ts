// Formatadores puros das linhas de custo (Regra 2 do AI Proxy). Sem dependências.

const tok = (n: number) => Math.round(n).toLocaleString("pt-BR");
const usd = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 7, useGrouping: false });

/** 💲 <model> · entrada X tok · saída Y tok · sem preço por chamada | sessão: N chamadas, Total tok */
export function linhaChat(model: string, entrada: number, saida: number, sessaoChamadas: number, sessaoTokens: number, raciocinio?: number) {
  const r = raciocinio ? ` (raciocínio ${tok(raciocinio)})` : "";
  return `💲 ${model} · entrada ${tok(entrada)} tok · saída ${tok(saida)} tok${r} · sem preço por chamada | sessão: ${sessaoChamadas} chamadas, ${tok(sessaoTokens)} tok`;
}

/** 💲 <model> · entrada X tok · US$ Y | sessão: US$ Total */
export function linhaJev(model: string, entrada: number, custoUsd: number, sessaoUsd: number) {
  return `💲 ${model} · entrada ${tok(entrada)} tok · US$ ${usd(custoUsd)} | sessão: US$ ${usd(sessaoUsd)}`;
}

export const MODELO_BLOQUEADO = /^deepseek/i;
