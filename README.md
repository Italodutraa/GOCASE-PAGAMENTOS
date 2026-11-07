# Guardião de Pagamentos

Sistema de apoio ao contas a pagar. Ele confere cada título da agenda de remessa antes do fechamento do lote bancário, cruzando pedido de compra, nota fiscal, título, extrato, DDA e cadastro do fornecedor. Só os casos que pedem julgamento seguem para agentes de IA e, quando a alçada exige, para uma pessoa. Projeto do Desafio 2 do GoHACKS (Pagamentos / Contas a Pagar).

## A dor

O Gogroup paga cerca de 131 fornecedores. Renata Paiva, coordenadora de contas a pagar, precisa que o tesoureiro assine os lotes de remessa a tempo: Banco Meridiano às 10h e Banco Litoral às 14h. Hoje o lote é assinado sem conferência título por título. Na agenda de 03 a 13/11/2026 (876 títulos, R$ 10.206.764,09), o sistema encontrou R$ 648.210,75 que sairiam indevidamente: golpe de troca de conta, fretes já pagos por fora, valores digitados errados, duplicidades e um boleto falso.

## Como rodar

Pré-requisito: Node 26 LTS.

```bash
npm i
cp .env.example .env.local
```

No Windows (PowerShell):

```powershell
Copy-Item .env.example .env.local
```

Para o modo live, preencha `AI_PROXY_API_KEY` no `.env.local`. Para o modo replay, deixe a chave vazia.

```bash
npm run analisar   # roda as regras (passo A) e grava analise/estado_agenda.json
npm test           # testes de regras e de gabarito
npm run dev        # sobe a interface em http://localhost:3000
npm run ping       # testa chat e Jev pelo wrapper (exige a chave)
```

## Modos

- **Live**: exige `AI_PROXY_API_KEY`. Chama o AI Proxy do evento. Roda só localmente.
- **Replay**: roda sem chave, a partir de `analise/snapshot.json`. Não gasta chamadas do proxy.

Custos de IA aparecem em uma linha por chamada. Chat mostra tokens, sem preço por chamada. O Jev mostra US$. Os dois nunca são convertidos um no outro.

## Arquitetura

```
 pagamentos/*.csv
       |
       v
 [A] Código determinístico (lib/rules)
     3 vias OC x NF x título, duplicidade, extratos, DDA,
     janela de 30 dias de troca bancária, alçadas
     -> fonte da verdade para valores e alçadas
       |
       v
 [B] Jev /v1/systemone (lib/ai)
     triagem, risco de fraude, urgência
       |
       v
 [C] Especialistas LLM em paralelo (lib/agents)
     compras | bancário | cadastro e fraude
     com ferramentas simuladas (lib/tools)
       |
       v
 Orquestrador (lib/orquestrador)
     o parecer mais conservador vence; conflito é registrado
       |
       v
 Política: nunca rebaixa abaixo do piso das regras;
 rejeita e devolve ao agente
       |
       v
 Crítico: toda citação de ID precisa existir; total precisa bater
       |
       v
 Execução simulada -> acionamentos agrupados (chat simulado)
       |
       v
 Resposta do humano (simulada) -> o agente reage
```

## Estrutura de pastas

- `lib/data`: carga dos CSV, normalização e índices. Acesso aos dados pela camada DataSource.
- `lib/rules`: regras do passo A (três vias, duplicidade, extratos, boleto, cadastro, alçadas).
- `lib/ai`: wrapper único do AI Proxy (chat e Jev), com linha de custo por chamada.
- `lib/agents`: especialistas e controle de orçamento de chamadas.
- `lib/orquestrador`: orquestrador, política e crítico.
- `lib/tools`: ferramentas simuladas por papel.
- `lib/mock`: fornecedores, humanos e cenários simulados.
- `app`: interface Next.js (painel de lotes, auditoria, chat simulado) e rotas de API.

## Segurança

- O token fica só na variável de ambiente `AI_PROXY_API_KEY`, no `.env.local` (que está no `.gitignore`). Ele não aparece em log, resposta de API nem no frontend.
- Nenhum modelo `deepseek-*` é usado. O wrapper bloqueia esses modelos antes do envio.
- Texto de e-mail, WhatsApp, nota fiscal e anexo é tratado como dado, nunca como instrução. Um e-mail tentou dar ordens ao agente e foi ignorado.
- O modo live roda só localmente.

## Como seria com dados reais

Hoje, o `CsvSource` lê os arquivos de `./pagamentos`. A camada DataSource isola a origem dos dados, então o motor de regras não muda quando a fonte mudar.

Próximo passo, apenas documentado (não implementado): conectores para o ERP, para DDA/CIP e para APIs bancárias (Open Finance).

---

Todos os dados deste repositório são fictícios. As respostas de fornecedores e de pessoas são simuladas.
