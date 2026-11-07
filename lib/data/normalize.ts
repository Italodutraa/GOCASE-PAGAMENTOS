// Normalizadores de chaves e formatos (os sistemas não conversam). Funções puras.

export const digitos = (s?: string | null) => (s ?? "").replace(/\D/g, "");

/** 8 primeiros dígitos do CNPJ (matriz e filiais compartilham). */
export const raizCnpj = (s?: string | null) => digitos(s).slice(0, 8);

/** Número da NF como chave: corta série depois de "-", "/" ou espaço e remove zeros à esquerda. */
export function normNF(s?: string | null): string {
  if (!s || !s.trim()) return "";
  const x = s.trim().split(/[-/ ]/)[0].replace(/^0+/, "");
  return x || "0";
}

/** Número com ponto decimal ("1234.56"). Vazio → NaN. */
export const num = (s?: string | null) => (s == null || s.trim() === "" ? NaN : Number(s));

/** Número no formato do Banco Litoral ("-1.234,56"). */
export const numBR = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

/** "dd/mm/aaaa" → "aaaa-mm-dd". */
export function dataBRparaISO(s: string) {
  const [d, m, a] = s.split("/");
  return `${a}-${m}-${d}`;
}

/** "aaaa-mm-dd[ hh:mm[:ss]]" → Date (horário local da simulação). */
export function dataHora(s?: string | null): Date | null {
  if (!s || !s.trim()) return null;
  return new Date(s.includes("T") ? s : s.trim().replace(" ", "T"));
}

const ymd = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
/** Dias corridos de a até b (datas ISO, ignora hora). */
export const diasEntre = (a: string, b: string) => Math.round((ymd(b) - ymd(a)) / 86_400_000);

export function addDias(d: Date, dias: number) {
  return new Date(d.getTime() + dias * 86_400_000);
}

/** Linha digitável de 47 dígitos: banco (1-3), fator (34-37), valor em centavos (38-47). */
export function lerLinhaDigitavel(l: string) {
  const d = digitos(l);
  return { banco: d.slice(0, 3), fator: Number(d.slice(33, 37)), valor: Number(d.slice(37, 47)) / 100 };
}

export const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Mn}/gu, "");

/** Primeira palavra significativa da razão social, sem acento, maiúscula (para casar com extratos). */
export function chaveNome(razao: string) {
  const w = semAcento(razao).replace(/[^\p{L} ]/gu, " ").trim().split(/\s+/)[0] ?? "";
  return w.toUpperCase();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Telefones brasileiros citados num texto livre, só dígitos. */
export function telefonesNoTexto(texto?: string | null): string[] {
  return [...(texto ?? "").matchAll(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g)].map((m) => digitos(m[0]));
}

export const dominioEmail = (e?: string | null) => (e ?? "").toLowerCase().split("@")[1] ?? "";

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function agruparPor<T>(itens: T[], chave: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of itens) {
    const k = chave(it);
    const l = m.get(k);
    if (l) l.push(it);
    else m.set(k, [it]);
  }
  return m;
}
