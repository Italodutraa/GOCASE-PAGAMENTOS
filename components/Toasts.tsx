import type { Toast } from "./useExecucao";

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[60] flex max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={`rounded-md border px-3 py-2 text-xs shadow-lg ${t.tipo === "erro" ? "border-amber-400/40 bg-amber-950/90 text-amber-100" : "border-sky-400/40 bg-sky-950/90 text-sky-100"}`}>
          {t.texto}
        </div>
      ))}
    </div>
  );
}
