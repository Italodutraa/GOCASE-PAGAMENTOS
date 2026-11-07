// Wrapper ÚNICO para o AI Proxy do evento. Nenhum outro arquivo faz fetch ao proxy.
// - Token só de process.env.AI_PROXY_API_KEY; nunca é logado nem devolvido.
// - Bloqueia deepseek-*.
// - Toda chamada publica a linha 💲 (terminal + frontend).
import { linhaChat, linhaJev, MODELO_BLOQUEADO } from "./format";
import { publicar, sessao } from "./session";

if (typeof window !== "undefined") throw new Error("lib/ai/proxy só pode rodar no servidor");

const BASE = process.env.AI_PROXY_BASE_URL || "https://ai-proxy.gogroupbr.com/v1";
const TIMEOUT_MS = 120_000;
const MAX_TENTATIVAS = 3;

export class ProxyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function token(): string {
  const t = process.env.AI_PROXY_API_KEY;
  if (!t) throw new ProxyError(0, "AI_PROXY_API_KEY ausente (defina em .env / .env.local)");
  return t;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(path: string, body: unknown): Promise<{ json: any; headers: Headers }> {
  const auth = `Bearer ${token()}`;
  for (let tentativa = 1; ; tentativa++) {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { json: await res.json(), headers: res.headers };

    const texto = await res.text().catch(() => "");
    const podeRepetir = [429, 502, 503].includes(res.status) && tentativa < MAX_TENTATIVAS;
    if (!podeRepetir) {
      // mensagem do upstream, sem headers (o token nunca aparece)
      throw new ProxyError(res.status, `AI Proxy ${path} → HTTP ${res.status}: ${texto.slice(0, 300)}`);
    }
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    await espera(res.status === 429 && reset > 0 ? reset * 1000 : 500 * 2 ** tentativa);
  }
}

// ---------------- Chat ----------------
export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type MsgChat =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };
export type ToolDef = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };
export type ChatReq = {
  model?: string;
  messages: MsgChat[];
  max_tokens?: number;
  temperature?: number;
  tools?: ToolDef[];
  tool_choice?: "auto" | "none" | "required";
  response_format?: { type: "json_object" };
  reasoning_effort?: "minimal" | "low" | "medium" | "high";
};
export type ChatRes = { texto: string; toolCalls: ToolCall[]; modelo: string; entrada: number; saida: number; linhaCusto: string };

export async function chat(req: ChatReq): Promise<ChatRes> {
  const model = req.model || process.env.AI_CHAT_MODEL || "latest";
  if (MODELO_BLOQUEADO.test(model)) throw new ProxyError(400, `modelo ${model} bloqueado no evento`);
  // modelos extras raciocinam antes de responder: max_tokens mínimo 2000
  const extra = /^(glm|mimo|k3|kimi)/i.test(model);
  const max_tokens = extra ? Math.max(req.max_tokens ?? 2000, 2000) : req.max_tokens;

  const { json, headers } = await post("/chat/completions", { ...req, model, ...(max_tokens ? { max_tokens } : {}) });
  const modelo = headers.get("x-model-served") || json.model || model;
  const entrada = Number(json.usage?.prompt_tokens ?? 0);
  const saida = Number(json.usage?.completion_tokens ?? 0);

  sessao.chat.chamadas += 1;
  sessao.chat.tokens += entrada + saida;
  const raciocinio = Number(json.usage?.completion_tokens_details?.reasoning_tokens ?? 0);
  const linhaCusto = linhaChat(modelo, entrada, saida, sessao.chat.chamadas, sessao.chat.tokens, raciocinio);
  publicar("chat", linhaCusto);

  const msg = json.choices?.[0]?.message ?? {};
  return { texto: msg.content ?? "", toolCalls: msg.tool_calls ?? [], modelo, entrada, saida, linhaCusto };
}

// ---------------- Jev (/v1/systemone) ----------------
export type JevPergunta =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] }
  | { type: "noul"; instructions: string };

export type JevResposta =
  | { type: "choice"; choice: string; confidence?: number; probabilities?: Record<string, number> }
  | { type: "score"; score: number; confidence?: number; legend?: Record<string, string>; probabilities?: Record<string, number> }
  | { type: "noul"; noul: number };

export type JevReq<Q extends Record<string, JevPergunta>> = { state: unknown; questions: Q };
export type JevRes<Q extends Record<string, JevPergunta>> = {
  respostas: { [K in keyof Q]: JevResposta };
  modelo: string;
  entrada: number;
  custoUsd: number;
  linhaCusto: string;
};

const LIMITE_JEV = 200_000; // caracteres (413 acima disso)

export async function jev<Q extends Record<string, JevPergunta>>(req: JevReq<Q>): Promise<JevRes<Q>> {
  const tamanho = JSON.stringify(req).length;
  if (tamanho > LIMITE_JEV) throw new ProxyError(413, `state do Jev com ${tamanho} caracteres (> ${LIMITE_JEV})`);

  const { json, headers } = await post("/systemone", req);
  const modelo = json.model || "jev";
  const entrada = Number(json.usage?.input_tokens ?? 0);
  const custoUsd = Number(json.usage?.estimated_cost_usd ?? headers.get("x-estimated-cost-usd") ?? 0);

  sessao.jev.chamadas += 1;
  sessao.jev.usd = Math.round((sessao.jev.usd + custoUsd) * 1e10) / 1e10;
  const linhaCusto = linhaJev(modelo, entrada, custoUsd, sessao.jev.usd);
  publicar("jev", linhaCusto);

  return { respostas: json.answers, modelo, entrada, custoUsd, linhaCusto };
}

// ---------------- Modelos (filtra deepseek) ----------------
export async function listarModelos(): Promise<string[]> {
  const res = await fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${token()}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new ProxyError(res.status, `AI Proxy /models → HTTP ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map((m: { id: string }) => m.id).filter((id: string) => !MODELO_BLOQUEADO.test(id));
}
