// F1: um placar só. A ablação (so_regras e hibrido) tem de bater com o placar do runner, e nenhum título fica "na_fila".
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/proxy", () => ({
  chat: vi.fn(async () => {
    throw new Error("teste não chama o proxy");
  }),
  jev: vi.fn(async () => {
    throw new Error("teste não chama o proxy");
  }),
}));

import { executarAblacao } from "./ablacao";
import { estadoRunner, placar, view } from "@/lib/orquestrador/runner";

beforeAll(() => {
  delete process.env.AI_PROXY_API_KEY; // replay puro
});

describe("placar único (runner = ablação)", () => {
  for (const config of ["so_regras", "hibrido"] as const) {
    it(`${config}: placar da ablação == placar do runner e todos os cortes processados`, async () => {
      const s = await executarAblacao({ so: config, modo: "replay" });
      const r = s.resultados.find((x) => x.config === config)!;
      const p = placar(estadoRunner());
      expect(r.placar).toBe(p.comSistema);
      expect(r.indevidoEvitado).toBe(p.indevidoEvitado);
      expect(view().titulos.filter((t) => t.situacao === "na_fila")).toHaveLength(0);
    }, 120_000);
  }
});
