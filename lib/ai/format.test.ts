import { describe, expect, it } from "vitest";
import { linhaChat, linhaJev, MODELO_BLOQUEADO } from "./format";

describe("linhas de custo", () => {
  it("chat no formato exato", () => {
    expect(linhaChat("gpt-6-astra", 22, 5, 1, 27)).toBe(
      "💲 gpt-6-astra · entrada 22 tok · saída 5 tok · sem preço por chamada | sessão: 1 chamadas, 27 tok",
    );
    expect(linhaChat("glm-5.3-flash", 1800, 179, 3, 1240)).toContain("sessão: 3 chamadas, 1.240 tok");
  });

  it("chat com tokens de raciocínio", () => {
    expect(linhaChat("glm-5.3-flash", 18, 179, 3, 1240, 176)).toBe(
      "💲 glm-5.3-flash · entrada 18 tok · saída 179 tok (raciocínio 176) · sem preço por chamada | sessão: 3 chamadas, 1.240 tok",
    );
  });

  it("jev no formato exato, US$ com vírgula", () => {
    expect(linhaJev("jev-1.14.0", 797, 0.0000335, 0.0000335)).toBe(
      "💲 jev-1.14.0 · entrada 797 tok · US$ 0,0000335 | sessão: US$ 0,0000335",
    );
  });

  it("bloqueia deepseek", () => {
    expect(MODELO_BLOQUEADO.test("deepseek-v4-pro")).toBe(true);
    expect(MODELO_BLOQUEADO.test("glm-5.3")).toBe(false);
  });
});
