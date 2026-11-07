// Gabarito: casos reais plantados na base ./pagamentos (ver CLAUDE.md).
// Garante que o Passo A acha o que precisa e NÃO acusa os falsos positivos já conhecidos.
import { beforeAll, describe, expect, it } from "vitest";
import { montarStore } from "@/lib/data/store";
import { analisarAgenda, resumir, type ResultadoAnalise } from "./engine";
import type { EstadoTitulo, TipoAchado } from "./tipos";

let r: ResultadoAnalise;
let por: Map<string, EstadoTitulo>;
const tipos = (id: string) => por.get(id)!.achados.map((a) => a.tipo);
const comTipo = (t: TipoAchado) => r.estados.filter((e) => e.achados.some((a) => a.tipo === t)).map((e) => e.titulo_id).sort();

beforeAll(() => {
  r = analisarAgenda(montarStore());
  por = new Map(r.estados.map((e) => [e.titulo_id, e]));
}, 60_000);

describe("agenda", () => {
  it("876 títulos, R$ 10.206.764,09", () => {
    const s = resumir(r);
    expect(s.agenda.titulos).toBe(876);
    expect(s.agenda.valor).toBeCloseTo(10206764.09, 2);
  });
});

describe("golpe Embalarte (troca bancária sem confirmação + domínio falso)", () => {
  it("todos os 25 títulos da Embalarte bloqueados, nada de outros fornecedores", () => {
    const ids = comTipo("TROCA_BANCARIA_SUSPEITA");
    expect(ids).toHaveLength(25);
    expect(ids.every((id) => por.get(id)!.fornecedor_id === "FP4615")).toBe(true);
    expect(r.estados.filter((e) => e.fornecedor_id === "FP4615")).toHaveLength(25);
  });
  it("TP432130 (R$ 96.480) exige dupla com PS03 e propõe reverter a alteração", () => {
    const e = por.get("TP432130")!;
    expect(e.alcada.nivel).toBe("diretoria");
    expect(e.alcada.aprovadores).toEqual(["aprovador", "PS03"]);
    expect(e.acaoMinima).toBe("escalar_aprovacao");
    expect(e.achados.find((a) => a.tipo === "TROCA_BANCARIA_SUSPEITA")!.sugestao!.campo).toBe("reverter_alteracao_cadastro");
  });
  it("e-mail EM571119 detectado como domínio parecido", () => {
    expect(r.comunicacoes.find((c) => c.id === "EM571119")!.via).toBe("dominio_parecido");
  });
  it("trocas com ligação válida não são acusadas (Cartonart, Polyfilm, Evoluir, Magnetec)", () => {
    for (const fid of ["FP5079", "FP3614", "FP4202", "FP3345"]) expect(r.trocas.filter((t) => t.fornecedor_id === fid).every((t) => t.valida)).toBe(true);
  });
});

describe("boleto falso Pigmentos Aquarela", () => {
  it("TP431754: beneficiário e banco novos, com linha legítima do DDA sugerida", () => {
    expect(tipos("TP431754")).toEqual(expect.arrayContaining(["BOLETO_BENEFICIARIO", "BOLETO_BANCO_NOVO", "COMUNICACAO_SUSPEITA"]));
    const sug = por.get("TP431754")!.achados.find((a) => a.tipo === "BOLETO_BENEFICIARIO")!.sugestao!;
    expect(sug.campo).toBe("linha_digitavel");
    expect(sug.valor_novo.slice(0, 3)).toBe("289");
  });
  it("outros títulos da Pigmentos não são contaminados pelo e-mail da NF 57551", () => {
    const outros = r.estados.filter((e) => e.fornecedor_id === "FP4345" && e.titulo_id !== "TP431754");
    expect(outros.every((e) => !e.achados.some((a) => a.tipo === "COMUNICACAO_SUSPEITA"))).toBe(true);
  });
});

describe("já pagos fora do lote", () => {
  it("só os 3 fretes (sem falsos positivos de parcela anterior de mesmo valor)", () => {
    expect(comTipo("JA_PAGO_AVULSO")).toEqual(["TP432863", "TP432865", "TP432992"]);
    expect(comTipo("BOLETO_DDA_BAIXADO")).toEqual(["TP432863", "TP432865", "TP432992"]);
    for (const id of ["TP428621", "TP429794", "TP432883", "TP433162"]) expect(tipos(id)).not.toContain("JA_PAGO_AVULSO");
  });
});

describe("duplicidade xml_portal × boleto_email", () => {
  it("13 excedentes, todos do boleto_email, e cada par mantém o lançamento do XML", () => {
    const exc = comTipo("DUPLICIDADE");
    expect(exc).toHaveLength(13);
    expect(exc.every((id) => por.get(id)!.origem_lancamento === "boleto_email")).toBe(true);
    expect(comTipo("DUPLICIDADE_PAR_MANTIDO")).toHaveLength(13);
  });
  it("histórico: 55 parcelas pagas 2x, R$ 406.636,83", () => {
    expect(r.duplicidadesHistoricas.itens).toHaveLength(55);
    expect(r.duplicidadesHistoricas.total).toBeCloseTo(406636.83, 2);
  });
  it("duplicidade não é confundida com fracionamento", () => {
    expect(comTipo("FRACIONAMENTO")).toEqual([]);
  });
});

describe("valor digitado errado (×10 / ÷10)", () => {
  it("8 títulos, com o valor da duplicata sugerido", () => {
    expect(comTipo("NF_X_TITULO")).toEqual(["TP431459", "TP431536", "TP431634", "TP431775", "TP432136", "TP432245", "TP432623", "TP433092"]);
    const a = por.get("TP431459")!.achados.find((x) => x.tipo === "NF_X_TITULO")!;
    expect(a.sugestao).toMatchObject({ campo: "valor", valor_novo: "4838.00" });
    expect(a.valorEmRisco).toBeCloseTo(43542, 2);
  });
});

describe("fornecedor homônimo", () => {
  it("NF de outra empresa, com o fornecedor correto sugerido", () => {
    const sug = (id: string) => por.get(id)!.achados.find((a) => a.tipo === "CNPJ_DIVERGENTE")!.sugestao!.valor_novo;
    expect(sug("TP431946")).toBe("FP6799");
    expect(sug("TP432337")).toBe("FP3302");
  });
});

describe("OC inválida", () => {
  it("pendente e cancelada saem do lote", () => {
    expect(comTipo("OC_NAO_APROVADA")).toEqual(["TP433074", "TP433196"]);
    expect(por.get("TP433196")!.acaoMinima).toBe("retirar_do_lote");
  });
});

describe("comunicações", () => {
  it("phishing e injeção marcados, sem virar instrução", () => {
    const c = (id: string) => r.comunicacoes.find((x) => x.id === id)!;
    for (const id of ["EM570977", "EM570998", "EM571100"]) expect(c(id).sinais).toContain("phishing");
    expect(c("EM570996").sinais).toContain("injecao_instrucao");
    expect(c("EM571116").sinais).toContain("boleto_divergente");
  });
});

describe("ruído não bloqueia", () => {
  it("ressalva de WMS é BAIXA e não muda a ação", () => {
    const so = r.estados.filter((e) => e.achados.length && e.achados.every((a) => a.tipo === "RECEBIMENTO"));
    expect(so.length).toBeGreaterThan(0);
    expect(so.every((e) => e.status === "limpo" && e.acaoMinima === "manter_no_lote")).toBe(true);
  });
  it("valor total em risco ≈ R$ 648 mil", () => {
    expect(resumir(r).valorEmRisco).toBeGreaterThan(640000);
    expect(resumir(r).valorEmRisco).toBeLessThan(655000);
  });
});
