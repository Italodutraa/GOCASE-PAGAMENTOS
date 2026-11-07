import type { ExecucaoView } from "@/lib/contratos/types";
import { brl, num, Pilula } from "./ui";

export function Funil({ view }: { view: ExecucaoView }) {
  const total = view.titulos.length || 1;
  const limpos = view.titulos.filter((t) => t.status === "limpo").length;
  const atencao = view.titulos.filter((t) => t.status === "atencao").length;
  const bloqueio = view.titulos.filter((t) => t.status === "bloqueio").length;
  const comAchado = total - limpos;
  const emRisco = view.titulos.reduce((s, t) => s + t.valorEmRisco, 0);
  const etapas = [
    { rotulo: "Agenda total", qtd: view.titulos.length, detalhe: "R$ 10,2 mi · 17 cortes", cor: "bg-[#2659a5]" },
    { rotulo: "Limpos (piso)", qtd: limpos, detalhe: "0 tokens de IA", cor: "bg-[#3dbfef]" },
    { rotulo: "Triagem IA", qtd: comAchado, detalhe: `${atencao} atenção · ${bloqueio} bloq. (${brl(emRisco)})`, cor: "bg-[#f8ae13]" },
    { rotulo: "Casos abertos", qtd: view.casos.length, detalhe: `${view.acionamentos.length} acionamento(s)`, cor: "bg-[#e5381a]" },
  ];

  return (
    <section className="rounded-2xl border border-[#2659a5]/30 bg-white px-4 py-3 text-[#2659a5] shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide">Funil de Auditoria</h2>
          <Pilula>Passo A → Radar → Especialistas → Cerca</Pilula>
        </div>
        <span className={`text-xs font-bold ${num}`}>{view.casos.length} caso(s) ativo(s)</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {etapas.map((e) => {
          const pct = Math.max(6, Math.round((e.qtd / total) * 100));
          return (
            <div key={e.rotulo} className="rounded-xl border border-[#2659a5]/15 px-2.5 py-2">
              <div className="flex items-baseline justify-between gap-1 text-xs">
                <span className="font-bold">{e.rotulo}</span>
                <span className={`text-sm font-bold ${num}`}>{e.qtd}</span>
              </div>
              <div className="my-1 h-1.5 w-full rounded-full bg-[#2659a5]/10">
                <div className={`h-1.5 rounded-full ${e.cor} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
              </div>
              <p className={`truncate text-[10px] opacity-80 ${num}`}>{e.detalhe}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
