"use client";
import type { Acionamento } from "@/lib/contratos/types";
import { Avatar, PESSOAS } from "./Avatar";
import { brl, num, Pilula, SeloSimulado } from "./ui";

export function CartaoRenata({ acionamentos, onAbrirChat }: { acionamentos: Acionamento[]; onAbrirChat: () => void }) {
  const renata = PESSOAS.PS01;
  const dela = acionamentos.filter((a) => a.pessoa === "PS01");
  const aprovados = dela.filter((a) => a.status === "aprovado").length;
  const pendentes = dela.filter((a) => a.status === "pendente").length;
  const valorTotal = dela.reduce((s, a) => s + a.valorTotal, 0);
  const ultima = dela[dela.length - 1];

  return (
    <section className="rounded-2xl border-2 border-[#2659a5] bg-[#2659a5] p-4 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar id="PS01" tamanho={44} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold">{renata.nome}</h2>
              <Pilula>PS01 · {renata.papel}</Pilula>
              <SeloSimulado texto="persona simulada" />
            </div>
            <p className="mt-0.5 text-xs opacity-90">Alçada: {renata.alçada}</p>
          </div>
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onAbrirChat}
          className="rounded-full bg-[#d7d900] px-3.5 py-1.5 text-xs font-bold text-[#2659a5] hover:bg-[#3dbfef]"
        >
          Abrir WhatsApp simulado ({dela.length})
        </button>
      </div>
      <dl className={`mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 ${num}`}>
        <div className="rounded-xl bg-white p-2 text-[#2659a5]">
          <dt className="text-[10px] font-semibold uppercase">Acionamentos</dt>
          <dd className="text-sm font-bold">{dela.length} (1 por caso/janela)</dd>
        </div>
        <div className="rounded-xl bg-white p-2 text-[#2659a5]">
          <dt className="text-[10px] font-semibold uppercase">Aprovados / Pendentes</dt>
          <dd className="text-sm font-bold">
            {aprovados} / {pendentes}
          </dd>
        </div>
        <div className="rounded-xl bg-white p-2 text-[#2659a5]">
          <dt className="text-[10px] font-semibold uppercase">Valor sob dupla alçada</dt>
          <dd className="text-sm font-bold">{brl(valorTotal)}</dd>
        </div>
        <div className="rounded-xl bg-white p-2 text-[#2659a5]">
          <dt className="text-[10px] font-semibold uppercase">Regra de ouro</dt>
          <dd className="text-[11px] font-bold">Não misturar fornecedores</dd>
        </div>
      </dl>
      {ultima?.resposta && (
        <p className="mt-2.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs">
          <span className="font-bold text-[#d7d900]">Último despacho ({ultima.janela}):</span> “{ultima.resposta.motivo}”
        </p>
      )}
    </section>
  );
}
