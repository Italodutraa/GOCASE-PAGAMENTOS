"use client";
import { HojeView } from "@/components/HojeView";
import { Toasts } from "@/components/Toasts";
import { useExecucao } from "@/components/useExecucao";

export default function Hoje() {
  const ex = useExecucao();
  // mesma chamada do botão "Avançar" da tela técnica: só usa o modo com IA se o servidor o tiver liberado
  const modo = ex.view?.liveDisponivel ? "live" : "replay";
  return (
    <>
      <HojeView view={ex.view} erro={ex.exemplo} ocupado={ex.ocupado} onConferir={() => void ex.avancar(modo, "auto")} onAcao={(id, d) => void ex.acao(id, d)} onTentar={() => void ex.refresh()} />
      <Toasts toasts={ex.toasts} />
    </>
  );
}
