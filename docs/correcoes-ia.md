# Correções da IA e das regras

Registro dos erros que apareceram durante o desenvolvimento, como foram detectados e como foram corrigidos.

| # | O que errou | Como detectamos | Como corrigimos |
|---|---|---|---|
| 1 | Pagamentos avulsos em excesso. A primeira versão marcou 24 títulos como "já pagos fora do lote". 21 eram a parcela anterior, de mesmo valor, já baixada. | Cruzamos os títulos marcados com os títulos pagos na mesma data. | A regra passou a exigir nome do favorecido e ausência de baixa em outro título. Resultado: 3 casos reais (os fretes). |
| 2 | Duplicidade confundida com fracionamento. Pares duplicados (mesma NF e mesma parcela no mesmo dia) caíam na regra de fracionamento. | Comparando a saída do script PowerShell com a porta em TypeScript: os 8 "fracionamentos" eram os mesmos títulos dos pares duplicados. | Fracionamento passou a agrupar só parcelas distintas, e o lançamento excedente é excluído. |
| 3 | Ruído entre NF e título. Os lançamentos duplicados do boleto de e-mail têm tarifa de R$ 3,50 a R$ 4,50, e há diferenças de R$ 0,01 em boletos. Isso gerava alerta falso. | O TypeScript achou 10 títulos com NF × título contra 8 no PowerShell; os 2 extras eram os excedentes do boleto_email. | O confronto NF x título deixou de ser feito no excedente, e a tolerância passou a ser de R$ 0,10. |
| 4 | Comunicação contaminando títulos. O e-mail falso da Pigmentos (NF 57551) marcava todos os títulos do fornecedor. | Revisão do detalhe: 4 títulos da Pigmentos marcados, só 1 era da NF 57551. | A comunicação passou a ser vinculada só aos títulos da NF citada. |
| 5 | Especialista sem parecer por 503 "GLM indisponível" do proxy: a Embalarte ficou só com o piso e sem a negativa do fornecedor. | Trace do caso no cache de replay mostrou `sem parecer (HTTP 503)`. | O loop refaz a chamada uma vez com `latest` quando o modelo extra falha. |
| 6 | Acionamento agrupando vários fornecedores na mesma mensagem (Pigmentos + Flexipack + Embalarte, R$ 207 mil): a persona recusou por "exceder a alçada". | Resposta da persona simulada no trace. | Um acionamento por pessoa, por janela de fechamento e por caso. |
| 7 | "Escalar" sobre piso "corrigir" virava pedido de "liberar pagamento" (Pigmentos, Flexipack). | Texto do acionamento no primeiro corte live. | Escalar com correção sugerida = pedir aprovação da correção; sobre piso "retirar" = retirar (alçada do agente). |
| 8 | A persona aprovadora recusava a reversão de troca bancária citando o limite de R$ 50 mil. | Resposta da persona no trace da Embalarte. | Prompt da persona: alteração bancária é atribuição do aprovador sem limite de valor (com aprovação dupla). Mensagem explica que não é pagamento novo. |
| 9 | Conta bancária completa no state do Jev (dentro do detalhe do achado e do corpo do e-mail) e numa resposta de persona gravada no replay. | Teste de aceite 8 (state do Jev) e o script `verificar-segredos.ps1` (replay). | `mascararContas` no state do Jev e em toda gravação de replay. |
| 10 | Vazamento do token do proxy: o `.env.example` com a chave real foi commitado e enviado. O script de verificação ALERTOU (`token em stage: True`) mas NÃO abortou. | Saída do próprio script logo após o push. | Usuário corrigiu o arquivo e instalou hook de pre-commit; `scripts/verificar-segredos.ps1` agora sai com código 1 e interrompe o fluxo. Alerta que não interrompe é bug. |

## Próximas entradas

Os erros do modo `llm_puro` da ablação serão adicionados aqui.
