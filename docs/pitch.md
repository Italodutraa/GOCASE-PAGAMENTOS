# Pitch de 5 minutos: Guardião de Pagamentos

## Roteiro

| Tempo | Bloco | O que dizer e mostrar |
|---|---|---|
| 0:00 a 0:30 | Abertura (gancho) | "Na agenda de 03 a 13 de novembro, o sistema encontrou R$ 648.210,75 que sairiam indevidamente." |
| 0:30 a 1:15 | Dor da Renata | Renata Paiva, coordenadora de contas a pagar, precisa que o lote saia a tempo: Meridiano às 10h, Litoral às 14h. Hoje o tesoureiro assina sem conferir título por título. |
| 1:15 a 1:45 | Fluxo atual | 1. O fornecedor envia nota e boleto. 2. O título é lançado no ERP, às vezes duplicado. 3. A agenda monta o lote. 4. O tesoureiro assina o lote sem conferência. |
| 1:45 a 2:00 | A solução em 1 frase | "Um motor de regras confere cada título contra pedido, nota, extrato e DDA. A IA explica e decide os casos que pedem julgamento, e uma pessoa aprova só o que a alçada exige." |
| 2:00 a 4:00 | Demo | Veja o roteiro detalhado abaixo. |
| 4:00 a 4:40 | Métricas | Veja a lista abaixo. |
| 4:40 a 5:00 | Implantação e próximos passos | Conectores para ERP, DDA/CIP e Open Finance. Hoje o sistema lê CSV; a camada DataSource isola a origem. |

## Demo (2 minutos)

1. **Avançar o corte.** Use o controle de avanço do tempo no painel de lotes. Mostre o lote do Meridiano antes e depois do fechamento.
2. **Caso Embalarte.** Mostre os 25 títulos, de R$ 194.440,08, com a troca de conta feita sem ligação de confirmação e o e-mail de domínio falso. Mostre o conflito entre especialistas, registrado pelo orquestrador. Mostre a negativa da Embalarte ao contato simulado.
3. **Aprovação no chat.** Mostre o acionamento agrupado chegando ao aprovador no chat simulado. Aprove ou recuse e veja o agente reagir.
4. **Injetar anomalia ao vivo.** Use a injeção de anomalia e mostre o sistema detectando o caso no próximo ciclo.

## Métricas

- Valor que sairia indevidamente, identificado pelas regras: R$ 648.210,75.
- Acionamentos humanos: [ablação].
- Placar estimado (R$ 60 por acionamento desnecessário): [ablação].
- Tokens de chat: [ablação]. Custo do Jev: US$ [ablação]. Os dois são medidos e mostrados separados.
- Acerto dos casos com ação correta (comparado ao gabarito): [ablação].

## Implantação e próximos passos

1. Trocar a fonte de CSV por conectores do ERP, de DDA/CIP e das APIs bancárias (Open Finance). A camada DataSource já separa a origem dos dados.
2. Validar as alçadas e os limiares de confiança com dados reais.
3. Piloto em um lote com acompanhamento da tesouraria antes de qualquer uso sem supervisão.

Todos os dados são fictícios. As respostas de fornecedores e de pessoas são simuladas.
