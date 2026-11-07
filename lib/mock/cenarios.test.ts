import { afterEach, describe, expect, it } from "vitest";
import { montarStore } from "@/lib/data/store";
import { CENARIOS, resetCenarios, type NomeCenario } from "./cenarios";
import { responderFornecedor } from "./fornecedores_sim";
import { analisarAgenda } from "@/lib/rules/engine";

const nomes = Object.keys(CENARIOS) as NomeCenario[];

describe("cenários injetados", () => {
  afterEach(() => resetCenarios());

  for (const nome of nomes) {
    it(`${nome}: gera caso com títulos e mantém a agenda original`, () => {
      const s = montarStore();
      const antes = s.agenda.length;
      expect(antes).toBe(876);
      const { entrada, eventoInicial } = CENARIOS[nome](s);
      expect(entrada.titulos.length).toBeGreaterThan(0);
      expect(entrada.especialistas.length).toBeGreaterThan(0);
      expect(eventoInicial).toContain("SIMULADO");
      expect(s.agenda.length).toBe(antes + 1);
      expect(s.agenda.some((a) => a.titulo_id === "TP426904")).toBe(true);
      // reaplicar é idempotente
      CENARIOS[nome](s);
      expect(s.agenda.length).toBe(antes + 1);
      // o título novo existe na análise completa
      const r = analisarAgenda(s);
      expect(r.estados.length).toBe(antes + 1);
    });
  }

  it("troca_conta: título bloqueado por troca bancária sem confirmação e fornecedor nega", () => {
    const s = montarStore();
    const { entrada } = CENARIOS.troca_conta_fornecedor_novo(s);
    const t = entrada.titulos.find((x) => x.titulo_id === "TP499001")!;
    expect(t.achados.some((a) => a.tipo === "TROCA_BANCARIA_SUSPEITA")).toBe(true);
    expect(entrada.piso).toBe("escalar");
    expect(responderFornecedor("FP5940", "trocou a conta?", s).confirma).toBe(false);
  });

  it("cnpj_clonado: entra forçado com piso manter e o clone confirma", () => {
    const s = montarStore();
    const { entrada } = CENARIOS.cnpj_clonado(s);
    expect(entrada.especialistas).toEqual(["cadastro_fraude", "compras"]);
    expect(entrada.titulos[0].valor).toBe(87400);
    expect(entrada.piso).toBe("manter");
    expect(responderFornecedor("FP9901", "confirma?", s).confirma).toBe(true);
    expect(s.fornecedoresPorRaiz.get("48213907")?.length).toBe(1);
  });

  it("injecao_prompt_v2: piso corrigir e nenhum campo do caso carrega a ordem", () => {
    const s = montarStore();
    const { entrada } = CENARIOS.injecao_prompt_v2(s);
    expect(entrada.piso).toBe("corrigir");
    const json = JSON.stringify(entrada);
    expect(json).not.toContain("OVERRIDE");
    expect(json).not.toMatch(/authorized by the board/i);
    const c = entrada.comunicacoes.find((x) => x.id === "EM599003")!;
    expect(c.sinais).toContain("injecao_instrucao");
    expect(c.corpo).toBeUndefined();
  });
});
