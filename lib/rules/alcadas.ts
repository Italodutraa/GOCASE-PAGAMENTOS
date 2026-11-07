// Alçadas: analista até R$ 5 mil, aprovador até R$ 50 mil, diretora (PS03) acima.
// Aprovação dupla: aprovador + PS01 (≤ 50 mil) ou aprovador + PS03 (> 50 mil).
import type { Alcada } from "./tipos";

export function calcularAlcada(valorBase: number, motivosDupla: string[], analistaAte = 5000, aprovadorAte = 50000): Alcada {
  const motivos = [...new Set(motivosDupla)];
  const nivel = valorBase <= analistaAte ? "analista_cp" : valorBase <= aprovadorAte ? "aprovador" : "diretoria";
  const dupla = motivos.length > 0;
  let aprovadores: string[];
  if (dupla) aprovadores = valorBase > aprovadorAte ? ["aprovador", "PS03"] : ["aprovador", "PS01"];
  else aprovadores = nivel === "analista_cp" ? [] : nivel === "aprovador" ? ["aprovador"] : ["PS03"];
  return { nivel, valorBase, dupla, motivosDupla: motivos, aprovadores };
}
