"use client";
import { useState } from "react";

export default function Home() {
  const [res, setRes] = useState<unknown>(null);
  const [carregando, setCarregando] = useState(false);

  async function testar() {
    setCarregando(true);
    try {
      const r = await fetch("/api/ping", { method: "POST" });
      setRes(await r.json());
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Guardião de Pagamentos</h1>
      <p className="mt-1 text-sm opacity-70">M0: esqueleto + wrapper do AI Proxy. Painel de Lotes e Simulador de Chat chegam nos próximos marcos.</p>
      <button
        onClick={testar}
        disabled={carregando}
        className="mt-6 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {carregando ? "Testando…" : "Testar AI Proxy (chat + Jev)"}
      </button>
      {res !== null && (
        <pre className="mt-4 overflow-x-auto rounded-md bg-black/5 p-4 text-xs dark:bg-white/5">{JSON.stringify(res, null, 2)}</pre>
      )}
    </main>
  );
}
