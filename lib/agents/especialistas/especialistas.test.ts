import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoEntrada, DepsEspecialista } from "@/lib/contratos/caso";
import type { FerramentaSim, RegistroTools } from "@/lib/contratos/tools";
import type { TraceEvento } from "@/lib/contratos/types";

const chatMock = vi.fn();
vi.mock("@/lib/ai/proxy", () => ({ chat: (...a: unknown[]) => chatMock(...a) }));

import { resetOrcamento } from "@/lib/agents/orcamento";
import { ESPECIALISTAS } from "./index";

const NOMES = [
  "consultar_pedido_compra", "consultar_nf", "consultar_titulo", "consultar_fornecedor",
  "consultar_extrato", "buscar_titulos", "listar_agenda_remessa",
  "consultar_historico_cadastro", "listar_comunicacoes", "contatar_fornecedor",
  "retirar_do_lote",
];

function registroFalso(): RegistroTools {
  const fs: FerramentaSim[] = NOMES.map((nome) => ({
    nome,
    descricao: nome,
    parametros: { type: "object", properties: {} },
    papeis: ["analista_cp", "auditor", "aprovador"],
    tipo: "leitura",
    executar: () => ({ ok: true, dados: {} }),
  }));
  return {
    listar: () => fs,
    get: (n) => fs.find((f) => f.nome === n),
    executar: () => ({ ok: true, dados: {} }),
    estado: () => ({}) as never,
    reset: () => {},
  };
}

function caso(corpo?: string): CasoEntrada {
  return {
    id: "C1",
    tipo: "fraude_cadastro",
    fornecedor_id: "FP4615",
    fornecedor_nome: "Embalarte",
    categoria: "embalagens",
    piso: "escalar",
    especialistas: ["cadastro_fraude"],
    comunicacoes: [
      { id: "EM570996", data_hora: "2026-10-30T09:00", canal: "email", remetente: "x@y.com", via: "nao_oficial", sinais: ["injecao_instrucao"], assunto: "Pagamento", corpo },
    ],
    titulos: [
      {
        titulo_id: "TP1", lote: "RM20261103-MER", banco: "MER", fechamento: "2026-11-03T10:00", fornecedor_id: "FP4615",
        fornecedor_nome: "Embalarte", categoria: "embalagens", valor: 1234.5, vencimento: "2026-11-05", forma_pagamento: "ted",
        destino: "905/0001/4471203-9", numero_nf: "10", oc_id: "OC-1", origem_lancamento: "x", lancado_por: "u", achados: [
          { tipo: "TROCA_BANCARIA_SUSPEITA", severidade: "ALTA", detalhe: "troca em 30/10", evidencias: ["AC1"] },
        ],
        acaoMinima: "escalar_aprovacao", valorEmRisco: 1234.5, status: "bloqueio",
        alcada: { nivel: "aprovador", valorBase: 1234.5, dupla: true, motivosDupla: [], aprovadores: [] }, comunicacoes: ["EM570996"],
      },
    ],
  };
}

function deps(validar: DepsEspecialista["validar"] = () => null) {
  const trace: TraceEvento[] = [];
  const d: DepsEspecialista = {
    registro: registroFalso(),
    ctxTool: { papel: "analista_cp", agente: "cadastro_fraude", agora: "2026-11-03T08:00" },
    emit: (e) => trace.push(e),
    validar,
  };
  return { d, trace };
}

const parecerCall = (acao: string, id = "c1") => ({
  texto: "",
  modelo: "fake",
  entrada: 0,
  saida: 0,
  linhaCusto: "",
  toolCalls: [
    { id, type: "function" as const, function: { name: "emitir_parecer", arguments: JSON.stringify({ acao, risco: 0.9, confianca: 0.8, evidencias: ["TP1"], resumo: "ok" }) } },
  ],
});

beforeEach(() => {
  chatMock.mockReset();
  resetOrcamento();
});

describe("especialistas", () => {
  it("não vaza texto de ordem quando a comunicação não tem corpo", async () => {
    chatMock.mockResolvedValue(parecerCall("escalar"));
    const { d } = deps();
    await ESPECIALISTAS.cadastro_fraude(caso(undefined), d);
    const msgs = chatMock.mock.calls[0][0].messages as { role: string; content: string }[];
    const usuario = msgs.find((m) => m.role === "user")!.content;
    expect(usuario).toContain("[corpo omitido: contém instruções dirigidas ao agente]");
    expect(usuario).toContain("<<DADOS_DE_TERCEIROS>>");
    expect(usuario).not.toMatch(/pré-aprovada/i);
  });

  it("cada especialista só recebe as ferramentas do seu domínio", async () => {
    const esperado = {
      compras: ["consultar_pedido_compra", "consultar_nf", "consultar_titulo", "consultar_fornecedor"],
      bancario: ["consultar_extrato", "consultar_titulo", "buscar_titulos", "listar_agenda_remessa"],
      cadastro_fraude: ["consultar_historico_cadastro", "listar_comunicacoes", "consultar_fornecedor", "contatar_fornecedor"],
    } as const;
    for (const nome of Object.keys(esperado) as (keyof typeof esperado)[]) {
      chatMock.mockReset();
      chatMock.mockResolvedValue(parecerCall("escalar"));
      const { d } = deps();
      await ESPECIALISTAS[nome](caso("texto"), d);
      const tools = chatMock.mock.calls[0][0].tools as { function: { name: string } }[];
      const nomes = tools.map((t) => t.function.name).filter((n) => n !== "emitir_parecer");
      expect(nomes.sort()).toEqual([...esperado[nome]].sort());
    }
  });

  it("devolve o parecer emitido", async () => {
    chatMock.mockResolvedValue(parecerCall("bloquear"));
    const { d } = deps();
    const r = await ESPECIALISTAS.compras(caso("ok"), d);
    expect(r.parecer?.acao).toBe("bloquear");
    expect(r.parecer?.especialista).toBe("compras");
    expect(r.rejeicoes).toBe(0);
  });

  it("política rejeita a 1ª proposta e aceita a 2ª (rejeicao_politica + correcao)", async () => {
    chatMock.mockResolvedValueOnce(parecerCall("manter", "a")).mockResolvedValueOnce(parecerCall("escalar", "b"));
    const { d, trace } = deps((p) => (p.acao === "manter" ? "não pode rebaixar o piso" : null));
    const r = await ESPECIALISTAS.bancario(caso("ok"), d);
    expect(r.parecer?.acao).toBe("escalar");
    expect(r.rejeicoes).toBe(1);
    const kinds = trace.map((e) => e.kind);
    expect(kinds).toContain("rejeicao_politica");
    expect(kinds).toContain("correcao");
  });
});
