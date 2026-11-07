import { describe, it, expect, vi, beforeEach } from "vitest";

const chat = vi.fn();
// impl é uma função comum (não vi.fn) para o vitest não rastrear a rejeição como "unhandled"
let impl: (...a: any[]) => Promise<unknown> = async () => ({ texto: "" });
vi.mock("@/lib/ai/proxy", () => ({
  chat: (...a: unknown[]) => {
    chat(...a);
    return impl(...a);
  },
}));

import { responderAcionamento, temPersona, PERSONAS_LLM } from "./humanos";
import type { Acionamento } from "@/lib/contratos/types";

const ac = (pessoa: string): Acionamento => ({
  id: "AC1",
  pessoa,
  janela: "RM20261103-MER",
  titulos: ["TP1", "TP2"],
  valorTotal: 1234.5,
  mensagem: "Reverter troca bancária do fornecedor FP4615",
  acaoSolicitada: "reverter_alteracao_cadastro",
  status: "pendente",
});
const ctx = { agora: "2026-11-03T09:00" };
const ok = (texto: string) => {
  impl = async () => ({ texto });
};

beforeEach(() => {
  chat.mockReset();
  ok("");
});

describe("humanos simulados", () => {
  it("personas", () => {
    expect(PERSONAS_LLM).toEqual(["aprovador", "PS01", "PS03", "PS09"]);
    expect(temPersona("PS01")).toBe(true);
    expect(temPersona("PS02")).toBe(false);
  });

  it("sem persona -> null sem chamar o chat", async () => {
    expect(await responderAcionamento(ac("PS02"), ctx)).toBeNull();
    expect(chat).not.toHaveBeenCalled();
  });

  it("JSON válido aprovar", async () => {
    ok('{"decisao":"aprovar","motivo":"evidência ok"}');
    const r = await responderAcionamento(ac("PS03"), ctx);
    expect(r).toEqual({ pessoa: "PS03", decisao: "aprovar", motivo: "evidência ok", simulada: true });
    expect(chat.mock.calls[0][0].temperature).toBe(0);
  });

  it("parse tolerante com lixo em volta", async () => {
    ok('Claro! ```json\n{"decisao":"mais_info","motivo":"falta prova {x}","pergunta":"Qual o e-mail?"}\n``` fim');
    const r = await responderAcionamento(ac("PS01"), ctx);
    expect(r?.decisao).toBe("mais_info");
    expect(r?.pergunta).toBe("Qual o e-mail?");
  });

  it("JSON inválido ou decisão inválida -> null", async () => {
    ok("nada de json");
    expect(await responderAcionamento(ac("aprovador"), ctx)).toBeNull();
    ok('{"decisao":"talvez","motivo":"x"}');
    expect(await responderAcionamento(ac("aprovador"), ctx)).toBeNull();
  });

  it("chat lança erro -> null", async () => {
    impl = async () => {
      throw new Error("boom");
    };
    expect(await responderAcionamento(ac("PS09"), ctx)).toBeNull();
  });

  it("rodada 1 com mais_info -> null (fica para o humano); aprovar passa", async () => {
    ok('{"decisao":"mais_info","motivo":"x","pergunta":"?"}');
    expect(await responderAcionamento(ac("PS01"), { ...ctx, rodada: 1 })).toBeNull();
    ok('{"decisao":"recusar","motivo":"sem prova"}');
    expect((await responderAcionamento(ac("PS01"), { ...ctx, rodada: 1 }))?.decisao).toBe("recusar");
  });
});
