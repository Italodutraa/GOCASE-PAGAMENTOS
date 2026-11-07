// Métricas da ablação (funções puras, sem I/O e sem LLM).
import { CONSERVADORISMO, type AblacaoResultado, type Acao } from "@/lib/contratos/types";
import { custoAtraso, CUSTO_ACIONAMENTO } from "@/lib/orquestrador/politica";

/** Campos do gabarito (Passo A) usados na avaliação. */
export interface TituloGabarito {
  titulo_id: string;
  status: "limpo" | "atencao" | "bloqueio";
  valor: number;
  categoria: string;
  valorEmRisco: number;
  piso: Acao;
}

export interface EntradaMetricas {
  config: AblacaoResultado["config"];
  /** títulos efetivamente avaliados pela configuração */
  avaliados: TituloGabarito[];
  /** ação da configuração por título (ausente = manter) */
  acao: Map<string, Acao>;
  /** acionamentos e acionamentos sobre títulos limpos (já escalados, se for o caso) */
  acionamentos: number;
  acionamentosDesnecessarios: number;
  /** multiplicador dos títulos limpos (extrapolação da amostra); 1 = sem amostragem */
  fatorLimpos?: number;
  amostra?: string;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function calcularMetricas(e: EntradaMetricas): AblacaoResultado {
  const f = e.fatorLimpos ?? 1;
  let evitado = 0;
  let naoEvitado = 0;
  let fp = 0;
  let custoFp = 0;
  let precisam = 0;
  let pegos = 0;
  for (const t of e.avaliados) {
    const agiu = (e.acao.get(t.titulo_id) ?? "manter") !== "manter";
    if (t.status === "limpo") {
      if (agiu) {
        fp += f;
        custoFp += custoAtraso(t.valor, t.categoria) * f;
      }
      continue;
    }
    if (t.valorEmRisco > 0) {
      if (agiu) evitado += t.valorEmRisco;
      else naoEvitado += t.valorEmRisco;
    }
    if (t.piso !== "manter") {
      precisam++;
      if (agiu) pegos++;
    }
  }
  const placar = -(naoEvitado + custoFp + CUSTO_ACIONAMENTO * e.acionamentosDesnecessarios);
  return {
    config: e.config,
    indevidoEvitado: r2(evitado),
    recall: precisam ? Math.round((pegos / precisam) * 10000) / 10000 : 0,
    falsosPositivos: Math.round(fp),
    acionamentos: Math.round(e.acionamentos),
    placar: r2(placar) + 0, // evita -0
    ...(e.amostra ? { amostra: e.amostra } : {}),
  };
}

/** Erro do LLM em relação ao gabarito: rebaixou o piso (falso negativo) ou agiu num título limpo (falso positivo). */
export function tipoErro(t: TituloGabarito, acao: Acao): "falso_negativo" | "falso_positivo" | null {
  if (t.status === "limpo") return acao !== "manter" ? "falso_positivo" : null;
  return CONSERVADORISMO[acao] < CONSERVADORISMO[t.piso] ? "falso_negativo" : null;
}
