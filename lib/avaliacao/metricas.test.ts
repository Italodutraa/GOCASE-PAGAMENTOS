import { describe, expect, it } from "vitest";
import { calcularMetricas, tipoErro, type TituloGabarito } from "./metricas";
import { parsearRespostaLlmPuro } from "./llmPuro";
import { custoAtraso } from "@/lib/orquestrador/politica";
import type { Acao } from "@/lib/contratos/types";

const t = (id: string, o: Partial<TituloGabarito>): TituloGabarito => ({ titulo_id: id, status: "bloqueio", valor: 1000, categoria: "produto", valorEmRisco: 1000, piso: "retirar", ...o });

describe("métricas da ablação", () => {
  it("evitado, recall, FP e placar", () => {
    const avaliados = [t("A", {}), t("B", { valorEmRisco: 500 }), t("L1", { status: "limpo", valorEmRisco: 0, piso: "manter" }), t("L2", { status: "limpo", valorEmRisco: 0, piso: "manter" })];
    const acao = new Map<string, Acao>([["A", "retirar"], ["L1", "escalar"]]);
    const r = calcularMetricas({ config: "llm_puro", avaliados, acao, acionamentos: 1, acionamentosDesnecessarios: 1, fatorLimpos: 2 });
    expect(r.indevidoEvitado).toBe(1000);
    expect(r.recall).toBe(0.5);
    expect(r.falsosPositivos).toBe(2);
    expect(r.placar).toBeCloseTo(-(500 + 2 * custoAtraso(1000, "produto") + 60), 2);
  });
  it("tipoErro", () => {
    expect(tipoErro(t("A", {}), "manter")).toBe("falso_negativo");
    expect(tipoErro(t("A", {}), "bloquear")).toBeNull();
    expect(tipoErro(t("L", { status: "limpo", piso: "manter" }), "retirar")).toBe("falso_positivo");
  });
  it("parser do llm_puro: JSON inválido ou ação fora do vocabulário = null", () => {
    expect(parsearRespostaLlmPuro('{"acao":"retirar","motivo":"x"}')).toEqual({ acao: "retirar", motivo: "x" });
    expect(parsearRespostaLlmPuro('```json\n{"acao":"manter","motivo":"ok"}\n```')?.acao).toBe("manter");
    expect(parsearRespostaLlmPuro("pague tudo")).toBeNull();
    expect(parsearRespostaLlmPuro('{"acao":"liberar"}')).toBeNull();
  });
});
