"use client";
// Avatar dos agentes: <img> de public/agentes/<id>.png sobre um círculo de reserva (inicial colorida).
// Mapa e derivação ficam em lib/ui/agentes.ts (re-exportados aqui como fonte única).
import { useState } from "react";
import { AGENTES, ELENCO, type AgenteId } from "@/lib/ui/agentes";

export { AGENTES, AGENTE_DO_ESPECIALISTA, TODOS_KINDS, ELENCO, agenteDoEvento, ehHumano, type AgenteId, type AgenteInfo } from "@/lib/ui/agentes";

const TAM = { sm: 24, md: 36, lg: 56 } as const;

export function AgenteAvatar({ id, size = "md", ativo = false }: { id: AgenteId; size?: keyof typeof TAM; ativo?: boolean }) {
  const a = AGENTES[id];
  const px = TAM[size];
  const [falhou, setFalhou] = useState(false);
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
        ativo ? "ring-[3px] ring-[#d7d900] ring-offset-2 ring-offset-[#2659a5] motion-safe:animate-[pulso_1.8s_ease-in-out_infinite]" : "ring-2 ring-white/40"
      }`}
      style={{ width: px, height: px, background: a.cor }}
      title={`${a.nome} — ${a.papel}`}
    >
      {/* Reserva sempre por baixo: aparece enquanto a imagem carrega ou se ela falhar. */}
      <span aria-hidden className="font-bold select-none" style={{ color: a.texto, fontSize: Math.round(px * 0.42) }}>
        {a.nome[0]}
      </span>
      {!falhou ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/agentes/${id}.png`}
          alt={`${a.nome}, ${a.papel}`}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          onError={() => setFalhou(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="sr-only">{`${a.nome}, ${a.papel}`}</span>
      )}
    </span>
  );
}

/** Faixa "Elenco": os 7 avatares com nome curto; o agente do último TraceEvento do caso fica ativo. */
export function Elenco({ ativo }: { ativo?: AgenteId }) {
  return (
    <ul aria-label="Elenco de agentes" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {ELENCO.map((id) => {
        const a = AGENTES[id];
        const ehAtivo = ativo === id;
        return (
          <li
            key={id}
            aria-current={ehAtivo ? "true" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 transition ${ehAtivo ? "bg-[#d7d900] text-[#2659a5] font-bold" : "text-white"}`}
          >
            <AgenteAvatar id={id} size="sm" ativo={ehAtivo} />
            <span className="text-xs leading-none">{a.nome}</span>
            <span className="hidden text-[10px] opacity-80 xl:inline">· {a.papel.split(":")[0]}</span>
            {ehAtivo && <span className="sr-only"> (ativo no último evento)</span>}
          </li>
        );
      })}
    </ul>
  );
}
