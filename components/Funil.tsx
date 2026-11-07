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
    { rotulo: "Agenda total (03–13/11)", qtd: view.titulos.length, detalhe: "R$ 10,2 mi em 17 cortes MER/LIT", cor: "bg-[#2659a5]" },
    { rotulo: "Limpos (liberados pelo piso)", qtd: limpos, detalhe: "0 chamadas de LLM (custo zero)", cor: "bg-[#3dbfef]" },
    { rotulo: "Retidos para triagem (Jev + agentes)", qtd: comAchado, detalhe: `${atencao} atenção · ${bloqueio} bloqueio · risco ${brl(emRisco)}`, cor: "bg-[#f8ae13]" },
    { rotulo: "Casos abertos por fornecedor", qtd: view.casos.length, detalhe: `${view.acionamentos.length} acionamento(s) humano(s) agrupado(s)`, cor: "bg-[#e5381a]" },
  ];

  return (
    <section className="rounded-2xl border-2 border-[#2659a5] bg-white p-4 text-[#2659a5]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">Funil de auditoria da agenda</h2>
          <Pilula>Passo A → Radar → Especialistas → Cerca</Pilula>
        </div>
        <span className={`text-xs font-bold ${num}`}>{view.casos.length} caso(s) ativo(s)</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-4">
        {etapas.map((e) => {
          const pct = Math.max(6, Math.round((e.qtd / total) * 100));
          return (
            <div key={e.rotulo} className="rounded-xl border border-[#2659a5]/25 p-2.5">
              <div className="flex items-baseline justify-between gap-1 text-xs">
                <span className="font-bold">{e.rotulo}</span>
                <span className={`text-base font-bold ${num}`}>{e.qtd}</span>
              </div>
              <div className="my-1.5 h-2.5 w-full rounded-full bg-[#2659a5]/10">
                <div className={`h-2.5 rounded-full ${e.cor} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
              </div>
              <p className={`text-[11px] opacity-85 ${num}`}>{e.detalhe}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
