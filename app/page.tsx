"use client";
import { useCallback, useMemo, useState } from "react";
import { BarraAutonomia } from "@/components/BarraAutonomia";
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
import { type Cenario, useExecucao } from "@/components/useExecucao";
import { CENAS, usePalco } from "@/components/usePalco";
import { calcularResumoAutonomia, type ModoPoliticaAutonomia } from "@/lib/orquestrador/autonomia";

export default function Home() {
  const ex = useExecucao();
  const [modo, setModo] = useState<"live" | "replay">("replay");
  const [humanos, setHumanos] = useState<"auto" | "manual">("auto");
  const [chat, setChat] = useState(false);
  const [palco, setPalco] = useState(false);
  const [casoSel, setCasoSel] = useState<string | undefined>();
  const [limiar, setLimiar] = useState<number>(0.9);
  const [modoPolitica, setModoPolitica] = useState<ModoPoliticaAutonomia>("estrita");
  const { view, avisar, injetar } = ex;
  const casos = useMemo(() => view?.casos ?? [], [view]);
  const avisarInfo = useCallback((t: string) => avisar(t, "info"), [avisar]);
  const selecionarCaso = useCallback((id: string | undefined) => {
    if (!id) return;
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    setCasoSel(id);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - y) > 4) {
          window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
        }
      });
    }
  }, []);
  const onInjetar = useCallback(
    async (c: Cenario) => {
      const id = await injetar(c);
      if (id) selecionarCaso(id);
    },
    [injetar, selecionarCaso],
  );
  const injetarAuto94 = useCallback(() => {
    void onInjetar("auto_efetivacao_94");
  }, [onInjetar]);
  usePalco({ palco, setPalco, casos, abrir: selecionarCaso, avisar: avisarInfo, injetarAuto94 });

  const caso = useMemo(() => casos.find((c) => c.id === casoSel) ?? casos[0], [casos, casoSel]);
  const resumoAutonomia = useMemo(
    () => (view ? calcularResumoAutonomia(view, limiar, modoPolitica) : undefined),
    [view, limiar, modoPolitica],
  );

  if (!view || !resumoAutonomia)
    return <main className="flex min-h-[60vh] items-center justify-center text-sm font-bold text-[#2659a5]">Carregando execução…</main>;

  const pendentes = view.acionamentos.filter((a) => a.status === "pendente").length;
  const modoEfetivo = modo === "live" && !view.liveDisponivel ? "replay" : modo;

  const pilulaAutonomia = (
    <BarraAutonomia
      limiar={limiar}
      setLimiar={setLimiar}
      modoPolitica={modoPolitica}
      setModoPolitica={setModoPolitica}
      resumo={resumoAutonomia}
    />
  );

  return (
    <>
      {!palco ? (
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
          autonomia={pilulaAutonomia}
        />
      ) : (
        <nav className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b-4 border-[#d7d900] bg-[#2659a5] px-4 py-2.5 text-xs text-white shadow-md">
          <Pilula>Modo Palco</Pilula>
          {CENAS.map((c) => {
            const alvo = casos.find(c.acha);
            const ativo = alvo && alvo.id === caso?.id;
            const podeInjetar5 = c.tecla === "5" && !alvo;
            return (
              <button
                type="button"
                key={c.tecla}
                disabled={!alvo && !podeInjetar5}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (alvo ? selecionarCaso(alvo.id) : podeInjetar5 ? injetarAuto94() : undefined)}
                className={`rounded-full border-2 px-3 py-1 font-bold disabled:opacity-40 ${
                  ativo ? "border-[#d7d900] bg-[#d7d900] text-[#2659a5]" : "border-white text-white hover:bg-white hover:text-[#2659a5]"
                }`}
              >
                <kbd className="mr-1.5 rounded bg-[#2659a5] px-1 font-mono text-white">{c.tecla}</kbd>
                {c.rotulo}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            {pilulaAutonomia}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPalco(false)}
              className="rounded-full border border-white/60 px-3 py-1 font-bold text-[#d7d900] hover:bg-white/10"
            >
              Sair (P / Esc)
            </button>
          </div>
        </nav>
      )}
      <main className={`grid gap-4 p-4 [overflow-anchor:none] ${palco ? "mx-auto max-w-5xl pt-6" : "lg:grid-cols-[minmax(320px,380px)_1fr]"}`}>
        {!palco && (
          <div className="min-w-0">
            {view.titulos.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-[#2659a5]/30 p-6 text-center text-sm text-[#2659a5]">Nenhum título na agenda.</p>
            ) : (
              <ListaTitulos titulos={view.titulos} selecionado={caso?.id} onSelect={(id) => selecionarCaso(id)} />
            )}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-3.5">
          {!palco && <Funil view={view} />}
          {!palco && <CartaoRenata acionamentos={view.acionamentos} onAbrirChat={() => setChat(true)} />}
          {!palco && <BotoesInjecao onInjetar={onInjetar} desabilitado={!!ex.ocupado} />}
          <PainelCaso
            caso={caso}
            recibo={caso ? resumoAutonomia.porCaso[caso.id] : undefined}
            limiar={limiar}
            titulos={view.titulos}
          />
        </div>
      </main>
      {!palco && <Placar view={view} resumoAutonomia={resumoAutonomia} />}
      {!palco && (
        <p className="px-4 pb-16 text-xs font-semibold text-[#2659a5]">
          Atalho: tecla <kbd className="rounded bg-[#2659a5] px-1.5 py-0.5 font-mono text-white">P</kbd> abre o modo Palco (cenas 1–5: Embalarte, duplicidades, injeção EM570996, agente barrado, auto-efetivação 94%).
        </p>
      )}
      <GavetaChat aberta={chat} onClose={() => setChat(false)} acionamentos={view.acionamentos} onAcao={(id, d) => ex.acao(id, d)} ocupado={!!ex.ocupado} />
      <Toasts toasts={ex.toasts} />
    </>
  );
}
