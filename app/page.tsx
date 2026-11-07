"use client";
import { useMemo, useState } from "react";
import { BotoesInjecao } from "@/components/BotoesInjecao";
import { GavetaChat } from "@/components/GavetaChat";
import { ListaTitulos } from "@/components/ListaTitulos";
import { PainelCaso } from "@/components/PainelCaso";
import { Placar } from "@/components/Placar";
import { Toasts } from "@/components/Toasts";
import { TopBar } from "@/components/TopBar";
import { useExecucao } from "@/components/useExecucao";

export default function Home() {
  const ex = useExecucao();
  const [modo, setModo] = useState<"live" | "replay">("replay");
  const [humanos, setHumanos] = useState<"auto" | "manual">("auto");
  const [chat, setChat] = useState(false);
  const [casoSel, setCasoSel] = useState<string | undefined>();
  const { view } = ex;

  const caso = useMemo(() => view?.casos.find((c) => c.id === casoSel) ?? view?.casos[0], [view, casoSel]);

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
      <main className="grid gap-4 p-4 lg:grid-cols-[minmax(320px,380px)_1fr]">
        <div className="min-w-0">
          {view.titulos.length === 0 ? (
            <p className="rounded border border-dashed border-white/15 p-6 text-center text-sm opacity-60">Nenhum título na agenda.</p>
          ) : (
            <ListaTitulos titulos={view.titulos} selecionado={caso?.id} onSelect={(id) => id && setCasoSel(id)} />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <BotoesInjecao onInjetar={ex.injetar} desabilitado={!!ex.ocupado} />
          <PainelCaso caso={caso} />
        </div>
      </main>
      <Placar view={view} />
      <GavetaChat aberta={chat} onClose={() => setChat(false)} acionamentos={view.acionamentos} onAcao={(id, d) => ex.acao(id, d)} ocupado={!!ex.ocupado} />
      <Toasts toasts={ex.toasts} />
    </>
  );
}
