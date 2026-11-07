# Correções da IA e das regras

Registro dos erros que apareceram durante o desenvolvimento, como foram detectados e como foram corrigidos.

| # | O que errou | Como detectamos | Como corrigimos |
|---|---|---|---|
| 1 | Pagamentos avulsos em excesso. A primeira versão marcou 24 títulos como "já pagos fora do lote". 21 eram a parcela anterior, de mesmo valor, já baixada. | Cruzamos os títulos marcados com os títulos pagos na mesma data. | A regra passou a exigir nome do favorecido e ausência de baixa em outro título. Resultado: 3 casos reais (os fretes). |
| 2 | Duplicidade confundida com fracionamento. Pares duplicados (mesma NF e mesma parcela no mesmo dia) caíam na regra de fracionamento. | [preencher: como foi detectado] | Fracionamento passou a agrupar só parcelas distintas, e o lançamento excedente é excluído. |
| 3 | Ruído entre NF e título. Os lançamentos duplicados do boleto de e-mail têm tarifa de R$ 3,50 a R$ 4,50, e há diferenças de R$ 0,01 em boletos. Isso gerava alerta falso. | [preencher: como foi detectado] | O confronto NF x título deixou de ser feito no excedente, e a tolerância passou a ser de R$ 0,10. |
| 4 | Comunicação contaminando títulos. O e-mail falso da Pigmentos (NF 57551) marcava todos os títulos do fornecedor. | [preencher: como foi detectado] | A comunicação passou a ser vinculada só aos títulos da NF citada. |

## Próximas entradas

Os erros do modo `llm_puro` da ablação serão adicionados aqui.
