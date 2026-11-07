"use client";
import { useCallback, useMemo, useState } from "react";
import { BotoesInjecao } from "@/components/BotoesInjecao";
import { CartaoRenata } from "@/components/CartaoRenata";
import { Funil } from "@/components/Funil";
import { GavetaChat } from "@/components/GavetaChat";
import { ListaTitulos } from "@/components/ListaTitulos";
import { PainelCaso } from "@/components/PainelCaso";
import { Placar } from "@/components/Placar";
import { Toasts } from "@/components/Toasts";
import { TopBar } from "@/components/TopBar";
import { Pilula } from "@/components/ui";
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

  if (!view) return <main className="flex min-h-[60vh] items-center justify-center text-sm font-bold text-[#2659a5]">Carregando execução…</main>;

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
        <nav className="sticky top-[62px] z-20 flex flex-wrap items-center gap-2 border-b-2 border-[#d7d900] bg-[#2659a5] px-4 py-2 text-xs text-white shadow">
          <Pilula>Modo Palco</Pilula>
          {CENAS.map((c) => {
            const alvo = casos.find(c.acha);
            const ativo = alvo && alvo.id === caso?.id;
            return (
              <button
                key={c.tecla}
                disabled={!alvo}
                onClick={() => alvo && setCasoSel(alvo.id)}
                className={`rounded-full border-2 px-3 py-1 font-bold disabled:opacity-40 ${
                  ativo ? "border-[#d7d900] bg-[#d7d900] text-[#2659a5]" : "border-white text-white hover:bg-white hover:text-[#2659a5]"
                }`}
              >
                <kbd className="mr-1.5 rounded bg-[#2659a5] px-1 font-mono text-white">{c.tecla}</kbd>
                {c.rotulo}
              </button>
            );
          })}
          <span className="ml-auto font-semibold text-[#d7d900]">P ou Esc para sair</span>
        </nav>
      )}
      <main className={`grid gap-4 p-4 ${palco ? "mx-auto max-w-6xl" : "lg:grid-cols-[minmax(320px,380px)_1fr]"}`}>
        {!palco && (
          <div className="min-w-0">
            {view.titulos.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-[#2659a5]/30 p-6 text-center text-sm text-[#2659a5]">Nenhum título na agenda.</p>
            ) : (
              <ListaTitulos titulos={view.titulos} selecionado={caso?.id} onSelect={(id) => id && setCasoSel(id)} />
            )}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-4">
          {!palco && <Funil view={view} />}
          {!palco && <CartaoRenata acionamentos={view.acionamentos} onAbrirChat={() => setChat(true)} />}
          {!palco && <BotoesInjecao onInjetar={ex.injetar} desabilitado={!!ex.ocupado} />}
          <PainelCaso caso={caso} />
        </div>
      </main>
      <Placar view={view} />
      {!palco && (
        <p className="px-4 pb-16 text-xs font-semibold text-[#2659a5]">
          Atalho: tecla <kbd className="rounded bg-[#2659a5] px-1.5 py-0.5 font-mono text-white">P</kbd> abre o modo Palco (cenas 1–4: Embalarte, duplicidades, injeção EM570996, agente barrado).
        </p>
      )}
      <GavetaChat aberta={chat} onClose={() => setChat(false)} acionamentos={view.acionamentos} onAcao={(id, d) => ex.acao(id, d)} ocupado={!!ex.ocupado} />
      <Toasts toasts={ex.toasts} />
    </>
  );
}
