// Testes unitários das regras puras (sem dados reais).
import { describe, expect, it } from "vitest";
import { calcularAlcada } from "./alcadas";
import { tituloMantido } from "./duplicidade";
import { limitesTituloDuplicata, toleranciaOC } from "./tresVias";

describe("tolerâncias de 3 vias", () => {
  it("OC × NF: maior entre 2% e R$ 50", () => {
    expect(toleranciaOC(1000)).toBe(50);
    expect(toleranciaOC(10000)).toBe(200);
  });

  it("NF × título: R$ 0,10 no prazo", () => {
    const l = limitesTituloDuplicata(1000, 0);
    expect(l.min).toBeCloseTo(999.9);
    expect(l.max).toBeCloseTo(1000.1);
  });

  it("NF × título: multa 2% + juros 1% a.m. pro rata após o vencimento", () => {
    const l = limitesTituloDuplicata(1000, 30);
    expect(l.max).toBeCloseTo(1000 + 20 + 10 + 0.1);
  });
});

describe("alçadas", () => {
  it("faixas simples", () => {
    expect(calcularAlcada(5000, []).nivel).toBe("analista_cp");
    expect(calcularAlcada(5000, []).aprovadores).toEqual([]);
    expect(calcularAlcada(5000.01, []).aprovadores).toEqual(["aprovador"]);
    expect(calcularAlcada(50000.01, []).aprovadores).toEqual(["PS03"]);
  });

  it("aprovação dupla: aprovador + PS01, ou + PS03 acima de 50 mil", () => {
    expect(calcularAlcada(1000, ["sem NF"]).aprovadores).toEqual(["aprovador", "PS01"]);
    expect(calcularAlcada(96480, ["troca"]).aprovadores).toEqual(["aprovador", "PS03"]);
    expect(calcularAlcada(1000, ["a", "a"]).motivosDupla).toEqual(["a"]);
  });
});

describe("duplicidade: qual lançamento manter", () => {
  const t = (id: string, origem: string, status = "agendado") => ({ titulo_id: id, origem_lancamento: origem, status });
  it("prefere o lançado pelo XML", () => {
    expect(tituloMantido([t("TP2", "boleto_email"), t("TP9", "xml_portal")])!.titulo_id).toBe("TP9");
  });
  it("se um já foi pago, ele é o mantido", () => {
    expect(tituloMantido([t("TP1", "xml_portal"), t("TP2", "boleto_email", "pago")])!.titulo_id).toBe("TP2");
  });
});
