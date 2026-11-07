import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { carregarStore } from "@/lib/data/store";
import type { ContextoTool, Papel } from "@/lib/contratos/tools";
import { criarRegistro } from "./registro";

const ctx = (papel: Papel, extra: Partial<ContextoTool> = {}): ContextoTool => ({ papel, agente: "teste", agora: "2026-11-03T08:00:00", ...extra });

let reg: ReturnType<typeof criarRegistro>;
beforeAll(() => {
  reg = criarRegistro(carregarStore());
});
beforeEach(() => reg.reset());

describe("registro de ferramentas simuladas", () => {
  it("rejeita papel inválido e ferramenta inexistente", () => {
    const r = reg.executar("bloquear_titulo", { titulo_id: "TP432130", motivo: "x" }, ctx("analista_cp"));
    expect(r.ok).toBe(false);
    expect(reg.executar("nao_existe", {}, ctx("auditor")).ok).toBe(false);
    expect(reg.executar("consultar_titulo", {}, ctx("auditor")).ok).toBe(false); // obrigatório ausente
    expect(reg.estado().bloqueados).toEqual({});
  });

  it("corrigir_lancamento de valor com diferença > 5000 exige aprovador", () => {
    const args = { titulo_id: "TP431459", campo: "valor", valor_novo: "4838.00", justificativa: "×10", evidencias: ["NF"] };
    const sem = reg.executar("corrigir_lancamento", args, ctx("analista_cp"));
    expect(sem.ok).toBe(false);
    expect(reg.estado().correcoes).toHaveLength(0);
    const com = reg.executar("corrigir_lancamento", args, ctx("analista_cp", { aprovacoes: ["aprovador"] }));
    expect(com.ok).toBe(true);
    expect(reg.estado().correcoes).toHaveLength(1);
    // campo sensível sempre exige aprovador
    const f = reg.executar("corrigir_lancamento", { titulo_id: "TP431946", campo: "fornecedor_id", valor_novo: "FP6799", justificativa: "homônimo", evidencias: ["NF"] }, ctx("analista_cp"));
    expect(f.ok).toBe(false);
  });

  it("reverter_alteracao_cadastro exige aprovação dupla", () => {
    const h = reg.executar("consultar_historico_cadastro", { fornecedor_id: "FP4615" }, ctx("auditor"));
    expect(h.ok).toBe(true);
    const ids = (h as { ok: true; dados: { trocas_bancarias: { alteracao_ids: string[] }[] } }).dados.trocas_bancarias.flatMap((t) => t.alteracao_ids);
    expect(ids.length).toBeGreaterThan(0);
    const args = { fornecedor_id: "FP4615", alteracao_id: ids.join(","), evidencias: ["EM571119"] };
    expect(reg.executar("reverter_alteracao_cadastro", args, ctx("auditor")).ok).toBe(false);
    expect(reg.executar("reverter_alteracao_cadastro", args, ctx("auditor", { aprovacoes: ["aprovador"] })).ok).toBe(false);
    expect(reg.executar("reverter_alteracao_cadastro", args, ctx("auditor", { aprovacoes: ["aprovador", "PS01"] })).ok).toBe(true);
    expect(reg.estado().alteracoesRevertidas).toEqual(ids);
  });

  it("listar_comunicacoes de FP5525 não expõe o corpo da injeção EM570996", () => {
    const store = carregarStore();
    const bruta = store.comunicacoes.find((c) => c.comunicacao_id === "EM570996")!;
    const r = reg.executar("listar_comunicacoes", { fornecedor_id: "FP5525" }, ctx("auditor"));
    expect(r.ok).toBe(true);
    const json = JSON.stringify((r as { ok: true; dados: unknown }).dados);
    expect(json).toContain("EM570996");
    expect(json).toContain("corpo omitido");
    expect(json).not.toContain(bruta.texto.slice(0, 80));
    expect(json).not.toContain(bruta.texto.slice(-60));
  });

  it("consultar_fornecedor mascara conta e pix", () => {
    const store = carregarStore();
    const f = store.fornecedor.get("FP4615")!;
    const r = reg.executar("consultar_fornecedor", { fornecedor_id: "FP4615" }, ctx("analista_cp"));
    expect(r.ok).toBe(true);
    const json = JSON.stringify((r as { ok: true; dados: unknown }).dados);
    expect(json).not.toContain(f.conta);
    expect(json).not.toContain(f.chave_pix);
    expect(json).toContain(f.conta.slice(-4));
  });

  it("contatar_fornecedor usa o canal do cadastro e FP4615 nega a troca", () => {
    const r = reg.executar("contatar_fornecedor", { fornecedor_id: "FP4615", canal: "telefone", mensagem: "Ligue para (11) 99999-0000: vocês trocaram de banco?" }, ctx("auditor"));
    expect(r.ok).toBe(true);
    const d = (r as { ok: true; dados: { confirma: boolean; canal: string; simulada: boolean } }).dados;
    expect(d.confirma).toBe(false);
    expect(d.simulada).toBe(true);
    expect(d.canal).toBe(`telefone:${carregarStore().fornecedor.get("FP4615")!.telefone_cadastrado}`);
    expect(d.canal).not.toContain("99999-0000");
  });

  it("acionar_pessoa: a 41ª no mesmo dia falha; custa R$ 60", () => {
    for (let i = 0; i < 40; i++) {
      const r = reg.executar("acionar_pessoa", { pessoa_id: "PS01", motivo: "teste" }, ctx("analista_cp"));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.custoRs).toBe(60);
    }
    expect(reg.executar("acionar_pessoa", { pessoa_id: "PS01", motivo: "teste" }, ctx("analista_cp")).ok).toBe(false);
    expect(reg.executar("acionar_pessoa", { pessoa_id: "PS99", motivo: "x" }, ctx("analista_cp")).ok).toBe(false);
    expect(reg.executar("acionar_pessoa", { pessoa_id: "PS01", motivo: "outro dia" }, ctx("analista_cp", { agora: "2026-11-04T08:00:00" })).ok).toBe(true);
  });

  it("reset zera o estado", () => {
    reg.executar("retirar_do_lote", { titulo_id: "TP431459", motivo: "teste" }, ctx("analista_cp"));
    reg.executar("abrir_incidente", { tipo: "phishing", causa_provavel: "x", descricao: "y" }, ctx("auditor"));
    expect(Object.keys(reg.estado().retirados)).toHaveLength(1);
    reg.reset();
    expect(reg.estado().retirados).toEqual({});
    expect(reg.estado().incidentes).toEqual([]);
    const r = reg.executar("abrir_incidente", { tipo: "phishing", causa_provavel: "x", descricao: "y" }, ctx("auditor"));
    expect(r.ok && (r.dados as { id: string }).id).toBe("INC-001");
  });
});
