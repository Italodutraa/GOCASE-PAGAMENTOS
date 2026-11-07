import { describe, expect, it } from "vitest";
import { chaveNome, dataBRparaISO, diasEntre, levenshtein, lerLinhaDigitavel, normNF, numBR, raizCnpj, telefonesNoTexto } from "./normalize";

describe("normalizadores de chave", () => {
  it("raiz CNPJ igual com e sem pontuação, e entre matriz e filial", () => {
    expect(raizCnpj("13.030.916/0001-36")).toBe("13030916");
    expect(raizCnpj("13030916000217")).toBe("13030916");
  });

  it("número de NF sem zeros e sem série", () => {
    for (const x of ["11045", "000011045", "11045-1", "11045/1", " 11045 "]) expect(normNF(x)).toBe("11045");
    expect(normNF("")).toBe("");
  });

  it("formato do Banco Litoral", () => {
    expect(numBR("-1.234,56")).toBe(-1234.56);
    expect(dataBRparaISO("03/08/2026")).toBe("2026-08-03");
  });

  it("linha digitável: banco e valor", () => {
    const l = lerLinhaDigitavel("28995217401010503090100000967141715440002124941");
    expect(l.banco).toBe("289");
    expect(l.valor).toBe(21249.41);
  });

  it("utilitários", () => {
    expect(diasEntre("2026-10-31", "2026-11-03")).toBe(3);
    expect(levenshtein("embalartte.com.br", "embalarte.com.br")).toBe(1);
    expect(chaveNome("Polímax Plásticos Técnicos Ltda")).toBe("POLIMAX");
    expect(telefonesNoTexto("ligação para (81) 3603-3617 em 05/10")).toEqual(["8136033617"]);
  });
});
