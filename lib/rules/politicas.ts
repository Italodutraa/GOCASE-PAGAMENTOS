// Parâmetros de política. Valores numéricos lidos de politicas.csv (secao,regra,valor);
// tolerâncias que no CSV estão em texto livre ficam aqui como constantes documentadas.
import type { Linha } from "@/lib/data/loader";

export const REFERENCIA = new Date("2026-11-02T08:00:00");
export const FIM_SIMULACAO = new Date("2026-11-09T08:00:00");
export const JANELA_TROCA_DIAS = 30;

// tres_vias (texto em politicas.csv)
export const TOL_OC_PCT = 0.02;
export const TOL_OC_MIN = 50;
export const TOL_TITULO_DUP = 0.1;
export const MULTA = 0.02;
export const JUROS_MES = 0.01;

export interface Politicas {
  analistaAte: number;
  aprovadorAte: number;
  multa: number;
  jurosMes: number;
  custoRelacionamento: Record<string, number>;
  custoAcionamento: number;
}

export function lerPoliticas(linhas: Linha[]): Politicas {
  const v = (secao: string, regra: string) => linhas.find((l) => l.secao === secao && l.regra === regra)?.valor;
  const n = (secao: string, regra: string, padrao: number) => {
    const x = Number(v(secao, regra));
    return Number.isFinite(x) ? x : padrao;
  };
  const custoRelacionamento: Record<string, number> = {};
  for (const l of linhas) {
    const m = /^custo_de_relacionamento_por_titulo_atrasado\.(.+)$/.exec(l.regra);
    if (l.secao === "atraso" && m) custoRelacionamento[m[1]] = Number(l.valor);
  }
  return {
    analistaAte: n("alcadas", "analista_cp.liberar_ou_agendar_ate", 5000),
    aprovadorAte: n("alcadas", "aprovador.aprova_ate", 50000),
    multa: n("atraso", "multa", MULTA),
    jurosMes: n("atraso", "juros_ao_mes", JUROS_MES),
    custoRelacionamento,
    custoAcionamento: n("acionamento_humano", "custo_por_acionamento_desnecessario", 60),
  };
}
