"use client";
// Modo Palco: tecla P liga/desliga; 1–4 abrem as cenas da demo; Esc sai.
import { useEffect } from "react";
import type { CasoView } from "@/lib/contratos/types";

export const CENAS: { tecla: string; rotulo: string; acha: (c: CasoView) => boolean }[] = [
  { tecla: "1", rotulo: "Golpe Embalarte", acha: (c) => c.fornecedor_id === "FP4615" },
  { tecla: "2", rotulo: "Duplicidades", acha: (c) => c.tipo === "duplicidade" },
  { tecla: "3", rotulo: "Injeção EM570996", acha: (c) => c.trace.some((e) => e.kind === "injecao" && e.texto.includes("EM570996")) },
  { tecla: "4", rotulo: "Agente barrado", acha: (c) => c.trace.some((e) => e.kind === "rejeicao_politica") },
  { tecla: "5", rotulo: "⚡ Auto-Efetivação 94%", acha: (c) => c.id === "caso-inj-auto_efetivacao_94" || c.tipo === "auto_cura_dda" },
];

export function usePalco(opts: {
  palco: boolean;
  setPalco: (f: (p: boolean) => boolean) => void;
  casos: CasoView[];
  abrir: (id: string) => void;
  avisar: (t: string) => void;
  injetarAuto94?: () => void;
}) {
  const { palco, setPalco, casos, abrir, avisar, injetarAuto94 } = opts;
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const alvo = ev.target as HTMLElement | null;
      if (ev.ctrlKey || ev.metaKey || ev.altKey || (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) || alvo?.isContentEditable) return;
      if (ev.key === "p" || ev.key === "P") return setPalco((p) => !p);
      if (ev.key === "Escape") return setPalco(() => false);
      const cena = CENAS.find((c) => c.tecla === ev.key);
      if (!cena) return;
      const caso = casos.find(cena.acha);
      if (caso) {
        abrir(caso.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (ev.key === "5" && injetarAuto94) {
        injetarAuto94();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else avisar(`Cena "${cena.rotulo}" ainda não disponível: avance até o próximo corte.`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPalco, casos, abrir, avisar, injetarAuto94]);

  // Palco amplia tudo que é medido em rem (Tailwind) para leitura no projetor.
  useEffect(() => {
    document.documentElement.style.fontSize = palco ? "19px" : "";
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [palco]);
}
