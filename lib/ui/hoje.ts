// Lógica pura da tela /hoje: tudo que aparece vem do estado (ExecucaoView), nada escrito à mão.
import type { Acionamento, Acao, CasoView, ExecucaoView, TituloView } from "@/lib/contratos/types";

/** Vocabulário que NÃO pode aparecer nos textos da /hoje (palavras inteiras, sem diferenciar maiúsculas). */
export const TERMOS_PROIBIDOS: RegExp[] = [
  /passo\s+[abc]\b/i, /\bjev\b/i, /\bradar\b/i, /\bconfere\b/i, /\bcaixa\b/i, /\bfaro\b/i, /\bmaestro\b/i,
  /\bcerca\b/i, /\blupa\b/i, /\bpiso\b/i, /\btrace\b/i, /\breplay\b/i, /\blive\b/i, /abla[cç][aã]o/i,
  /zero-trust/i, /\btoken\b/i, /\bparecer(es)?\b/i,
];

export function termosProibidosEm(texto: string): string[] {
  return TERMOS_PROIBIDOS.filter((r) => r.test(texto)).map((r) => r.source);
}

const HORA_DO_LOTE = { MER: "10h", LIT: "14h" } as const;
const BANCO_DO_LOTE = { MER: "Banco Meridiano", LIT: "Banco Litoral" } as const;
export const horaDoLote = (lote: "MER" | "LIT") => HORA_DO_LOTE[lote];
export const bancoDoLote = (lote: "MER" | "LIT") => BANCO_DO_LOTE[lote];

/** "2026-11-03T10:00:00" → "03/11". */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Quanto falta entre dois instantes ISO locais da simulação: "1 dia e 2h" ou "2h 30min". */
export function faltam(agoraIso: string, emIso: string): string {
  const min = Math.max(0, Math.round((new Date(emIso).getTime() - new Date(agoraIso).getTime()) / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} ${d === 1 ? "dia" : "dias"}${h ? ` e ${h}h` : ""}`;
  if (h > 0) return `${h}h${m ? ` ${m}min` : ""}`;
  return `${m}min`;
}

/** Valor em milhões para o topo: 10206764.09 → "R$ 10,2 mi". */
export const emMilhoes = (v: number) => `R$ ${(v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;

/** "RM20261103-MER" → "03/11 às 10h". */
export function prazoDaJanela(janela: string): string {
  const m = /^RM(\d{4})(\d{2})(\d{2})-(MER|LIT)$/.exec(janela);
  return m ? `${m[3]}/${m[2]} às ${HORA_DO_LOTE[m[4] as "MER" | "LIT"]}` : "no próximo fechamento";
}

const ACOES_PEDIDAS: Record<string, string> = {
  reverter_alteracao_cadastro: "Desfazer a troca de conta",
  corrigir_lancamento: "Corrigir o valor",
  liberar_pagamento: "Liberar o pagamento",
  baixa_manual: "Registrar o pagamento já feito",
  regularizar_oc: "Regularizar o pedido de compra",
  recuperar_pagamento_indevido: "Recuperar pagamento feito em duplicidade",
};
export const pedidoDe = (acaoSolicitada?: string) =>
  (acaoSolicitada ?? "").split(" + ").map((a) => ACOES_PEDIDAS[a.trim()] ?? "Decidir sobre o pagamento").filter((v, i, a) => a.indexOf(v) === i).join(" e ") || "Decidir sobre o pagamento";

/** Rótulo simples para a decisão final de um pagamento. */
export const ROTULO_ACAO: Record<Acao, string> = {
  manter: "Pago normalmente",
  corrigir: "Valor corrigido",
  retirar: "Tirado do lote de hoje",
  escalar: "Precisa da sua decisão",
  bloquear: "Pagamento travado por segurança",
};

const capitalizar = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Primeira frase da justificativa, em linguagem simples. */
export function porque(justificativa?: string): string {
  const f = (justificativa ?? "").split(/[.;]/)[0].trim();
  if (!f) return "Há um ponto de atenção neste pagamento.";
  return capitalizar(
    f
      .replace(/\bbloquear\b/gi, "travar por segurança")
      .replace(/\bretirar\b/gi, "tirar do lote")
      .replace(/\bescalar\b/gi, "pedir decisão")
      .replace(/\bcorrigir\b/gi, "corrigir o valor")
      .replace(/\bmanter\b/gi, "manter no lote")
      .replace(/título\(s\)/gi, "pagamento(s)")
      .replace(/\btítulos?\b/gi, (t) => (t.toLowerCase() === "título" ? "pagamento" : "pagamentos")),
  );
}

export interface CartaoHoje {
  id: string;
  casoId?: string;
  quem: string; // fornecedor e o que aconteceu
  pedidoA: string; // quem decide
  pedido: string; // o que se pede
  valor: number;
  porque: string;
  prazo: string;
}

export interface BlocoResumo {
  qtd: number;
  valor: number;
}
export interface ResolvidoHoje {
  casoId: string;
  titulo: string;
  rotulo: string;
  qtd: number;
  valor: number;
}
export interface Hoje {
  total: BlocoResumo;
  conferiu: boolean;
  proximo: { lote: "MER" | "LIT"; hora: string; banco: string; dia: string; faltam: string } | null;
  cartoes: CartaoHoje[];
  resumo: { liberados: BlocoResumo; resolvidos: BlocoResumo; aguardando: BlocoResumo; travados: BlocoResumo; naoConferidos: BlocoResumo };
  resolvidos: ResolvidoHoje[];
}

const soma = (ts: TituloView[]): BlocoResumo => ({ qtd: ts.length, valor: Math.round(ts.reduce((a, t) => a + t.valor, 0) * 100) / 100 });

export function derivarHoje(view: ExecucaoView, nomePessoa: (id: string) => string = (id) => id): Hoje {
  const casos = new Map<string, CasoView>(view.casos.map((c) => [c.id, c]));
  const pendentes = view.acionamentos.filter((a: Acionamento) => a.status === "pendente");
  const cartoes: CartaoHoje[] = pendentes.map((a) => {
    const caso = a.casoId ? casos.get(a.casoId) : undefined;
    return {
      id: a.id,
      casoId: a.casoId,
      quem: caso?.titulo ?? `Pedido de decisão (${a.titulos.length} ${a.titulos.length === 1 ? "pagamento" : "pagamentos"})`,
      pedidoA: nomePessoa(a.pessoa),
      pedido: pedidoDe(a.acaoSolicitada),
      valor: a.valorTotal,
      porque: porque(caso?.decisao.justificativa),
      prazo: prazoDaJanela(a.janela),
    };
  });

  const emEspera = new Set(pendentes.flatMap((a) => a.titulos));
  const aguardando: TituloView[] = [];
  const travados: TituloView[] = [];
  const resolvidos: TituloView[] = [];
  const liberados: TituloView[] = [];
  const naoConferidos: TituloView[] = [];
  for (const t of view.titulos) {
    if (t.situacao === "na_fila") naoConferidos.push(t);
    else if (emEspera.has(t.titulo_id)) aguardando.push(t);
    else if (t.situacao === "retido" && (t.acao === "bloquear" || t.acao === "escalar")) travados.push(t);
    else if (t.casoId) resolvidos.push(t);
    else if (t.situacao === "pago") liberados.push(t);
  }

  const porCaso = new Map<string, TituloView[]>();
  for (const t of resolvidos) porCaso.set(t.casoId!, [...(porCaso.get(t.casoId!) ?? []), t]);
  const listaResolvidos: ResolvidoHoje[] = [...porCaso.entries()].map(([casoId, ts]) => ({
    casoId,
    titulo: casos.get(casoId)?.titulo ?? ts[0].fornecedor_nome,
    rotulo: ROTULO_ACAO[ts[0].acao],
    ...soma(ts),
  }));

  const pc = view.relogio.proximoCorte;
  return {
    total: soma(view.titulos),
    conferiu: view.titulos.some((t) => t.situacao !== "na_fila"),
    proximo: pc ? { lote: pc.lote, hora: HORA_DO_LOTE[pc.lote], banco: BANCO_DO_LOTE[pc.lote], dia: diaMes(pc.em), faltam: faltam(view.relogio.agora, pc.em) } : null,
    cartoes,
    resumo: { liberados: soma(liberados), resolvidos: soma(resolvidos), aguardando: soma(aguardando), travados: soma(travados), naoConferidos: soma(naoConferidos) },
    resolvidos: listaResolvidos,
  };
}
