import { describe, expect, it } from "vitest";
import { jsonMascarado, mascararContas } from "./replay";

describe("replay: mascaramento sem corromper o JSON", () => {
  it("mascara conta em texto e preserva números (timestamps)", () => {
    const s = jsonMascarado({ t: 1794062199465, valor: 96480, texto: "conta anterior 774/7166/9517944-5" });
    const o = JSON.parse(s); // regressão: o mascaramento sobre o texto inteiro gerava JSON inválido
    expect(o.t).toBe(1794062199465);
    expect(o.valor).toBe(96480);
    expect(o.texto).not.toContain("9517944-5");
  });
  it("mascararContas: conta e número longo", () => {
    expect(mascararContas("9517944-5")).toBe("…44-5");
    expect(mascararContas("chave 12345678901")).toBe("chave …8901");
  });
});
