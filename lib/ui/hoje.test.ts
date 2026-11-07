// A1–A4 da tela /hoje: vocabulário, cartões, resumo que recalcula depois da ação, e bordas de renderização.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/proxy", () => ({
  chat: vi.fn(async () => {
    throw new Error("teste não chama o proxy");
  }),
  jev: vi.fn(async () => {
    throw new Error("teste não chama o proxy");
  }),
}));
// next/link em renderização de servidor sem o App Router: um <a> simples basta
vi.mock("next/link", () => ({ default: (p: { href: string; children: unknown; className?: string }) => createElement("a", { href: p.href, className: p.className }, p.children as never) }));

import { HojeView, nomePessoa, type HojeProps } from "@/components/HojeView";
import type { ExecucaoView } from "@/lib/contratos/types";
import { execucaoMock } from "@/lib/mock/execucao.mock";
import { acaoHumana, avancar, resetRunner, view as viewDoRunner } from "@/lib/orquestrador/runner";
import { derivarHoje, faltam, porque, prazoDaJanela, termosProibidosEm } from "./hoje";

const noop = () => {};
const render = (view: ExecucaoView | null, extra: Partial<HojeProps> = {}) =>
  renderToStaticMarkup(createElement(HojeView, { view, erro: false, ocupado: null, onConferir: noop, onAcao: noop, onTentar: noop, ...extra }));

/** Texto visível + valores de aria-label/title/alt (o que um leitor de tela e o usuário veem). */
function visivel(html: string) {
  const attrs = [...html.matchAll(/(?:aria-label|title|alt)="([^"]*)"/g)].map((m) => m[1]).join(" ");
  return `${html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ")} ${attrs}`;
}

let antes: ExecucaoView; // lote ainda não conferido
let depois: ExecucaoView; // depois de "Conferir o lote"

beforeAll(async () => {
  delete process.env.AI_PROXY_API_KEY; // replay puro
  resetRunner();
  antes = JSON.parse(JSON.stringify(viewDoRunner()));
  await avancar({ modo: "replay", humanos: "auto" });
  depois = viewDoRunner();
}, 120_000);

describe("A1 vocabulário proibido", () => {
  it("o detector pega os termos (sem falso positivo em 'Caixaforte' nem em 'cerca de')", () => {
    expect(termosProibidosEm("o Jev e o trace do replay")).toHaveLength(3);
    expect(termosProibidosEm("Caixaforte e Cerca de 10 minutos")).toHaveLength(1); // só "cerca" isolada
    expect(termosProibidosEm("Travado por segurança. Precisa da sua decisão.")).toEqual([]);
  });
  for (const [nome, get] of [
    ["antes de conferir (estado real)", () => antes],
    ["depois de conferir (estado real)", () => depois],
    ["dados de exemplo (mock)", () => execucaoMock],
  ] as const) {
    it(`/hoje ${nome} não tem termo proibido`, () => {
      expect(termosProibidosEm(visivel(render(get())))).toEqual([]);
    });
  }
  it("estados de carregando e de erro também", () => {
    expect(termosProibidosEm(visivel(render(null)))).toEqual([]);
    expect(termosProibidosEm(visivel(render(depois, { erro: true })))).toEqual([]);
  });
  it("nomes de pessoas e rótulos vindos do estado não trazem termo proibido", () => {
    for (const id of ["PS01", "PS02", "PS03", "PS04", "PS05", "PS08", "PS09", "aprovador"]) expect(termosProibidosEm(nomePessoa(id))).toEqual([]);
  });
});

describe("A2 cartões e resumo", () => {
  it("cada cartão tem quem, valor, porquê, prazo, quem decide e as 3 ações", () => {
    const h = derivarHoje(depois, nomePessoa);
    expect(h.cartoes.length).toBeGreaterThan(0);
    for (const c of h.cartoes) {
      expect(c.quem.length).toBeGreaterThan(3);
      expect(c.valor).toBeGreaterThan(0);
      expect(c.porque.length).toBeGreaterThan(3);
      expect(c.prazo).toMatch(/\d{2}\/\d{2}/);
      expect(c.pedidoA.length).toBeGreaterThan(0);
    }
    const html = render(depois);
    for (const rotulo of ["Aprovar", "Recusar", "Pedir mais informação"]) expect(html.split(`>${rotulo}<`).length - 1).toBe(h.cartoes.length);
    expect(html).toContain(`Precisa de você (${h.cartoes.length})`);
  });

  it("o botão principal e os números do topo vêm do estado", () => {
    const h = derivarHoje(antes);
    expect(h.proximo?.hora).toBe("10h");
    expect(h.total.qtd).toBe(antes.titulos.length);
    const html = visivel(render(antes));
    expect(html).toContain("Conferir o lote das 10h");
    expect(html).toContain(`${antes.titulos.length.toLocaleString("pt-BR")} pagamentos`);
  });

  it("o resumo fecha com o total de pagamentos e o primeiro lote tira títulos da fila", () => {
    for (const v of [antes, depois]) {
      const r = derivarHoje(v).resumo;
      expect(r.liberados.qtd + r.resolvidos.qtd + r.aguardando.qtd + r.travados.qtd + r.naoConferidos.qtd).toBe(v.titulos.length);
    }
    // o 1º lote conferido tira títulos da fila
    expect(derivarHoje(depois).resumo.naoConferidos.qtd).toBeLessThan(derivarHoje(antes).resumo.naoConferidos.qtd);
  });

  it("depois de uma ação (aprovar) o estado muda e o resumo recalcula", async () => {
    const h0 = derivarHoje(viewDoRunner(), nomePessoa);
    const alvo = h0.cartoes[0];
    expect(alvo).toBeTruthy();
    await acaoHumana(alvo.id, "aprovar", "teste");
    const h1 = derivarHoje(viewDoRunner(), nomePessoa);
    expect(h1.cartoes.some((c) => c.id === alvo.id && h0.cartoes.length === h1.cartoes.length)).toBe(false); // saiu da fila ou mudou
    expect(h1.cartoes.length).toBeLessThanOrEqual(h0.cartoes.length);
    const r = h1.resumo;
    expect(r.liberados.qtd + r.resolvidos.qtd + r.aguardando.qtd + r.travados.qtd + r.naoConferidos.qtd).toBe(viewDoRunner().titulos.length);
  }, 60_000);

  it("funções de texto: prazo, tempo restante e porquê em linguagem simples", () => {
    expect(prazoDaJanela("RM20261103-MER", "2026-11-02T08:00:00")).toBe("03/11 às 10h");
    expect(prazoDaJanela("RM20261103-MER", "2026-11-03T14:00:00")).toContain("já fechou");
    expect(faltam("2026-11-02T08:00:00", "2026-11-03T10:00:00")).toBe("1 dia e 2h");
    expect(faltam("2026-11-03T08:00:00", "2026-11-03T10:30:00")).toBe("2h 30min");
    expect(porque("bloquear em 25 título(s) de Embalarte; risco de fraude 0.98")).toBe("Travar por segurança em 25 pagamento(s) de Embalarte");
  });
});

describe("A4 bordas de renderização", () => {
  const clone = () => JSON.parse(JSON.stringify(depois)) as ExecucaoView;

  it("fornecedor com 60 caracteres: renderiza e quebra a linha (overflow-wrap) em vez de estourar", () => {
    const v = clone();
    const nome = "F".repeat(60);
    v.casos[0].titulo = `${nome}: troca de conta sem confirmação`;
    v.acionamentos[0] = { ...v.acionamentos[0], status: "pendente", casoId: v.casos[0].id };
    const html = render(v);
    expect(html).toContain(nome);
    expect(html).toContain("[overflow-wrap:anywhere]"); // layout real: NÃO VERIFICADO sem navegador
  });

  it("0 pendentes: mostra 'Nada precisa de você agora'", () => {
    const v = clone();
    v.acionamentos = [];
    const html = visivel(render(v));
    expect(html).toContain("Precisa de você (0)");
    expect(html).toContain("Nada precisa de você agora");
  });

  it("200 pendentes: renderiza, mostra os 25 primeiros e oferece 'Mostrar os outros 175'", () => {
    const v = clone();
    const modelo = v.acionamentos.find((a) => a.status === "pendente") ?? v.acionamentos[0];
    v.acionamentos = Array.from({ length: 200 }, (_, i) => ({ ...modelo, id: `ac-teste-${i}`, status: "pendente" as const }));
    const html = render(v);
    expect(visivel(html)).toContain("Precisa de você (200)");
    expect(html.split(">Aprovar<").length - 1).toBe(25);
    expect(visivel(html)).toContain("Mostrar os outros 175");
  });

  it("sem próximo fechamento: mostra que todos foram conferidos, sem botão", () => {
    const v = clone();
    v.relogio.proximoCorte = null;
    const html = render(v);
    expect(visivel(html)).toContain("Todos os lotes foram conferidos");
    expect(html).not.toContain("Conferir o lote");
  });

  it("erro: mostra o aviso e o botão de tentar de novo", () => {
    const html = render(depois, { erro: true });
    expect(visivel(html)).toContain("Tentar de novo");
  });
});
