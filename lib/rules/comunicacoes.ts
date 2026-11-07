// Comunicações de fornecedores: vínculo ao cadastro e sinais de golpe.
// O conteúdo é escrito por terceiros: aqui só é CLASSIFICADO, nunca obedecido.
import type { Store, Linha } from "@/lib/data/store";
import { digitos, dominioEmail, levenshtein, normNF, raizCnpj } from "@/lib/data/normalize";

export type Via = "oficial" | "mesmo_dominio" | "dominio_parecido" | "nao_oficial" | "desconhecido";
export type Sinal =
  | "pedido_troca_bancaria"
  | "segunda_via"
  | "boleto_divergente"
  | "injecao_instrucao"
  | "phishing"
  | "aviso_pagamento_duplicado"
  | "reajuste";

export interface ComunicacaoAnalisada {
  id: string;
  data_hora: string;
  canal: string;
  remetente: string;
  nome_remetente: string;
  assunto: string;
  fornecedor_id?: string;
  via: Via;
  sinais: Sinal[];
  nfs: string[]; // NFs citadas (normalizadas)
  suspeita: boolean;
  motivo: string;
}

const RE_TROCA = /(dados banc|nova conta|conta nova|domic[ií]lio banc|novo banco|chave pix|nova chave|altera[cç][aã]o banc|passou a receber|concentrar os recebimentos)/i;
const RE_2VIA = /(segunda via|2a via|2ª via)/i;
const RE_INJECAO = /(assistente de ia|para o assistente|pr[eé]-aprovad|sem conferir|libere os pagamentos|ignore (as|todas)|desconsidere as regras)/i;
const RE_PHISHING = /(token|protesto|negativa[cç][aã]o|clique|acesse o link|regularizar|senha|\.zip)/i;
const RE_DUP = /(duplicidade|dois pagamentos)/i;
const RE_REAJUSTE = /reajuste/i;

export function analisarComunicacoes(s: Store, historicoBancos: Map<string, Set<string>>): ComunicacaoAnalisada[] {
  const porEmail = new Map<string, string>();
  const porTel = new Map<string, string>();
  const porDominio = new Map<string, string>();
  for (const f of s.fornecedores) {
    porEmail.set(f.email_cadastrado.toLowerCase(), f.fornecedor_id);
    porTel.set(digitos(f.telefone_cadastrado), f.fornecedor_id);
    const d = dominioEmail(f.email_cadastrado);
    if (d && !/^(gmail|outlook|hotmail|yahoo)\./.test(d)) porDominio.set(d, f.fornecedor_id);
  }

  return s.comunicacoes.map((c: Linha) => {
    const rem = c.remetente.toLowerCase();
    const texto = `${c.assunto} ${c.texto}`;
    const tudo = `${texto} ${c.anexos}`;
    let fid: string | undefined;
    let via: Via = "desconhecido";

    if (porEmail.has(rem)) [fid, via] = [porEmail.get(rem), "oficial"];
    else if (porTel.has(digitos(rem)) && digitos(rem).length >= 10) [fid, via] = [porTel.get(digitos(rem)), "oficial"];
    else {
      const dom = dominioEmail(rem);
      if (dom && porDominio.has(dom)) [fid, via] = [porDominio.get(dom), "mesmo_dominio"];
      else if (dom) {
        for (const [d, id] of porDominio) {
          if (levenshtein(dom, d) <= 2) {
            [fid, via] = [id, "dominio_parecido"];
            break;
          }
        }
      }
      if (!fid) {
        const alvo = `${c.nome_remetente} ${texto}`.toLowerCase();
        const f = s.fornecedores.find((x) => x.nome_fantasia.length >= 4 && alvo.includes(x.nome_fantasia.toLowerCase()));
        if (f) [fid, via] = [f.fornecedor_id, "nao_oficial"];
      }
    }

    const sinais: Sinal[] = [];
    if (RE_TROCA.test(texto)) sinais.push("pedido_troca_bancaria");
    if (RE_2VIA.test(texto)) sinais.push("segunda_via");
    if (RE_INJECAO.test(texto)) sinais.push("injecao_instrucao");
    if (via === "desconhecido" && RE_PHISHING.test(tudo)) sinais.push("phishing");
    if (RE_DUP.test(texto)) sinais.push("aviso_pagamento_duplicado");
    if (RE_REAJUSTE.test(texto)) sinais.push("reajuste");

    if (fid) {
      const f = s.fornecedor.get(fid)!;
      const banco = /banco (\d{3})/i.exec(c.anexos)?.[1];
      const cnpj = /CNPJ ([\d./-]+)/i.exec(c.anexos)?.[1];
      const hist = historicoBancos.get(fid);
      if ((c.anexos.includes("boleto") && banco && hist && hist.size && !hist.has(banco)) || (cnpj && raizCnpj(cnpj) !== raizCnpj(f.cnpj)))
        sinais.push("boleto_divergente");
    }

    const nfs = [...new Set([...tudo.matchAll(/NF\s*(\d{3,})/gi)].map((m) => normNF(m[1])))];
    const motivos: string[] = [];
    if (via === "dominio_parecido") motivos.push(`domínio ${dominioEmail(rem)} imita o cadastrado`);
    if (via === "nao_oficial") motivos.push("remetente fora do cadastro");
    if (via === "desconhecido" && sinais.includes("phishing")) motivos.push("phishing sem fornecedor");
    if (sinais.includes("boleto_divergente")) motivos.push("boleto com banco/CNPJ fora do padrão");
    if (sinais.includes("injecao_instrucao")) motivos.push("texto tenta dar instrução ao agente");
    const suspeita = motivos.length > 0;

    return {
      id: c.comunicacao_id,
      data_hora: c.data_hora,
      canal: c.canal,
      remetente: c.remetente,
      nome_remetente: c.nome_remetente,
      assunto: c.assunto,
      fornecedor_id: fid,
      via,
      sinais,
      nfs,
      suspeita,
      motivo: motivos.join("; "),
    };
  });
}
