import type { Toast } from "./useExecucao";

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`rounded-2xl border-2 px-3.5 py-2.5 text-xs font-bold shadow-lg ${
            t.tipo === "erro" ? "border-[#2659a5] bg-[#f8ae13] text-[#2659a5]" : "border-[#d7d900] bg-[#2659a5] text-white"
          }`}
        >
          {t.texto}
        </div>
      ))}
    </div>
  );
}
