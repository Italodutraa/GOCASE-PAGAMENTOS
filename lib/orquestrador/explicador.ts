// PASSO C: o Chat só REDIGE a mensagem de acionamento (destinatário, títulos e valor vêm do código).
// O crítico confere; se falhar, vale o template determinístico.
import { chat } from "@/lib/ai/proxy";
import type { Store } from "@/lib/data/store";
import { consumirChamada } from "@/lib/agents/orcamento";
import { criticarMensagem, templateAcionamento } from "./critico";

export const NOMES: Record<string, string> = {
  aprovador: "Cláudia (aprovadora)",
  PS01: "Renata",
  PS02: "Marcos",
  PS03: "Helena",
  PS04: "Carla",
  PS05: "Diego",
  PS06: "Bruno",
  PS07: "Fernanda",
  PS08: "Lívia",
  PS09: "Rafael",
  PS10: "Tiago",
  PS11: "Paula",
};

export interface PedidoRedacao {
  pessoa: string;
  titulos: string[];
  valorTotal: number;
  motivos: string[];
  acoes: string[];
  fornecedores: string[];
  evidencias: string[];
  resumoCasos: string; // decisões e pareceres resumidos (dados internos)
}

export async function redigirAcionamento(p: PedidoRedacao, s: Store, live: boolean): Promise<{ mensagem: string; fonte: "llm" | "template"; critico: string }> {
  const template = templateAcionamento({
    pessoa: p.pessoa,
    nomePessoa: NOMES[p.pessoa] ?? p.pessoa,
    titulos: p.titulos,
    valorTotal: p.valorTotal,
    motivo: p.motivos.join("; "),
    acaoSolicitada: p.acoes.join(" + ") || undefined,
    fornecedor: p.fornecedores.join(", "),
    evidencias: p.evidencias,
  });
  if (!live || !consumirChamada()) return { mensagem: template, fonte: "template", critico: "modo sem LLM: template determinístico" };
  try {
    const r = await chat({
      model: process.env.AI_CHAT_MODEL || "latest",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content:
            "Você redige mensagens curtas (máx. 5 frases) de um agente de contas a pagar para uma pessoa da empresa, pedindo uma decisão. Português do Brasil, direto, sem saudação longa. Cite TODOS os IDs de título informados (se forem mais de 8, cite o primeiro e o total de títulos) e o valor total exatamente como informado. Não invente IDs, valores nem fatos. Termine com a pergunta objetiva.",
        },
        {
          role: "user",
          content: JSON.stringify({ destinatario: NOMES[p.pessoa] ?? p.pessoa, acao_solicitada: p.acoes, motivos: p.motivos, fornecedores: p.fornecedores, titulos: p.titulos, quantidade_titulos: p.titulos.length, valor_total: p.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), evidencias: p.evidencias.slice(0, 10), contexto: p.resumoCasos.slice(0, 3000) }),
        },
      ],
    });
    const c = criticarMensagem(r.texto, p.titulos, p.valorTotal, s);
    if (c.ok) return { mensagem: r.texto.trim(), fonte: "llm", critico: c.motivo };
    return { mensagem: template, fonte: "template", critico: `crítico reprovou a redação do LLM (${c.motivo}); usado template` };
  } catch (e) {
    return { mensagem: template, fonte: "template", critico: `falha no LLM (${(e as Error).message.slice(0, 80)}); usado template` };
  }
}
