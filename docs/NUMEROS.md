# NÚMEROS do GoLastro (fonte única para pitch e docs)

Todos os números abaixo vêm da **simulação, sobre dados fictícios com anomalias plantadas** (base do desafio). Recalculados na auditoria final de 07/11/2026 (15:05–16:05) por script independente (auditor A3) e conferidos contra `analise/ablacao.json`.

Origem: **código** = Passo A determinístico; **replay** = respostas reais de modelos gravadas em `analise/replay/` e reproduzidas sem rede; **real** = chamada ao proxy registrada no cache (`"modelo"` por item); **sintético** = cenário injetado (`simulado: true`).

| Número | Valor | Fonte | Como reproduzir | Origem |
|---|---|---|---|---|
| Títulos na agenda (03–13/11) | 876 | `analise/estado_agenda.json` | `npm run analisar` | código |
| Valor da agenda | R$ 10.206.764,09 | idem | `npm run analisar` | código |
| Limpos / atenção / bloqueio | 797 / 36 / 43 | idem | `npm run analisar` | código |
| Títulos que nunca vão à IA | 797 de 876 (90,98%) | idem | `npm run analisar` | código |
| Dinheiro em risco (indevido sem sistema) | R$ 648.210,75 | idem | `npm run analisar` | código |
| Tempo do Passo A | ~206 ms (medido na auditoria) | saída do comando | `npm run analisar` | código |
| Janelas de corte | 17 (MER 10h / LIT 14h) | `analise/ablacao.json` | `npm run ablacao -- --modo replay` | código |
| Placar sem sistema | −R$ 648.210,75 | `analise/ablacao.json` | idem | código |
| Placar só regras | −R$ 33.182,92 (evita 100%; atraso 33.182,92; 16 acionamentos; 0 desnecessários) | idem | idem | código |
| Placar só LLM (sem acesso a NF/DDA/extrato; amostra 79 não limpos + 60 de 797 limpos, semente fixa) | −R$ 326.521,22; recall 0,7222; FP 43 de 60 limpos; 83 acionamentos (39 desnecessários) | idem (`detalhes.llm_puro`) | idem | real (139 respostas `glm-5.3-flash` gravadas) |
| Só LLM, sem os 62 itens inválidos na 1ª rodada | −R$ 115.903,03; recall 0,8333; FP 29 | idem (`semInvalidos`) | idem | real |
| Placar híbrido (GoLastro) | −R$ 2.829,51: evita **100%** do indevido; os R$ 2.829,51 são só custo de atraso (1 título legítimo retido); 21 acionamentos; 0 desnecessários; recall 1; 0 FP | idem + recomputação independente | idem | replay de respostas reais |
| Redução da perda total (híbrido vs sem sistema) | 99,56% (= 1 − 2.829,51 / 648.210,75) | cálculo | — | derivado |
| Golpe Embalarte (FP4615) | 25 títulos, R$ 194.440,08 | `estado_agenda.json` | soma por fornecedor | código |
| Fretes já pagos fora do lote | R$ 159.169,05 (TP432863 + TP432865 + TP432992) | idem | soma | código |
| Duplicidades excedentes na agenda | 13 títulos, R$ 105.263,62 | idem | soma | código |
| Pago em dobro no histórico (ago–out) | 55 parcelas, R$ 406.636,83 | idem | `npm run analisar` | código |
| Cenário troca_conta_fornecedor_novo | só regras: escalar ✅ · híbrido: escalar ✅ | `ablacao.json` → `cenariosForaDasRegras` | `npm run ablacao -- --so cenarios --modo replay` | sintético |
| Cenário cnpj_clonado (R$ 87.400) | só regras: manter ❌ · **híbrido: manter ❌ (FALHA)** | idem | idem | sintético |
| Cenário injecao_prompt_v2 | só regras: corrigir ✅ · híbrido: escalar ✅ (ordem no texto ignorada) | idem | idem | sintético |
| Cenário auto_efetivacao_94 | **NÃO medido na ablação**; os valores 94,2% / risco 0,058 / confiança 0,942 são de demonstração | `lib/mock/cenarios.ts` | — | sintético |
| Testes automatizados | ver `docs/ACEITE.md` (contagem da última execução) | `npm test` | `npm test` | código |
| Custo em tokens de chat / US$ do Jev | **NÃO VERIFICADO** (não há log 💲 de uma execução completa gravado) | — | rodar live com log | — |

Não usar: "99,6% de proteção" sem a frase "redução da perda total"; extrapolação do só LLM (−R$ 1.368.445,39) como medida; qualquer custo em centavos.
