import { afterEach, describe, expect, it } from "vitest";
import { extrairIdsValidos, montarUsuario } from "@/lib/agents/especialistas/comum";
import type { CasoView, TituloView } from "@/lib/contratos/types";
import { montarStore } from "@/lib/data/store";
import { CENARIOS, resetCenarios } from "@/lib/mock/cenarios";
import { avaliarCasoAutonomia, calcularIndiceSeguranca, gerarHashAutenticacao } from "./autonomia";

describe("Motor de Auto-Efetivação (≥90%) e Governança Zero-Trust", () => {
  afterEach(() => resetCenarios());

  it("calcula indice_seguranca = Math.min(1 - risco_fraude, confianca)", () => {
    expect(calcularIndiceSeguranca(0.058, 0.942)).toBeCloseTo(0.942, 4);
    expect(calcularIndiceSeguranca(0.2, 0.95)).toBeCloseTo(0.8, 4);
    expect(calcularIndiceSeguranca(0.02, 0.91)).toBeCloseTo(0.91, 4);
  });

  it("gera hash hexadecimal de 16 caracteres compatível com retorno_remessa.csv", () => {
    const h = gerarHashAutenticacao("caso-inj-auto_efetivacao_94:TP499004");
    expect(h).toMatch(/^[0-9A-F]{16}$/); // hash de demonstração, sem valor fixo
    expect(h).toMatch(/^[0-9A-F]{16}$/);
  });

  it("injeta e auto-efetiva o caso auto_efetivacao_94 com 94,2% de segurança no limiar 90%", () => {
    const s = montarStore();
    const inj = CENARIOS.auto_efetivacao_94(s);
    expect(inj.entrada.id).toBe("caso-inj-auto_efetivacao_94");
    expect(inj.entrada.titulos[0].titulo_id).toBe("TP499004");

    const ids = extrairIdsValidos(inj.entrada);
    expect(ids).toEqual(expect.arrayContaining(["TP499004", "FP1179", "OC-49004", "NF 990441", "DDA8809004", "EM599004"]));

    const textoPrompt = montarUsuario(inj.entrada);
    expect(textoPrompt).toContain("ids_validos_neste_caso:");
    for (const id of ["TP499004", "FP1179", "OC-49004", "NF 990441", "DDA8809004", "EM599004"]) {
      expect(textoPrompt).toContain(id);
    }

    const casoView: CasoView = {
      id: inj.entrada.id,
      tipo: "auto_cura_dda",
      titulo: "Flexcase · Auto-Cura DDA 94%",
      fornecedor_id: inj.entrada.fornecedor_id,
      titulos: ["TP499004"],
      valorTotal: 4860,
      pareceres: [
        {
          especialista: "compras",
          acao: "corrigir",
          confianca: 0.942,
          risco: 0.058,
          resumo: "3-way match confirmado",
          evidencias: ["OC-49004", "NF 990441"],
        },
        {
          especialista: "bancario",
          acao: "corrigir",
          confianca: 0.942,
          risco: 0.058,
          resumo: "DDA8809004 íntegro no Meridiano 612",
          evidencias: ["DDA8809004", "TP499004"],
        },
      ],
      decisao: {
        acao: "corrigir",
        justificativa: "Redirecionar para DDA8809004",
        executaSozinho: true,
        tituloIds: ["TP499004"],
        origem: "orquestrador",
        evidencias: ["DDA8809004", "OC-49004", "NF 990441"],
      },
      trace: [],
      simulado: true,
    };

    // auditoria final: sem os títulos do caso a delegação falha fechada; e este caso troca a linha digitável (exige aprovador)
    const recibo90 = avaliarCasoAutonomia(casoView, [], 0.9, "estrita");
    expect(recibo90.efetivadoAuto).toBe(false);
    expect(recibo90.indiceSeguranca).toBeCloseTo(0.942, 4);
    expect(recibo90.statusErp).not.toBe("EFETIVADO_AUTO");
    expect(recibo90.economiaHumanoBrl).toBe(0);

    // Se o usuário subir o slider para 96%, o caso de 94,2% deixa de ser auto-efetivado:
    const recibo96 = avaliarCasoAutonomia(casoView, [], 0.96, "estrita");
    expect(recibo96.efetivadoAuto).toBe(false);
  });
});

// Auditoria final (A2): delegação de alçada nunca efetiva o que a política manda a um humano.
describe("invariantes da delegação de alçada", () => {
  const caso = (over: Partial<CasoView> = {}): CasoView => ({
    id: "caso-x", tipo: "valor_errado", titulo: "x", fornecedor_id: "FP0001", titulos: ["TPX"], valorTotal: 1000, trace: [],
    pareceres: [{ especialista: "compras", acao: "corrigir", confianca: 0.99, risco: 0.01, resumo: "ok", evidencias: [] }],
    decisao: { acao: "corrigir", justificativa: "", executaSozinho: true, tituloIds: ["TPX"], origem: "orquestrador", evidencias: [] },
    ...over,
  });
  const titulo = (over: Record<string, unknown> = {}) =>
    ({ titulo_id: "TPX", valor: 1000, piso: "corrigir", achados: [], alcada: { nivel: "analista_cp", valorBase: 1000, dupla: false, motivosDupla: [], aprovadores: [] }, ...over }) as unknown as TituloView;

  it("caso limpo dentro do teto e com índice alto: efetiva, rotulado como delegação simulada", () => {
    const r = avaliarCasoAutonomia(caso(), [titulo()], 0.9, "estrita");
    expect(r.efetivadoAuto).toBe(true);
    expect(r.motivoGovernanca).toContain("executado sob delegação de alçada (política de autonomia)");
  });
  it("I3: acima de R$ 5 mil na Estrita e de R$ 50 mil na Expandida, nunca", () => {
    expect(avaliarCasoAutonomia(caso(), [titulo({ valor: 5000.01 })], 0.75, "estrita").efetivadoAuto).toBe(false);
    expect(avaliarCasoAutonomia(caso(), [titulo({ valor: 50000.01 })], 0.75, "expandida").efetivadoAuto).toBe(false);
  });
  it("I2: aprovação dupla, nunca", () => {
    const t = titulo({ alcada: { nivel: "analista_cp", valorBase: 1000, dupla: true, motivosDupla: ["sem NF"], aprovadores: ["aprovador", "PS01"] } });
    expect(avaliarCasoAutonomia(caso(), [t], 0.75, "expandida").efetivadoAuto).toBe(false);
  });
  it("I1/I4: piso ou decisão escalar/bloquear, risco ≥ 0,5, sinal de fraude ou tipo proibido, nunca", () => {
    expect(avaliarCasoAutonomia(caso(), [titulo({ piso: "escalar" })], 0.75, "expandida").efetivadoAuto).toBe(false);
    expect(avaliarCasoAutonomia(caso({ decisao: { ...caso().decisao, acao: "bloquear" } }), [titulo()], 0.75, "expandida").efetivadoAuto).toBe(false);
    expect(avaliarCasoAutonomia(caso({ pareceres: [{ especialista: "cadastro_fraude", acao: "corrigir", confianca: 0.99, risco: 0.6, resumo: "", evidencias: [] }] }), [titulo()], 0.3, "expandida").efetivadoAuto).toBe(false);
    expect(avaliarCasoAutonomia(caso(), [titulo({ achados: [{ tipo: "COMUNICACAO_SUSPEITA", severidade: "ALTA", detalhe: "" }] })], 0.75, "expandida").efetivadoAuto).toBe(false);
    expect(avaliarCasoAutonomia(caso({ tipo: "cnpj_clonado" }), [titulo()], 0.75, "expandida").efetivadoAuto).toBe(false);
  });
  it("sem parecer de especialista, nunca (sem confiança inventada)", () => {
    expect(avaliarCasoAutonomia(caso({ pareceres: [] }), [titulo()], 0.75, "expandida").efetivadoAuto).toBe(false);
  });
});

describe("delegação nunca troca a via de pagamento (I4)", () => {
  it("cenário auto_efetivacao_94 com seus títulos reais NÃO é efetivado (trocar linha digitável exige aprovador)", () => {
    const s = montarStore();
    const { entrada } = CENARIOS.auto_efetivacao_94(s);
    const ts = entrada.titulos.map((t) => ({ ...t, piso: "corrigir", achados: t.achados.map((a) => ({ tipo: a.tipo, severidade: a.severidade, detalhe: a.detalhe })) })) as unknown as TituloView[];
    const v = { id: entrada.id, tipo: entrada.tipo, titulo: "x", fornecedor_id: entrada.fornecedor_id, titulos: ts.map((t) => t.titulo_id), valorTotal: 4860, trace: [],
      pareceres: [{ especialista: "bancario" as const, acao: "corrigir" as const, confianca: 0.99, risco: 0.01, resumo: "", evidencias: [] }],
      decisao: { acao: "corrigir" as const, justificativa: "", executaSozinho: true, tituloIds: [], origem: "orquestrador" as const, evidencias: [] } };
    for (const modo of ["estrita", "expandida"] as const) expect(avaliarCasoAutonomia(v, ts, 0.75, modo).efetivadoAuto).toBe(false);
    resetCenarios();
  });
});
