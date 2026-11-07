import type { Parecer } from "@/lib/contratos/types";
import { ChipAcao } from "./ui";

const NOMES: Record<string, string> = { compras: "Compras", bancario: "Bancário", cadastro_fraude: "Cadastro e fraude" };

export function Pareceres({ pareceres }: { pareceres: Parecer[] }) {
  if (pareceres.length === 0) return <p className="rounded border border-dashed border-white/15 p-3 text-xs opacity-60">Sem pareceres: decisão determinística do piso, sem especialistas.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {pareceres.map((p) => (
        <article key={p.especialista} className="rounded-lg border border-white/10 p-3">
          <header className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold">{NOMES[p.especialista] ?? p.especialista}</h4>
            <ChipAcao acao={p.acao} />
          </header>
          <dl className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <dt className="opacity-60">risco</dt>
              <dd className="tabular-nums">{p.risco.toFixed(2).replace(".", ",")}</dd>
              <div className="mt-0.5 h-1 rounded bg-white/10"><div className="h-1 rounded bg-red-400" style={{ width: `${Math.round(p.risco * 100)}%` }} /></div>
            </div>
            <div>
              <dt className="opacity-60">confiança</dt>
              <dd className="tabular-nums">{p.confianca.toFixed(2).replace(".", ",")}</dd>
              <div className="mt-0.5 h-1 rounded bg-white/10"><div className="h-1 rounded bg-sky-400" style={{ width: `${Math.round(p.confianca * 100)}%` }} /></div>
            </div>
          </dl>
          <p className="mb-2 text-xs leading-snug opacity-90">{p.resumo}</p>
          <div className="flex flex-wrap gap-1">
            {p.evidencias.map((e) => (
              <span key={e} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">{e}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
