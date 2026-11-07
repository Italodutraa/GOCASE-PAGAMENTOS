// Loop genérico de agente com tool calling nativo do AI Proxy (testado: glm-5.3-flash e latest).
// - máx. N passos; no último, só `emitir_parecer` fica disponível e é obrigatório;
// - `validar(parecer)` é a POLÍTICA: se rejeitar, o motivo volta ao agente (até 2 retentativas) e o refazimento vira "correcao";
// - qualquer falha (proxy, JSON, orçamento) devolve parecer=null + erro → o chamador usa só o piso (semAgente).
import { chat, type MsgChat, type ToolDef } from "@/lib/ai/proxy";
import type { Acao, Especialista, Parecer, TraceEvento } from "@/lib/contratos/types";
import type { ContextoTool, RegistroTools } from "@/lib/contratos/tools";
import { consumirChamada } from "./orcamento";

const ACOES: Acao[] = ["manter", "corrigir", "retirar", "escalar", "bloquear"];

export const TOOL_PARECER: ToolDef = {
  type: "function",
  function: {
    name: "emitir_parecer",
    description: "Encerra a investigação com o parecer final sobre o caso. Obrigatório ao terminar.",
    parameters: {
      type: "object",
      properties: {
        acao: { type: "string", enum: ACOES, description: "manter | corrigir | retirar | escalar | bloquear" },
        risco: { type: "number", description: "0 a 1: probabilidade de fraude ou de pagamento indevido" },
        confianca: { type: "number", description: "0 a 1: confiança no parecer" },
        evidencias: { type: "array", items: { type: "string" }, description: "IDs que sustentam o parecer (TP…, NF…, OC-…, EM…, AC…, DDA…)" },
        resumo: { type: "string", description: "até 3 frases, em português" },
      },
      required: ["acao", "risco", "confianca", "evidencias", "resumo"],
    },
  },
};

export interface ConfigAgente {
  especialista: Especialista;
  system: string;
  usuario: string; // estado do caso (dados, nunca instruções de terceiros)
  ferramentas: string[]; // nomes permitidos no registro
  registro: RegistroTools;
  ctxTool: ContextoTool;
  emit: (ev: TraceEvento) => void;
  maxPassos?: number; // padrão 4
  maxRetentativas?: number; // padrão 2
  model?: string;
  /** Política: devolve motivo de rejeição ou null se aceito. */
  validar?: (p: Parecer) => string | null;
}

export interface ResultadoAgente {
  parecer: Parecer | null;
  erro?: string;
  rejeicoes: number;
  chamadas: number;
}

const clamp = (x: unknown) => Math.max(0, Math.min(1, Number(x) || 0));

export function parsearParecer(especialista: Especialista, raw: string): Parecer | string {
  let a: Record<string, unknown>;
  try {
    a = JSON.parse(raw);
  } catch {
    return "argumentos de emitir_parecer não são JSON válido";
  }
  if (!ACOES.includes(a.acao as Acao)) return `acao inválida: ${String(a.acao)}`;
  return {
    especialista,
    acao: a.acao as Acao,
    risco: clamp(a.risco),
    confianca: clamp(a.confianca),
    evidencias: Array.isArray(a.evidencias) ? a.evidencias.map(String).slice(0, 20) : [],
    resumo: String(a.resumo ?? "").slice(0, 600),
  };
}

export async function rodarAgente(cfg: ConfigAgente): Promise<ResultadoAgente> {
  const maxPassos = cfg.maxPassos ?? 4;
  const maxRet = cfg.maxRetentativas ?? 2;
  const nome = cfg.especialista;
  const emit = (kind: TraceEvento["kind"], texto: string, dados?: unknown) => cfg.emit({ t: Date.now(), kind, texto, agente: nome, dados });

  const permitidas = cfg.ferramentas
    .map((n) => cfg.registro.get(n))
    .filter((f): f is NonNullable<typeof f> => !!f && f.papeis.includes(cfg.ctxTool.papel));
  const defs: ToolDef[] = permitidas.map((f) => ({ type: "function", function: { name: f.nome, description: f.descricao, parameters: f.parametros } }));

  const msgs: MsgChat[] = [
    { role: "system", content: cfg.system },
    { role: "user", content: cfg.usuario },
  ];
  let rejeicoes = 0;
  let chamadas = 0;
  let passo = 0;
  let modelo = cfg.model ?? process.env.AI_AGENT_MODEL ?? "glm-5.3-flash";
  let trocouModelo = false;

  while (passo < maxPassos + maxRet) {
    const ultimo = passo >= maxPassos - 1;
    if (!consumirChamada()) return { parecer: null, erro: "orçamento global de chamadas de chat esgotado", rejeicoes, chamadas };
    let r;
    try {
      r = await chat({
        model: modelo,
        max_tokens: 2000,
        messages: msgs,
        tools: ultimo ? [TOOL_PARECER] : [...defs, TOOL_PARECER],
        tool_choice: ultimo ? "required" : "auto",
      });
      chamadas++;
    } catch (e) {
      // fallback: modelo extra indisponível (ex.: 503 "GLM indisponível") → tenta uma vez com "latest"
      if (!trocouModelo && modelo !== "latest") {
        emit("observacao", `${modelo} falhou (${(e as Error).message.slice(0, 90)}); refazendo com latest`);
        modelo = "latest";
        trocouModelo = true;
        continue;
      }
      return { parecer: null, erro: (e as Error).message, rejeicoes, chamadas };
    }
    passo++;

    if (!r.toolCalls.length) {
      // respondeu em texto: pede o parecer formal
      msgs.push({ role: "assistant", content: r.texto || "" });
      msgs.push({ role: "user", content: "Encerre chamando emitir_parecer." });
      continue;
    }
    msgs.push({ role: "assistant", content: r.texto || null, tool_calls: r.toolCalls });

    for (const tc of r.toolCalls) {
      const nomeTool = tc.function.name;
      if (nomeTool === "emitir_parecer") {
        const p = parsearParecer(nome, tc.function.arguments);
        if (typeof p === "string") {
          emit("rejeicao_politica", `parecer malformado: ${p}`);
          msgs.push({ role: "tool", tool_call_id: tc.id, content: `ERRO: ${p}. Refaça.` });
          rejeicoes++;
          if (rejeicoes > maxRet) return { parecer: null, erro: p, rejeicoes, chamadas };
          continue;
        }
        const motivo = cfg.validar?.(p) ?? null;
        if (motivo) {
          rejeicoes++;
          emit("rejeicao_politica", `política rejeitou "${p.acao}": ${motivo}`, p);
          if (rejeicoes > maxRet) return { parecer: null, erro: `rejeitado ${rejeicoes}x: ${motivo}`, rejeicoes, chamadas };
          msgs.push({ role: "tool", tool_call_id: tc.id, content: `REJEITADO PELA POLÍTICA: ${motivo}. Emita um novo parecer que respeite a regra.` });
          continue;
        }
        emit(rejeicoes > 0 ? "correcao" : "parecer", `${p.acao} (risco ${p.risco.toFixed(2)}, confiança ${p.confianca.toFixed(2)}): ${p.resumo}`, p);
        return { parecer: p, rejeicoes, chamadas };
      }

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        /* args vazios */
      }
      emit("tool_call", `${nomeTool}(${JSON.stringify(args)})`, { nome: nomeTool, args });
      const permitida = permitidas.some((f) => f.nome === nomeTool);
      const res = permitida
        ? cfg.registro.executar(nomeTool, args, cfg.ctxTool)
        : ({ ok: false, erro: `ferramenta ${nomeTool} não permitida para ${nome}` } as const);
      const conteudo = JSON.stringify(res).slice(0, 6000);
      emit("tool_result", res.ok ? `${nomeTool} ok` : `${nomeTool} erro: ${res.erro}`, res);
      if (nomeTool === "contatar_fornecedor" && res.ok) emit("resposta_fornecedor", String((res.dados as { texto?: string })?.texto ?? ""), res.dados);
      msgs.push({ role: "tool", tool_call_id: tc.id, content: conteudo });
    }
  }
  return { parecer: null, erro: "agente não emitiu parecer no limite de passos", rejeicoes, chamadas };
}
