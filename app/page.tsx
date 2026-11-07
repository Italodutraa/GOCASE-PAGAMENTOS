"use client";
import { useCallback, useMemo, useState } from "react";
import { BotoesInjecao } from "@/components/BotoesInjecao";
import { GavetaChat } from "@/components/GavetaChat";
import { ListaTitulos } from "@/components/ListaTitulos";
import { PainelCaso } from "@/components/PainelCaso";
import { Placar } from "@/components/Placar";
import { Toasts } from "@/components/Toasts";
import { TopBar } from "@/components/TopBar";
import { useExecucao } from "@/components/useExecucao";
import { CENAS, usePalco } from "@/components/usePalco";

export default function Home() {
  const ex = useExecucao();
  const [modo, setModo] = useState<"live" | "replay">("replay");
  const [humanos, setHumanos] = useState<"auto" | "manual">("auto");
  const [chat, setChat] = useState(false);
  const [palco, setPalco] = useState(false);
  const [casoSel, setCasoSel] = useState<string | undefined>();
  const { view, avisar } = ex;
  const casos = useMemo(() => view?.casos ?? [], [view]);
  const avisarInfo = useCallback((t: string) => avisar(t, "info"), [avisar]);
  usePalco({ palco, setPalco, casos, abrir: setCasoSel, avisar: avisarInfo });

  const caso = useMemo(() => casos.find((c) => c.id === casoSel) ?? casos[0], [casos, casoSel]);

  if (!view) return <main className="flex min-h-[60vh] items-center justify-center text-sm opacity-70">Carregando execução…</main>;

  const pendentes = view.acionamentos.filter((a) => a.status === "pendente").length;
  const modoEfetivo = modo === "live" && !view.liveDisponivel ? "replay" : modo;

  return (
    <>
      <TopBar
        view={view}
        exemplo={ex.exemplo}
        ocupado={ex.ocupado}
        modo={modoEfetivo}
        setModo={setModo}
        humanos={humanos}
        setHumanos={setHumanos}
        onAvancar={() => ex.avancar(modoEfetivo, humanos)}
        onReset={ex.reset}
        onChat={() => setChat(true)}
        pendentes={pendentes}
      />
      {palco && (
        <nav className="sticky top-[57px] z-20 flex flex-wrap items-center gap-2 border-b border-sky-400/30 bg-[#0c1a24]/95 px-4 py-2 text-xs backdrop-blur">
          <span className="mr-1 font-bold uppercase tracking-[0.14em] text-sky-300">Palco</span>
          {CENAS.map((c) => {
            const alvo = casos.find(c.acha);
            const ativo = alvo && alvo.id === caso?.id;
            return (
              <button
                key={c.tecla}
                disabled={!alvo}
                onClick={() => alvo && setCasoSel(alvo.id)}
                className={`rounded-md border px-2.5 py-1 disabled:opacity-40 ${ativo ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-white/15 hover:bg-white/10"}`}
              >
                <kbd className="mr-1.5 rounded bg-white/10 px-1 font-mono">{c.tecla}</kbd>
                {c.rotulo}
              </button>
            );
          })}
          <span className="ml-auto opacity-60">P ou Esc para sair</span>
        </nav>
      )}
      <main className={`grid gap-4 p-4 ${palco ? "mx-auto max-w-6xl" : "lg:grid-cols-[minmax(320px,380px)_1fr]"}`}>
        {!palco && (
          <div className="min-w-0">
            {view.titulos.length === 0 ? (
              <p className="rounded border border-dashed border-white/15 p-6 text-center text-sm opacity-60">Nenhum título na agenda.</p>
            ) : (
              <ListaTitulos titulos={view.titulos} selecionado={caso?.id} onSelect={(id) => id && setCasoSel(id)} />
            )}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-4">
          {!palco && <BotoesInjecao onInjetar={ex.injetar} desabilitado={!!ex.ocupado} />}
          <PainelCaso caso={caso} />
        </div>
      </main>
      <Placar view={view} />
      {!palco && (
        <p className="px-4 pb-16 text-[11px] opacity-50">
          Atalho: tecla <kbd className="rounded bg-white/10 px-1 font-mono">P</kbd> abre o modo Palco (cenas 1–4).
        </p>
      )}
      <GavetaChat aberta={chat} onClose={() => setChat(false)} acionamentos={view.acionamentos} onAcao={(id, d) => ex.acao(id, d)} ocupado={!!ex.ocupado} />
      <Toasts toasts={ex.toasts} />
    </>
  );
}
