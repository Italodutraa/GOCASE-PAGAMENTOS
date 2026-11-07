// MOCK de ExecucaoView para a UI trabalhar em paralelo ao runner. Dados baseados nos casos reais do Passo A.
import type { Alcada } from "@/lib/rules/tipos";
import type { CasoView, ExecucaoView, TituloView, TraceEvento } from "@/lib/contratos/types";

const T0 = new Date("2026-11-03T08:00:00").getTime();
const ev = (min: number, kind: TraceEvento["kind"], agente: string, texto: string, dados?: unknown): TraceEvento => ({ t: T0 + min * 60_000, kind, agente, texto, dados });
const alc = (valor: number, dupla = false, motivos: string[] = []): Alcada => {
  const nivel = valor <= 5000 ? "analista_cp" : valor <= 50000 ? "aprovador" : "diretoria";
  return {
    nivel,
    valorBase: valor,
    dupla,
    motivosDupla: motivos,
    aprovadores: dupla ? (valor > 50000 ? ["aprovador", "PS03"] : ["aprovador", "PS01"]) : nivel === "analista_cp" ? [] : nivel === "aprovador" ? ["aprovador"] : ["PS03"],
  };
};

const titulo = (p: Partial<TituloView> & Pick<TituloView, "titulo_id" | "lote" | "fornecedor_id" | "fornecedor_nome" | "valor">): TituloView => ({
  banco: p.lote.endsWith("MER") ? "Banco Meridiano" : "Banco Litoral",
  fechamento: `${p.lote.slice(2, 6)}-${p.lote.slice(6, 8)}-${p.lote.slice(8, 10)}T${p.lote.endsWith("MER") ? "10:00" : "14:00"}`,
  categoria: "embalagens",
  vencimento: "2026-11-03",
  forma_pagamento: "ted",
  status: "limpo",
  piso: "manter",
  acao: "manter",
  origem: "piso",
  situacao: "na_fila",
  alcada: alc(p.valor),
  valorEmRisco: 0,
  achados: [],
  ...p,
});

const trocaMotivo = ["troca bancária < 30 dias sem confirmação válida"];

export const titulosMock: TituloView[] = [
  titulo({ titulo_id: "TP432024", lote: "RM20261103-MER", fornecedor_id: "FP4615", fornecedor_nome: "Embalarte", valor: 1935.75, status: "bloqueio", piso: "escalar", acao: "bloquear", origem: "orquestrador", situacao: "aguardando_humano", casoId: "caso-embalarte", alcada: alc(1935.75, true, trocaMotivo), valorEmRisco: 1935.75, achados: [{ tipo: "TROCA_BANCARIA_SUSPEITA", severidade: "ALTA", detalhe: "troca 30/10 (774→905) sem confirmação, via e-mail" }, { tipo: "COMUNICACAO_SUSPEITA", severidade: "ALTA", detalhe: "EM571119 de embalartte.com.br (domínio imita o cadastrado)" }] }),
  titulo({ titulo_id: "TP432130", lote: "RM20261105-MER", fornecedor_id: "FP4615", fornecedor_nome: "Embalarte", valor: 96480, status: "bloqueio", piso: "escalar", acao: "bloquear", origem: "orquestrador", situacao: "aguardando_humano", casoId: "caso-embalarte", alcada: alc(96480, true, trocaMotivo), valorEmRisco: 96480, achados: [{ tipo: "TROCA_BANCARIA_SUSPEITA", severidade: "ALTA", detalhe: "troca 30/10 (774→905) sem confirmação, via e-mail" }] }),
  titulo({ titulo_id: "TP432863", lote: "RM20261106-MER", fornecedor_id: "FP3062", fornecedor_nome: "TransNorte", categoria: "frete", forma_pagamento: "boleto", valor: 27134.8, status: "bloqueio", piso: "retirar", acao: "retirar", origem: "especialista", situacao: "retido", casoId: "caso-fretes", valorEmRisco: 27134.8, achados: [{ tipo: "JA_PAGO_AVULSO", severidade: "ALTA", detalhe: "LIT 2026-10-28 PAG BOL 289 TRANSNORTE LOGISTI" }, { tipo: "BOLETO_DDA_BAIXADO", severidade: "ALTA", detalhe: "boleto liquidado na CIP em 2026-10-28" }] }),
  titulo({ titulo_id: "TP432865", lote: "RM20261109-MER", fornecedor_id: "FP6624", fornecedor_nome: "Rápido Sul", categoria: "frete", forma_pagamento: "boleto", valor: 59597.64, status: "bloqueio", piso: "retirar", acao: "retirar", origem: "especialista", situacao: "retido", casoId: "caso-fretes", alcada: alc(59597.64), valorEmRisco: 59597.64, achados: [{ tipo: "JA_PAGO_AVULSO", severidade: "ALTA", detalhe: "LIT 2026-10-29 PAG BOL 612 RAPIDO SUL TRANSPO" }] }),
  titulo({ titulo_id: "TP432992", lote: "RM20261110-MER", fornecedor_id: "FP4939", fornecedor_nome: "Expressa Já", categoria: "frete", forma_pagamento: "boleto", valor: 72436.61, status: "bloqueio", piso: "retirar", acao: "retirar", origem: "especialista", situacao: "retido", casoId: "caso-fretes", alcada: alc(72436.61), valorEmRisco: 72436.61, achados: [{ tipo: "JA_PAGO_AVULSO", severidade: "ALTA", detalhe: "LIT 2026-10-30 PAG BOL 551 EXPRESSA JA TRANSP" }] }),
  titulo({ titulo_id: "TP430213", lote: "RM20261103-MER", fornecedor_id: "FP7908", fornecedor_nome: "Cosmoderm", categoria: "produto", forma_pagamento: "boleto", valor: 9006.36, status: "bloqueio", piso: "retirar", acao: "retirar", origem: "piso", situacao: "processado", casoId: "caso-duplicidades", valorEmRisco: 9006.36, achados: [{ tipo: "DUPLICIDADE", severidade: "ALTA", detalhe: "mesma NF 11275 parc 1/3 de TP429862 (xml_portal); cancelar este (boleto_email)" }] }),
  titulo({ titulo_id: "TP429862", lote: "RM20261103-MER", fornecedor_id: "FP7908", fornecedor_nome: "Cosmoderm", categoria: "produto", valor: 9006.36, status: "limpo", piso: "manter", acao: "manter", origem: "piso", situacao: "processado", casoId: "caso-duplicidades", achados: [{ tipo: "DUPLICIDADE_PAR_MANTIDO", severidade: "BAIXA", detalhe: "mantido; duplicata TP430213 cancelada" }] }),
  titulo({ titulo_id: "TP431459", lote: "RM20261105-MER", fornecedor_id: "FP1262", fornecedor_nome: "Frascos Alvorada", valor: 48380, status: "atencao", piso: "corrigir", acao: "corrigir", origem: "especialista", situacao: "aguardando_humano", casoId: "caso-valor-x10", valorEmRisco: 43542, achados: [{ tipo: "NF_X_TITULO", severidade: "ALTA", detalhe: "título R$ 48.380,00 vs duplicata R$ 4.838,00 (pagaria a mais R$ 43.542,00)" }] }),
  titulo({ titulo_id: "TP432623", lote: "RM20261112-MER", fornecedor_id: "FP5525", fornecedor_nome: "Flexipack", forma_pagamento: "boleto", valor: 1748.88, status: "atencao", piso: "corrigir", acao: "corrigir", origem: "piso", situacao: "na_fila", casoId: "caso-injecao", achados: [{ tipo: "NF_X_TITULO", severidade: "ALTA", detalhe: "título R$ 1.748,88 vs duplicata R$ 17.488,78 (pagaria a menos)" }, { tipo: "COMUNICACAO_SUSPEITA", severidade: "MEDIA", detalhe: "EM570996: texto tenta dar instrução ao agente" }] }),
  titulo({ titulo_id: "TP426904", lote: "RM20261103-MER", fornecedor_id: "FP6026", fornecedor_nome: "Policarbonato Sul", valor: 9469.16, situacao: "processado" }),
  titulo({ titulo_id: "TP427070", lote: "RM20261103-MER", fornecedor_id: "FP4999", fornecedor_nome: "Malote Expresso", categoria: "servicos", valor: 6733.52, situacao: "processado" }),
  titulo({ titulo_id: "TP433018", lote: "RM20261105-LIT", fornecedor_id: "FP2211", fornecedor_nome: "Segtrab", categoria: "servicos", valor: 4333, achados: [] }),
];

const casoEmbalarte: CasoView = {
  id: "caso-embalarte",
  tipo: "fraude_cadastro",
  titulo: "Embalarte: troca de conta pedida por domínio falso",
  fornecedor_id: "FP4615",
  titulos: ["TP432024", "TP432130", "…23 outros"],
  valorTotal: 194440.08,
  pareceres: [
    { especialista: "cadastro_fraude", acao: "bloquear", risco: 1, confianca: 0.97, evidencias: ["AC31202", "AC31205", "AC31208", "EM571119"], resumo: "Troca 774→905 em 30/10 sem ligação; pedido de embalartte.com.br (cadastro: embalarte.com.br). Fornecedor, contatado pelo canal do cadastro, nega a troca." },
    { especialista: "compras", acao: "manter", risco: 0.05, confianca: 0.88, evidencias: ["TP432130", "OC-41120"], resumo: "OC, NF e duplicatas conferem; dívida é legítima." },
    { especialista: "bancario", acao: "escalar", risco: 0.6, confianca: 0.8, evidencias: ["TP432130"], resumo: "Destino ted 905/0001/…203-9 nunca usado nos extratos; recomenda aprovação antes do corte." },
  ],
  trace: [
    ev(0, "observacao", "passo_a", "25 títulos com TROCA_BANCARIA_SUSPEITA; piso = escalar; TP432130 > R$ 50 mil (PS03)"),
    ev(0.1, "observacao", "jev", "Jev: decisao_lote=escalar_aprovacao (conf. 0,93), risco_fraude=0,83, urgência 2,32"),
    ev(0.2, "tool_call", "cadastro_fraude", 'consultar_historico_cadastro({"fornecedor_id":"FP4615"})'),
    ev(0.3, "tool_result", "cadastro_fraude", "AC31202/05/08: banco 774→905, sem confirmação, usuario_07, origem email"),
    ev(0.4, "tool_call", "cadastro_fraude", 'contatar_fornecedor({"fornecedor_id":"FP4615","canal":"telefone"})'),
    ev(0.5, "resposta_fornecedor", "FP4615", "[SIMULADO] (85) 3836-0134: \"Não trocamos de banco. Continuamos na Cooperativa Serrana. Não reconhecemos o e-mail embalartte.\""),
    ev(0.6, "parecer", "cadastro_fraude", "bloquear (risco 1,00, confiança 0,97)"),
    ev(0.6, "parecer", "compras", "manter (risco 0,05, confiança 0,88)"),
    ev(0.7, "parecer", "bancario", "escalar (risco 0,60, confiança 0,80)"),
    ev(0.8, "conflito", "orquestrador", "pareceres divergem (bloquear × manter × escalar): vence o mais conservador = bloquear", { vencedor: "cadastro_fraude" }),
    ev(0.9, "proposta", "orquestrador", "bloquear 25 títulos + incidente + reverter AC31202/05/08 (aprovação dupla)"),
    ev(1, "critico", "critico", "citações conferidas (25 TP, 3 AC, EM571119); total R$ 194.440,08 bate"),
    ev(1.1, "execucao", "orquestrador", "bloquear_titulo ×25; abrir_incidente INC-001 (fraude, canal e-mail)"),
    ev(1.2, "resposta_humano", "PS01", "[SIMULADO] Renata Paiva: aprovar — negativa do fornecedor no canal oficial basta."),
    ev(1.3, "resposta_humano", "PS03", "[SIMULADO] Helena Duarte: aprovar — pelo TP432130 (R$ 96.480)."),
    ev(1.4, "execucao", "orquestrador", "reverter_alteracao_cadastro AC31202/05/08 com aprovações [aprovador, PS01, PS03]; títulos voltam para 774/7166/9517944-5"),
  ],
  decisao: { tituloIds: ["TP432024", "TP432130"], acao: "bloquear", origem: "orquestrador", executaSozinho: false, contencaoNoCorte: "retirar", justificativa: "Fraude confirmada pelo fornecedor; reverter cadastro exige aprovação dupla.", evidencias: ["AC31202", "EM571119"] },
};

const casoFretes: CasoView = {
  id: "caso-fretes",
  tipo: "ja_pago",
  titulo: "Fretes já pagos por fora e sem baixa",
  fornecedor_id: "FP3062",
  titulos: ["TP432863", "TP432865", "TP432992"],
  valorTotal: 159169.05,
  pareceres: [{ especialista: "bancario", acao: "retirar", risco: 0.1, confianca: 0.95, evidencias: ["LIT 2026-10-28", "DDA liquidado"], resumo: "Os três boletos foram pagos avulsos no Litoral e constam liquidados no DDA; o lote pagaria de novo." }],
  trace: [
    ev(2, "observacao", "passo_a", "JA_PAGO_AVULSO + BOLETO_DDA_BAIXADO nos 3 títulos; piso = retirar"),
    ev(2.1, "tool_call", "bancario", 'consultar_extrato({"banco":"Banco Litoral","valor":27134.8})'),
    ev(2.2, "tool_result", "bancario", "28/10 PAG BOL 289 TRANSNORTE LOGISTI −27.134,80"),
    ev(2.3, "parecer", "bancario", "retirar (confiança 0,95)"),
    ev(2.4, "execucao", "orquestrador", "retirar_do_lote ×3; acionar PS02 (baixa manual dos avulsos)"),
  ],
  decisao: { tituloIds: ["TP432863", "TP432865", "TP432992"], acao: "retirar", origem: "especialista", executaSozinho: false, justificativa: "Pago fora do lote; baixa pelo tesoureiro.", evidencias: ["LIT 2026-10-28", "LIT 2026-10-29", "LIT 2026-10-30"] },
};

const casoX10: CasoView = {
  id: "caso-valor-x10",
  tipo: "valor_errado",
  titulo: "Frascos Alvorada: valor digitado ×10",
  fornecedor_id: "FP1262",
  titulos: ["TP431459"],
  valorTotal: 48380,
  pareceres: [{ especialista: "compras", acao: "manter", risco: 0.2, confianca: 0.6, evidencias: ["TP431459"], resumo: "Valor parece alto, mas OC aprovada." }],
  trace: [
    ev(3, "observacao", "passo_a", "NF_X_TITULO: R$ 48.380,00 vs duplicata R$ 4.838,00; piso = corrigir"),
    ev(3.1, "proposta", "compras", "manter (confiança 0,60)"),
    ev(3.2, "rejeicao_politica", "politica", "rebaixar abaixo do piso: piso=corrigir não pode virar manter"),
    ev(3.3, "tool_call", "compras", 'consultar_nf({"cnpj_emitente":"…","numero_nf":"…"})'),
    ev(3.4, "correcao", "compras", "corrigir: valor da duplicata é R$ 4.838,00 (erro de digitação ×10)", { acao: "corrigir" }),
    ev(3.5, "execucao", "orquestrador", "solicitar_aprovacao(corrigir_lancamento valor 48380→4838) ao aprovador (> R$ 5 mil)"),
  ],
  decisao: { tituloIds: ["TP431459"], acao: "corrigir", origem: "especialista", executaSozinho: false, justificativa: "Correção de valor acima de R$ 5 mil exige aprovador.", evidencias: ["TP431459"] },
};

const casoDup: CasoView = {
  id: "caso-duplicidades",
  tipo: "duplicidade",
  titulo: "Duplicidades xml_portal × boleto_email",
  fornecedor_id: "FP7908",
  titulos: ["TP430213"],
  valorTotal: 9006.36,
  pareceres: [],
  trace: [ev(4, "observacao", "passo_a", "DUPLICIDADE: TP430213 repete NF 11275 parc 1/3 de TP429862"), ev(4.1, "execucao", "orquestrador", "retirar_do_lote TP430213 (piso, sem LLM); cancelamento > R$ 5 mil agrupado ao aprovador")],
  decisao: { tituloIds: ["TP430213"], acao: "retirar", origem: "piso", executaSozinho: true, justificativa: "Duplicidade determinística.", evidencias: ["TP429862", "TP430213"] },
};

const casoInjecao: CasoView = {
  id: "caso-injecao",
  tipo: "injecao",
  titulo: "Flexipack: e-mail tenta instruir o agente",
  fornecedor_id: "FP5525",
  titulos: ["TP432623"],
  valorTotal: 1748.88,
  pareceres: [{ especialista: "cadastro_fraude", acao: "corrigir", risco: 0.3, confianca: 0.85, evidencias: ["EM570996", "TP432623"], resumo: "E-mail contém texto dirigido ao agente; tratado como dado. Valor do título está ÷10; corrigir para R$ 17.488,78." }],
  trace: [
    ev(5, "injecao", "passo_a", "EM570996 com sinal injecao_instrucao: corpo REMOVIDO do contexto dos agentes (só remetente e sinais)"),
    ev(5.1, "parecer", "cadastro_fraude", "corrigir (confiança 0,85)"),
  ],
  decisao: { tituloIds: ["TP432623"], acao: "corrigir", origem: "especialista", executaSozinho: true, justificativa: "Correção ≤ R$ 5 mil na alçada do analista; texto do e-mail ignorado como ordem.", evidencias: ["EM570996"] },
};

export const execucaoMock: ExecucaoView = {
  modo: "replay",
  liveDisponivel: false,
  humanos: "auto",
  relogio: { agora: "2026-11-03T08:00:00", proximoCorte: { lote: "MER", em: "2026-11-03T10:00:00" } },
  titulos: titulosMock,
  casos: [casoEmbalarte, casoFretes, casoX10, casoDup, casoInjecao],
  acionamentos: [
    { id: "ac-1", pessoa: "PS01", casoId: "caso-embalarte", janela: "RM20261103-MER", titulos: ["TP432024", "TP432130"], valorTotal: 194440.08, mensagem: "Renata, a Embalarte nega ter trocado de banco (contato pelo canal do cadastro). Peço 2ª aprovação para reverter AC31202/05/08 e manter os 25 títulos na conta antiga.", acaoSolicitada: "reverter_alteracao_cadastro", status: "aprovado", resposta: { pessoa: "PS01", decisao: "aprovar", motivo: "Negativa no canal oficial.", simulada: true } },
    { id: "ac-2", pessoa: "PS03", casoId: "caso-embalarte", janela: "RM20261105-MER", titulos: ["TP432130"], valorTotal: 96480, mensagem: "Helena, TP432130 (R$ 96.480) da Embalarte está na fraude de troca de conta. Preciso da sua aprovação na reversão.", acaoSolicitada: "reverter_alteracao_cadastro", status: "pendente" },
    { id: "ac-3", pessoa: "PS08", casoId: "caso-embalarte", janela: "RM20261103-MER", titulos: ["TP432130"], valorTotal: 194440.08, mensagem: "Lívia, tentativa de golpe com domínio embalartte.com.br. Incidente INC-001 aberto.", status: "pendente" },
    { id: "ac-4", pessoa: "PS02", casoId: "caso-fretes", janela: "RM20261106-MER", titulos: ["TP432863", "TP432865", "TP432992"], valorTotal: 159169.05, mensagem: "Marcos, três fretes pagos avulsos no Litoral (28 a 30/10) seguem agendados. Retirei do lote; falta a baixa manual.", status: "pendente" },
  ],
  custos: {
    chat: { chamadas: 14, tokens: 31240 },
    jev: { usd: 0.0021 },
    linhas: ["💲 glm-5.3-flash · entrada 1.820 tok · saída 210 tok · sem preço por chamada | sessão: 14 chamadas, 31.240 tok", "💲 jev-1.14.0 · entrada 777 tok · US$ 0,0000326 | sessão: US$ 0,0021"],
  },
  placar: { semSistema: -648210.75, comSistema: -1120, indevidoEvitado: 647090.75, custoAtraso: 880, acionamentosHumanos: 4 },
  ablacao: null,
};
