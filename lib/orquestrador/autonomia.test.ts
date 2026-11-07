import { afterEach, describe, expect, it } from "vitest";
import { extrairIdsValidos, montarUsuario } from "@/lib/agents/especialistas/comum";
import type { CasoView } from "@/lib/contratos/types";
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
    expect(h).toBe("9A4F1BC08821E340");
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

    const recibo90 = avaliarCasoAutonomia(casoView, [], 0.9, "estrita");
    expect(recibo90.efetivadoAuto).toBe(true);
    expect(recibo90.indiceSeguranca).toBeCloseTo(0.942, 4);
    expect(recibo90.statusErp).toBe("EFETIVADO_AUTO");
    expect(recibo90.codigoOcorrencia).toBe("00");
    expect(recibo90.hashAutenticacao).toBe("9A4F1BC08821E340");
    expect(recibo90.economiaHumanoBrl).toBe(60);
    expect(recibo90.custoAtrasoBrl).toBe(0);

    // Se o usuário subir o slider para 96%, o caso de 94,2% deixa de ser auto-efetivado:
    const recibo96 = avaliarCasoAutonomia(casoView, [], 0.96, "estrita");
    expect(recibo96.efetivadoAuto).toBe(false);
  });
});
