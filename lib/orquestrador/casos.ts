// Agrupa títulos não limpos em CASOS (por fornecedor) e decide quais especialistas rodam.
import type { Store } from "@/lib/data/store";
import type { ResultadoAnalise } from "@/lib/rules/engine";
import type { EstadoTitulo, TipoAchado } from "@/lib/rules/tipos";
import type { CasoEntrada, ComunicacaoCaso } from "@/lib/contratos/caso";
import { acaoDoPiso, type Especialista } from "@/lib/contratos/types";
import { maisConservadora } from "./politica";

const DOMINIO: Record<Especialista, TipoAchado[]> = {
  compras: ["NF_X_TITULO", "CNPJ_DIVERGENTE", "OC_NAO_APROVADA", "OC_INEXISTENTE", "OC_ENCERRADA", "OC_OUTRO_FORNECEDOR", "OC_X_NF", "OC_DIVERGENTE_NA_NF", "SEM_NF", "SEM_OC", "NF_INEXISTENTE", "NF_NAO_AUTORIZADA", "PARCELA_INEXISTENTE", "RECEBIMENTO"],
  bancario: ["DUPLICIDADE", "JA_PAGO_AVULSO", "JA_PAGO_EXTRATO", "JA_PAGO_RETORNO", "JA_PAGO_ERP", "BOLETO_DDA_BAIXADO", "BOLETO_X_TITULO", "BOLETO_FORA_DDA", "CREDITO_FORNECEDOR", "FRACIONAMENTO"],
  cadastro_fraude: ["TROCA_BANCARIA_SUSPEITA", "COMUNICACAO_SUSPEITA", "BOLETO_BENEFICIARIO", "BOLETO_BANCO_NOVO", "CNPJ_DIVERGENTE"],
};

const PRIORIDADE_TIPO: [TipoAchado, string, string][] = [
  ["TROCA_BANCARIA_SUSPEITA", "fraude_cadastro", "troca de conta sem confirmação"],
  ["BOLETO_BENEFICIARIO", "boleto_falso", "boleto com beneficiário divergente"],
  ["JA_PAGO_AVULSO", "ja_pago", "já pago fora do lote"],
  ["CNPJ_DIVERGENTE", "homonimo", "NF de outra empresa"],
  ["NF_X_TITULO", "valor_errado", "valor do título ≠ duplicata"],
  ["OC_NAO_APROVADA", "oc_invalida", "OC pendente/cancelada"],
  ["DUPLICIDADE", "duplicidade", "lançamento duplicado"],
  ["COMUNICACAO_SUSPEITA", "comunicacao", "comunicação suspeita"],
  ["CREDITO_FORNECEDOR", "credito", "crédito por pagamento em dobro"],
];

export function tipoDoCaso(ts: EstadoTitulo[]): { tipo: string; rotulo: string } {
  for (const [ach, tipo, rotulo] of PRIORIDADE_TIPO) if (ts.some((t) => t.achados.some((a) => a.tipo === ach))) return { tipo, rotulo };
  return { tipo: "atencao", rotulo: "pontos de atenção" };
}

export function montarCasos(r: ResultadoAnalise, s: Store): CasoEntrada[] {
  const commPorId = new Map(r.comunicacoes.map((c) => [c.id, c]));
  const grupos = new Map<string, EstadoTitulo[]>();
  for (const e of r.estados) {
    if (e.status === "limpo") continue;
    grupos.set(e.fornecedor_id, [...(grupos.get(e.fornecedor_id) ?? []), e]);
  }
  const casos: CasoEntrada[] = [];
  for (const [fid, ts] of grupos) {
    const f = s.fornecedor.get(fid);
    const ids = [...new Set(ts.flatMap((t) => t.comunicacoes))];
    const comunicacoes: ComunicacaoCaso[] = ids
      .map((id) => commPorId.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => {
        const bruto = s.comunicacoes.find((x) => x.comunicacao_id === c.id);
        const injecao = c.sinais.includes("injecao_instrucao");
        return { id: c.id, data_hora: c.data_hora, canal: c.canal, remetente: c.remetente, via: c.via, sinais: c.sinais, assunto: c.assunto, ...(injecao || !bruto ? {} : { corpo: `${bruto.texto} ${bruto.anexos ? `| ANEXOS: ${bruto.anexos}` : ""}`.slice(0, 1200) }) };
      });
    const tiposAch = new Set(ts.flatMap((t) => t.achados.filter((a) => a.severidade !== "BAIXA").map((a) => a.tipo)));
    const especialistas = (Object.keys(DOMINIO) as Especialista[]).filter((esp) => DOMINIO[esp].some((tp) => tiposAch.has(tp)) || (esp === "cadastro_fraude" && comunicacoes.length > 0));
    const { tipo } = tipoDoCaso(ts);
    casos.push({
      id: `caso-${fid}`,
      tipo,
      fornecedor_id: fid,
      fornecedor_nome: f?.nome_fantasia ?? fid,
      categoria: f?.categoria ?? "",
      titulos: ts,
      piso: maisConservadora(ts.map((t) => acaoDoPiso(t.acaoMinima))),
      comunicacoes,
      especialistas,
    });
  }
  return casos.sort((a, b) => b.titulos.reduce((x, t) => x + t.valorEmRisco, 0) - a.titulos.reduce((x, t) => x + t.valorEmRisco, 0));
}
