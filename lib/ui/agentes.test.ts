import { describe, expect, it } from "vitest";
import { AGENTE_DO_ESPECIALISTA, AGENTES, agenteDoEvento, ehHumano, ELENCO, TODOS_KINDS } from "./agentes";

const IDS = ["radar", "confere", "caixa", "faro", "maestro", "cerca", "lupa"];

describe("mapa de avatares dos agentes", () => {
  it("cobre exatamente os 7 ids, com nome, papel e cor de reserva", () => {
    expect(Object.keys(AGENTES).sort()).toEqual([...IDS].sort());
    expect([...ELENCO].sort()).toEqual([...IDS].sort());
    for (const a of Object.values(AGENTES)) {
      expect(a.nome.length).toBeGreaterThan(0);
      expect(a.papel.length).toBeGreaterThan(0);
      expect(a.cor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("cada kind do trace resolve para um agente existente, com ou sem emissor", () => {
    const emissores = [undefined, "jev", "compras", "bancario", "cadastro_fraude", "orquestrador", "politica", "critico", "passo_a", "runner", "PS01", "aprovador", "desconhecido"];
    for (const kind of TODOS_KINDS) for (const agente of emissores) expect(IDS).toContain(agenteDoEvento({ kind, agente }));
  });

  it("segue o mapeamento pedido", () => {
    expect(AGENTE_DO_ESPECIALISTA).toEqual({ compras: "confere", bancario: "caixa", cadastro_fraude: "faro" });
    expect(agenteDoEvento({ kind: "parecer", agente: "bancario" })).toBe("caixa");
    expect(agenteDoEvento({ kind: "conflito", agente: "orquestrador" })).toBe("maestro");
    expect(agenteDoEvento({ kind: "rejeicao_politica", agente: "compras" })).toBe("cerca");
    expect(agenteDoEvento({ kind: "correcao", agente: "cadastro_fraude" })).toBe("cerca");
    expect(agenteDoEvento({ kind: "critico", agente: "critico" })).toBe("lupa");
    expect(agenteDoEvento({ kind: "observacao", agente: "jev" })).toBe("radar");
  });

  it("humanos simulados são reconhecidos (não usam imagem de agente)", () => {
    expect(ehHumano("PS01")).toBe(true);
    expect(ehHumano("aprovador")).toBe(true);
    expect(ehHumano("compras")).toBe(false);
  });
});
