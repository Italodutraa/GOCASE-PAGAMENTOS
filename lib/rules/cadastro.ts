// Trocas de dados bancários e validade da confirmação (janela de 30 dias).
// Regra: só vale com LIGAÇÃO para o telefone que estava no cadastro antes de qualquer alteração recente;
// nunca para número da própria mensagem, nem para telefone trocado há menos de 30 dias.
import type { Store } from "@/lib/data/store";
import { addDias, dataHora, digitos, telefonesNoTexto } from "@/lib/data/normalize";
import { JANELA_TROCA_DIAS, REFERENCIA } from "./politicas";

const CAMPOS_BANCARIOS = new Set(["banco", "agencia", "conta", "chave_pix"]);

export type VereditoTroca = "OK" | "SEM_CONFIRMACAO" | "CONFIRMACAO_NAO_FOI_LIGACAO" | "LIGACAO_PARA_NUMERO_INVALIDO";

export interface TrocaBancaria {
  fornecedor_id: string;
  quando: string; // data_hora
  alteracao_ids: string[];
  campos: Record<string, { de: string; para: string }>;
  origem: string;
  alterado_por: string;
  confirmacao_registrada: string;
  confirmacao_como: string;
  telefoneValido: string; // dígitos do telefone que valeria para confirmar
  telefonesLigados: string[];
  telefoneTrocadoMenos30d: boolean;
  veredito: VereditoTroca;
  recente: boolean; // < 30 dias da referência
  valida: boolean;
}

/** Telefone do cadastro vigente no instante t (reconstrói pelo histórico de alterações). */
export function telefoneEm(s: Store, fid: string, t: Date): string {
  const tels = (s.alteracoesPorFornecedor.get(fid) ?? [])
    .filter((a) => a.campo === "telefone")
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  for (const a of tels) if (dataHora(a.data_hora)! > t) return a.valor_anterior;
  return s.fornecedor.get(fid)?.telefone_cadastrado ?? "";
}

export function analisarTrocasBancarias(s: Store, referencia = REFERENCIA): Map<string, TrocaBancaria[]> {
  const grupos = new Map<string, TrocaBancaria>();
  for (const a of s.alteracoes) {
    if (!CAMPOS_BANCARIOS.has(a.campo)) continue;
    const k = `${a.fornecedor_id}|${a.data_hora}`;
    let g = grupos.get(k);
    if (!g) {
      const t = dataHora(a.data_hora)!;
      const telefoneValido = digitos(telefoneEm(s, a.fornecedor_id, addDias(t, -JANELA_TROCA_DIAS)));
      const telefonesLigados = telefonesNoTexto(a.confirmacao_como);
      const telefoneTrocadoMenos30d = (s.alteracoesPorFornecedor.get(a.fornecedor_id) ?? []).some((x) => {
        if (x.campo !== "telefone") return false;
        const tx = dataHora(x.data_hora)!;
        return tx >= addDias(t, -JANELA_TROCA_DIAS) && tx <= addDias(t, 1);
      });
      let veredito: VereditoTroca;
      if (a.confirmacao_registrada !== "sim") veredito = "SEM_CONFIRMACAO";
      else if (!telefonesLigados.length) veredito = "CONFIRMACAO_NAO_FOI_LIGACAO";
      else if (!telefonesLigados.includes(telefoneValido)) veredito = "LIGACAO_PARA_NUMERO_INVALIDO";
      else veredito = "OK";
      g = {
        fornecedor_id: a.fornecedor_id,
        quando: a.data_hora,
        alteracao_ids: [],
        campos: {},
        origem: a.origem,
        alterado_por: a.alterado_por,
        confirmacao_registrada: a.confirmacao_registrada,
        confirmacao_como: a.confirmacao_como,
        telefoneValido,
        telefonesLigados,
        telefoneTrocadoMenos30d,
        veredito,
        recente: t >= addDias(referencia, -JANELA_TROCA_DIAS),
        valida: veredito === "OK",
      };
      grupos.set(k, g);
    }
    g.alteracao_ids.push(a.alteracao_id);
    g.campos[a.campo] = { de: a.valor_anterior, para: a.valor_novo };
  }
  const porFornecedor = new Map<string, TrocaBancaria[]>();
  for (const g of grupos.values()) porFornecedor.set(g.fornecedor_id, [...(porFornecedor.get(g.fornecedor_id) ?? []), g]);
  return porFornecedor;
}
