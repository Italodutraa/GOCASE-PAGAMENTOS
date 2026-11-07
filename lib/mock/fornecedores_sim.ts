// Fornecedores simulados (determinístico). Responde SEMPRE pelo canal do cadastro; a mensagem do agente é só contexto.
import type { Store } from "@/lib/data/store";
import type { RespostaFornecedor } from "@/lib/contratos/types";

export type CanalContato = "email" | "telefone";
/** Roteiro extra (cenários injetados): devolve texto+confirma ou undefined para cair no roteiro padrão. */
export type Roteiro = (mensagem: string, store: Store) => { texto: string; confirma: boolean } | undefined;

const extras = new Map<string, Roteiro>();

export function registrarRoteiro(fornecedor_id: string, fn: Roteiro) {
  extras.set(fornecedor_id, fn);
}
export function limparRoteirosExtras() {
  extras.clear();
}

const ROTEIRO: Record<string, { texto: string; confirma: boolean }> = {
  FP4615: {
    texto:
      "Não trocamos de banco. Continuamos recebendo no banco 774 (Cooperativa Serrana). Não reconhecemos o domínio embalartte.com.br nem enviamos nenhum pedido de alteração de dados bancários.",
    confirma: false,
  },
  FP4345: {
    texto:
      "Não emitimos 2ª via da NF 57551. O boleto válido é o do Banco Horizonte (289). O boleto de outro banco não é nosso.",
    confirma: false,
  },
  FP5079: { texto: "Confirmamos a troca de conta já registrada no cadastro. Podem pagar na conta nova.", confirma: true },
  FP3614: { texto: "Confirmamos a troca de conta já registrada no cadastro. Podem pagar na conta nova.", confirma: true },
  FP4202: { texto: "Confirmamos a troca de conta já registrada no cadastro. Podem pagar na conta nova.", confirma: true },
  FP3345: { texto: "Confirmamos a troca de conta já registrada no cadastro. Podem pagar na conta nova.", confirma: true },
  FP3062: { texto: "Confirmamos que já recebemos o pagamento avulso do fim de outubro. Não há saldo em aberto desse título.", confirma: true },
  FP6624: { texto: "Confirmamos que já recebemos o pagamento avulso do fim de outubro. Não há saldo em aberto desse título.", confirma: true },
  FP4939: { texto: "Confirmamos que já recebemos o pagamento avulso do fim de outubro. Não há saldo em aberto desse título.", confirma: true },
};

export function responderFornecedor(fornecedor_id: string, mensagem: string, store: Store, canalPreferido: CanalContato = "telefone"): RespostaFornecedor {
  const f = store.fornecedor.get(fornecedor_id);
  const canal = !f
    ? "email:desconhecido"
    : canalPreferido === "email"
      ? `email:${f.email_cadastrado}`
      : `telefone:${f.telefone_cadastrado}`;

  let r: { texto: string; confirma: boolean } | undefined;
  try {
    r = extras.get(fornecedor_id)?.(mensagem, store);
  } catch {
    r = undefined;
  }
  r ??= ROTEIRO[fornecedor_id];
  r ??= f
    ? { texto: `Confirmamos que os dados do nosso cadastro estão corretos e atualizados (${f.nome_fantasia}).`, confirma: true }
    : { texto: "Fornecedor não localizado no cadastro; não foi possível contatar.", confirma: false };
  return { fornecedor: fornecedor_id, canal, texto: r.texto, confirma: r.confirma, simulada: true };
}
