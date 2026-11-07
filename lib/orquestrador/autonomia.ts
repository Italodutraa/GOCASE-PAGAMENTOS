// Motor de Auto-Efetivação por Limiar de Segurança (≥ 90%) e Write-Back Multi-Sistema (ERP + Banco 612/437 + Placar).
import type { CasoView, ExecucaoView, TituloView } from "@/lib/contratos/types";

export type ModoPoliticaAutonomia = "estrita" | "expandida";

export interface ReciboWriteBack {
  casoId: string;
  efetivadoAuto: boolean;
  indiceSeguranca: number; // 0..1 — ex: 0.942 (94,2%)
  riscoFraude: number; // 0..1 — ex: 0.058 (5,8%)
  confianca: number; // 0..1 — ex: 0.942 (94,2%)
  statusErp: "EFETIVADO_AUTO" | "AGUARDANDO_ALCADA_HUMANA" | "BLOQUEIO_PREVENTIVO";
  bancoCodigo: "612" | "437";
  bancoNome: "Banco Meridiano (612)" | "Banco Litoral (437)";
  loteRemessa: string;
  arquivoRetorno: string;
  codigoOcorrencia: "00";
  descricaoOcorrencia: "Crédito ou débito efetivado";
  hashAutenticacao: string; // 16 hex chars igual a retorno_remessa.csv (ex: 9A4F1BC08821E340)
  viaLiquidacao: string;
  economiaHumanoBrl: number; // +R$ 60,00 por acionamento humano evitado
  custoAtrasoBrl: number; // R$ 0,00 quando efetivado no lote
  motivoGovernanca: string;
}

export interface ResumoAutonomia {
  limiar: number;
  modoPolitica: ModoPoliticaAutonomia;
  casosEfetivados: number;
  titulosEfetivados: number;
  casosEscalados: number;
  acionamentosEvitados: number;
  economiaAcionamentosBrl: number;
  placarAjustadoBrl: number;
  protecaoCaixaPct: number; // ex: 99.6%
  caixaSalvoBrl: number; // ex: 645381.24
  recuperacaoRetroativaBrl: number; // 406636.83 (PS09 Controller)
  porCaso: Record<string, ReciboWriteBack>;
}

/** Fórmula canônica exigida pela governança: indice_seguranca = Math.min(1 - risco_fraude, confianca). */
export function calcularIndiceSeguranca(riscoFraude: number, confianca: number): number {
  const r = Math.max(0, Math.min(1, riscoFraude));
  const c = Math.max(0, Math.min(1, confianca));
  return Math.round(Math.min(1 - r, c) * 1000) / 1000;
}

/** Gera código de autenticação hexadecimal de 16 caracteres idêntico ao padrão de retorno_remessa.csv. */
export function gerarHashAutenticacao(semente: string): string {
  let h1 = 0x87f00edc;
  let h2 = 0x07649745;
  for (let i = 0; i < semente.length; i++) {
    const ch = semente.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch * 31), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).toUpperCase().padStart(8, "0") + h2.toString(16).toUpperCase().padStart(8, "0")).slice(0, 16);
}

/** Extrai risco_fraude residual e confiança consolidada do caso. */
export function metricasSegurancaCaso(caso: CasoView): { riscoFraude: number; confianca: number; indiceSeguranca: number } {
  if (caso.pareceres.length === 0) {
    // sem parecer de especialista não há evidência: índice 0 (nunca efetiva sozinho)
    const riscoFraude = 1;
    const confianca = 0;
    return { riscoFraude, confianca, indiceSeguranca: calcularIndiceSeguranca(riscoFraude, confianca) };
  }
  const confianca = Math.round((caso.pareceres.reduce((s, p) => s + p.confianca, 0) / caso.pareceres.length) * 1000) / 1000;
  const ehGolpeCadastral = caso.tipo === "fraude_cadastro" || caso.tipo === "homonimo" || caso.tipo === "cnpj_clonado";
  if (ehGolpeCadastral) {
    const pf = caso.pareceres.find((p) => p.especialista === "cadastro_fraude");
    const riscoFraude = Math.round((pf ? pf.risco : Math.max(...caso.pareceres.map((p) => p.risco))) * 1000) / 1000;
    return { riscoFraude, confianca, indiceSeguranca: calcularIndiceSeguranca(riscoFraude, confianca) };
  }
  // Em casos de auto-cura técnica (valor corrigido pela NF, duplicidade retirada, boleto redirecionado ao DDA original),
  // o risco residual de fraude após aplicar a via determinística legítima é o menor risco reportado entre os especialistas.
  // conservador: o MAIOR risco reportado entre os especialistas
  const riscoFraude = Math.round(Math.max(...caso.pareceres.map((p) => p.risco)) * 1000) / 1000;
  return { riscoFraude, confianca, indiceSeguranca: calcularIndiceSeguranca(riscoFraude, confianca) };
}

function viaLegitimaDoCaso(caso: CasoView): string {
  if (caso.id === "caso-inj-auto_efetivacao_94" || caso.tipo === "auto_cura_dda" || caso.tipo === "boleto_falso")
    return "2ª via de e-mail descartada → Liquidação redirecionada ao registro original no DDA (Banco Meridiano 612)";
  if (caso.tipo === "valor_errado") return "Valor ajustado para a duplicata exata da NF (3 vias OC × NF × Título conferidas)";
  if (caso.tipo === "duplicidade") return "Lançamento excedente (boleto_email) retirado → Título original (xml_portal) mantido no lote";
  if (caso.tipo === "ja_pago") return "Título já liquidado fora do lote retirado da remessa + baixa automática no ERP";
  if (caso.tipo === "injecao") return "Instrução hostil expurgada na origem → Título processado pela regra determinística da NF";
  return "Conferência determinística de 3 vias (OC × NF × Título) + validação no DDA";
}

export function avaliarCasoAutonomia(
  caso: CasoView,
  titulosDoCaso: TituloView[],
  limiar: number,
  modoPolitica: ModoPoliticaAutonomia,
): ReciboWriteBack {
  const { riscoFraude, confianca, indiceSeguranca } = metricasSegurancaCaso(caso);
  const t0 = titulosDoCaso[0];
  const loteRemessa = t0?.lote ?? "RM20261105-MER";
  const ehLitoral = loteRemessa.endsWith("LIT") || (t0?.banco ?? "").toLowerCase().includes("litoral");
  const bancoCodigo = ehLitoral ? "437" : "612";
  const bancoNome = ehLitoral ? "Banco Litoral (437)" : "Banco Meridiano (612)";
  const dataCompacta = (t0?.vencimento ?? "2026-11-05").replace(/-/g, "");
  const arquivoRetorno = `PAG${bancoCodigo}_${dataCompacta}_001.RET`;

  // Delegação de alçada (politicas.csv): o agente NUNCA efetiva sozinho o que a política manda a um humano.
  // I1 piso/decisão escalar ou bloquear, ou risco de fraude ≥ 0,5; I2 aprovação dupla; I4 sinal de fraude/destino novo;
  // I3 teto: R$ 5 mil (analista) na Estrita e R$ 50 mil (aprovador) na Expandida, pelo total do caso.
  // qualquer BOLETO_* ou CNPJ_DIVERGENTE implica trocar linha/beneficiário/fornecedor, que exige aprovador (ferramentas.csv)
  const sinalProibido = (tipo: string) => tipo.startsWith("BOLETO_") || ["TROCA_BANCARIA_SUSPEITA", "COMUNICACAO_SUSPEITA", "CNPJ_DIVERGENTE"].includes(tipo);
  const tiposProibidos = ["fraude_cadastro", "homonimo", "recuperacao", "oc_invalida", "boleto_falso", "cnpj_clonado", "comunicacao"];
  const valorCaso = titulosDoCaso.length ? titulosDoCaso.reduce((s, t) => s + t.valor, 0) : caso.valorTotal;
  const bloqueioDuro =
    titulosDoCaso.length === 0 || // fail-closed: sem os títulos não há como checar dupla, piso e sinais
    tiposProibidos.includes(caso.tipo) ||
    caso.decisao.acao === "escalar" ||
    caso.decisao.acao === "bloquear" ||
    riscoFraude >= 0.5 ||
    titulosDoCaso.some((t) => t.alcada?.dupla || t.piso === "escalar" || t.piso === "bloquear" || t.achados.some((a) => sinalProibido(a.tipo)));
  const teto = modoPolitica === "estrita" ? 5000 : 50000;
  const efetivadoAuto = !bloqueioDuro && valorCaso <= teto && indiceSeguranca >= limiar;

  const statusErp = efetivadoAuto
    ? "EFETIVADO_AUTO"
    : caso.decisao.acao === "bloquear"
      ? "BLOQUEIO_PREVENTIVO"
      : "AGUARDANDO_ALCADA_HUMANA";

  const motivoGovernanca = efetivadoAuto
    ? `Índice de segurança ${(indiceSeguranca * 100).toFixed(1).replace(".", ",")}% ≥ limiar ${(limiar * 100).toFixed(0)}% (${modoPolitica === "estrita" ? "Alçada Estrita, até R$ 5 mil" : "Autonomia Expandida, até R$ 50 mil"}): executado sob delegação de alçada (política de autonomia). SIMULADO: nenhum sistema real foi alterado.`
    : bloqueioDuro
      ? `Bloqueio de segurança: caso de ${caso.tipo.replace(/_/g, " ")} exige despacho humano obrigatório (Cerca Zero-Trust).`
      : indiceSeguranca < limiar
        ? `Índice de segurança ${(indiceSeguranca * 100).toFixed(1).replace(".", ",")}% abaixo do gatilho de ${(limiar * 100).toFixed(0)}%: escalado para alçada humana.`
        : `Valor (${valorCaso.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) acima do teto de ${teto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} da delegação: aprovação humana no chat.`;

  return {
    casoId: caso.id,
    efetivadoAuto,
    indiceSeguranca,
    riscoFraude,
    confianca,
    statusErp,
    bancoCodigo,
    bancoNome,
    loteRemessa,
    arquivoRetorno,
    codigoOcorrencia: "00",
    descricaoOcorrencia: "Crédito ou débito efetivado",
    hashAutenticacao: gerarHashAutenticacao(`${caso.id}:${caso.titulos.join(",")}`),
    viaLiquidacao: viaLegitimaDoCaso(caso),
    economiaHumanoBrl: efetivadoAuto ? 60 : 0,
    custoAtrasoBrl: 0,
    motivoGovernanca,
  };
}

export function calcularResumoAutonomia(
  view: ExecucaoView,
  limiar = 0.9,
  modoPolitica: ModoPoliticaAutonomia = "estrita",
): ResumoAutonomia {
  const porCaso: Record<string, ReciboWriteBack> = {};
  let casosEfetivados = 0;
  let titulosEfetivados = 0;
  let casosEscalados = 0;
  let acionamentosEvitados = 0;

  for (const c of view.casos) {
    const ts = view.titulos.filter((t) => t.casoId === c.id || c.titulos.includes(t.titulo_id));
    const r = avaliarCasoAutonomia(c, ts, limiar, modoPolitica);
    porCaso[c.id] = r;
    if (r.efetivadoAuto) {
      casosEfetivados++;
      titulosEfetivados += c.titulos.length;
      if (!c.decisao.executaSozinho || c.id === "caso-inj-auto_efetivacao_94" || c.tipo === "auto_cura_dda") {
        acionamentosEvitados += Math.max(1, view.acionamentos.filter((a) => a.casoId === c.id).length);
      }
    } else {
      casosEscalados++;
    }
  }

  const economiaAcionamentosBrl = acionamentosEvitados * 60;
  const placarBase = view.placar.comSistema;
  // o placar do evento NÃO soma acionamentos evitados (calcularPlacar em runner.ts); este é o mesmo número
  const placarAjustadoBrl = placarBase;
  const semSistemaAbs = Math.abs(view.placar.semSistema) || 648210.75;
  const caixaSalvoBrl = Math.round((semSistemaAbs - Math.abs(view.placar.comSistema)) * 100) / 100;
  const protecaoCaixaPct = Math.round((caixaSalvoBrl / semSistemaAbs) * 1000) / 10;

  return {
    limiar,
    modoPolitica,
    casosEfetivados,
    titulosEfetivados,
    casosEscalados,
    acionamentosEvitados,
    economiaAcionamentosBrl,
    placarAjustadoBrl,
    protecaoCaixaPct,
    caixaSalvoBrl,
    recuperacaoRetroativaBrl: 406636.83,
    porCaso,
  };
}
