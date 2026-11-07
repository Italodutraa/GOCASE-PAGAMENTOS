// Store em memória com índices de join entre os sistemas.
import { lerCsv, type Linha, DIR_DADOS } from "./loader";
import { agruparPor, normNF, raizCnpj } from "./normalize";

export type { Linha };

export interface Store {
  dir: string;
  fornecedores: Linha[];
  fornecedor: Map<string, Linha>;
  fornecedoresPorRaiz: Map<string, Linha[]>;
  titulos: Linha[];
  titulo: Map<string, Linha>;
  agenda: Linha[];
  notas: Linha[];
  nfPorRaizNumero: Map<string, Linha[]>; // `${raiz}|${normNF}`
  nfPorNumero: Map<string, Linha[]>;
  duplicatasPorChave: Map<string, Linha[]>;
  pedidos: Map<string, Linha>;
  alteracoes: Linha[];
  alteracoesPorFornecedor: Map<string, Linha[]>;
  comunicacoes: Linha[];
  dda: Linha[];
  ddaPorLinha: Map<string, Linha>;
  recebimentosPorChave: Map<string, Linha[]>;
  retorno: Linha[];
  retornoPorTitulo: Map<string, Linha[]>;
  usuarios: Map<string, Linha>;
  extratoMeridiano: Linha[];
  extratoLitoral: Linha[];
  politicas: Linha[];
  ferramentas: Linha[];
  feriados: Linha[];
}

function indexar<T>(itens: T[], chave: (x: T) => string) {
  const m = new Map<string, T>();
  for (const it of itens) m.set(chave(it), it);
  return m;
}

export function montarStore(dir = DIR_DADOS): Store {
  const l = (f: string, d = ",") => lerCsv(f, d, dir);
  const fornecedores = l("fornecedores.csv");
  const titulos = l("contas_a_pagar.csv");
  const notas = l("notas_fiscais.csv");
  const alteracoes = l("alteracoes_cadastro.csv");
  const dda = l("dda_boletos.csv");
  const retorno = l("retorno_remessa.csv");
  return {
    dir,
    fornecedores,
    fornecedor: indexar(fornecedores, (f) => f.fornecedor_id),
    fornecedoresPorRaiz: agruparPor(fornecedores, (f) => raizCnpj(f.cnpj)),
    titulos,
    titulo: indexar(titulos, (t) => t.titulo_id),
    agenda: l("agenda_remessa.csv"),
    notas,
    nfPorRaizNumero: agruparPor(notas, (n) => `${raizCnpj(n.cnpj_emitente)}|${normNF(n.numero_nf)}`),
    nfPorNumero: agruparPor(notas, (n) => normNF(n.numero_nf)),
    duplicatasPorChave: agruparPor(l("nf_duplicatas.csv"), (d) => d.chave_acesso),
    pedidos: indexar(l("pedidos_compra.csv"), (o) => o.oc_id),
    alteracoes,
    alteracoesPorFornecedor: agruparPor(alteracoes, (a) => a.fornecedor_id),
    comunicacoes: l("comunicacoes_fornecedores.csv"),
    dda,
    ddaPorLinha: indexar(dda, (b) => b.linha_digitavel),
    recebimentosPorChave: agruparPor(l("recebimentos_mercadoria.csv"), (r) => r.chave_acesso),
    retorno,
    retornoPorTitulo: agruparPor(retorno, (r) => r.titulo_id),
    usuarios: indexar(l("usuarios_sistema.csv"), (u) => u.login),
    extratoMeridiano: l("extrato_banco_meridiano.csv"),
    extratoLitoral: l("extrato_banco_litoral.csv", ";"),
    politicas: l("politicas.csv"),
    ferramentas: l("ferramentas.csv"),
    feriados: l("feriados_bancarios.csv"),
  };
}

// cache por processo (sobrevive ao hot-reload do Next)
const g = globalThis as unknown as { __store?: Store };
export function carregarStore(): Store {
  return (g.__store ??= montarStore());
}

/** Descarta mutações (cenários injetados) e relê os CSVs no próximo acesso. */
export function resetStore() {
  delete g.__store;
}
