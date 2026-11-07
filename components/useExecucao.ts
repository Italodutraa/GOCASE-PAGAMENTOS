"use client";
// Hook de dados da UI: GET /api/estado com fallback para o mock; ações via POST.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ExecucaoView } from "@/lib/contratos/types";
import { execucaoMock } from "@/lib/mock/execucao.mock";

export type Cenario = "troca_conta_fornecedor_novo" | "cnpj_clonado" | "injecao_prompt_v2" | "auto_efetivacao_94";
export type Decisao = "aprovar" | "recusar" | "mais_info";
export type Toast = { id: number; texto: string; tipo: "erro" | "info" };

export function useExecucao() {
  const [view, setView] = useState<ExecucaoView | null>(null);
  const [exemplo, setExemplo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const avisar = useCallback((texto: string, tipo: Toast["tipo"] = "erro") => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, texto, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/estado", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as ExecucaoView;
      if (!j || !Array.isArray(j.titulos)) throw new Error("formato");
      setView(j);
      setExemplo(false);
    } catch {
      setView((v) => v ?? execucaoMock);
      setExemplo(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const post = useCallback(
    async (rota: string, corpo: unknown, rotulo: string): Promise<Record<string, unknown> | null> => {
      const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
      const restaurarScroll = () => {
        if (typeof window === "undefined") return;
        requestAnimationFrame(() => {
          if (Math.abs(window.scrollY - scrollY) > 4) {
            window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
          }
        });
      };
      setOcupado(rotulo);
      restaurarScroll();
      try {
        const r = await fetch(rota, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo ?? {}) });
        if (!r.ok) {
          avisar(r.status === 404 ? `Rota ${rota} ainda não disponível (usando dados de exemplo).` : `Falha em ${rotulo} (HTTP ${r.status}).`);
          return null;
        }
        return (await r.json().catch(() => null)) as Record<string, unknown> | null;
      } catch {
        avisar(`Não foi possível chamar ${rota}.`);
        return null;
      } finally {
        await refresh();
        setOcupado(null);
        restaurarScroll();
      }
    },
    [avisar, refresh],
  );

  return {
    view,
    exemplo,
    ocupado,
    toasts,
    refresh,
    avisar,
    avancar: (modo: "live" | "replay", humanos: "auto" | "manual") => post("/api/avancar", { modo, humanos }, "avançar"),
    acao: (acionamentoId: string, decisao: Decisao, motivo?: string) => post("/api/acao", { acionamentoId, decisao, motivo }, "ação"),
    injetar: async (cenario: Cenario): Promise<string | undefined> => {
      const res = await post("/api/injetar", { cenario }, "injetar");
      return typeof res?.casoId === "string" ? res.casoId : undefined;
    },
    reset: () => post("/api/reset", {}, "reset"),
  };
}
