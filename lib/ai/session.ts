// Contadores de sessão do AI Proxy + barramento de eventos para o frontend.
// Chat (chamadas/tokens) e Jev (US$) ficam SEPARADOS: nunca somar nem converter um no outro.
import { EventEmitter } from "node:events";

export type EventoCusto = {
  tipo: "chat" | "jev";
  linha: string;
  em: string; // ISO
  sessao: { chatChamadas: number; chatTokens: number; jevChamadas: number; jevUsd: number };
};

type Estado = {
  chat: { chamadas: number; tokens: number };
  jev: { chamadas: number; usd: number };
  historico: EventoCusto[];
  bus: EventEmitter;
};

// globalThis sobrevive ao hot-reload do Next em dev
const g = globalThis as unknown as { __aiProxySessao?: Estado };
export const sessao: Estado =
  g.__aiProxySessao ??
  (g.__aiProxySessao = {
    chat: { chamadas: 0, tokens: 0 },
    jev: { chamadas: 0, usd: 0 },
    historico: [],
    bus: (() => {
      const b = new EventEmitter();
      b.setMaxListeners(100);
      return b;
    })(),
  });

export function snapshot(): EventoCusto["sessao"] {
  return {
    chatChamadas: sessao.chat.chamadas,
    chatTokens: sessao.chat.tokens,
    jevChamadas: sessao.jev.chamadas,
    jevUsd: sessao.jev.usd,
  };
}

export function publicar(tipo: EventoCusto["tipo"], linha: string) {
  const ev: EventoCusto = { tipo, linha, em: new Date().toISOString(), sessao: snapshot() };
  console.log(linha); // terminal
  sessao.historico.push(ev);
  if (sessao.historico.length > 200) sessao.historico.shift();
  sessao.bus.emit("custo", ev); // frontend (SSE)
}
