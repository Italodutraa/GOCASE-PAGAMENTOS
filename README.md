# Guardião de Pagamentos · Gogroup

Sistema de auditoria contínua e apoio à decisão para o Contas a Pagar do **Gogroup** (GoHACKS — Desafio 2). Confere cada título da agenda de remessa antes do fechamento bancário (Banco Meridiano às 10h e Banco Litoral às 14h), cruzando pedido de compra (OC), nota fiscal (NF), duplicata, extrato bancário, DDA e histórico cadastral. Apenas os títulos não limpos seguem para a triagem do **Radar (Jev)**, para os **especialistas LLM** em paralelo e, quando a alçada exige, para aprovação humana agrupada.

## A dor e o resultado medido

O Gogroup opera com 131 fornecedores ativos. Renata Paiva (`PS01`, coordenadora de Contas a Pagar) precisa liberar dois lotes diários sem atrasar fornecedores legítimos e sem deixar sair pagamento indevido. Na agenda de **03 a 13/11/2026** (**876 títulos**, **R$ 10.206.764,09** em 17 janelas de corte):

- **Sem o sistema** (tesoureiro assina sem conferir): **−R$ 648.210,75** de perda (golpe de troca bancária na Embalarte, boleto falso na Pigmentos Aquarela, 3 fretes já pagos avulso sem baixa, 13 duplicidades `xml_portal × boleto_email`, 8 erros de digitação `×10 / ÷10`, homônimos e OCs inválidas).
- **Só regras (`so_regras`)**: **−R$ 33.182,92** (evita 100% do indevido das regras, mas retém títulos que dependem de despacho humano na virada do corte, gerando multa/juros de atraso).
- **Só LLM (`llm_puro`, amostra declarada de 79 não limpos + 60 de 797 limpos)**: **−R$ 326.521,22** na amostra exata (recall **72,2%**, **43 falsos positivos em 60 títulos limpos**, **83 acionamentos**).
- **Híbrido — Guardião Gogroup (`hibrido`)**: **−R$ 2.829,51** (**100%** dos **R$ 648.210,75** evitados, **0 falsos positivos**, **21 acionamentos humanos agrupados**, **0 desnecessários**).

---

## Como rodar

Pré-requisito: **Node 20+ / 26 LTS**.

```bash
npm i
cp .env.example .env.local
```

No Windows (PowerShell):

```powershell
Copy-Item .env.example .env.local
```

### 1. Modo Replay (recomendado para demonstração — zero chamadas ao proxy)

Roda 100% offline/sem token a partir de `analise/snapshot.json` e `analise/replay/*.json`. Com `SOMENTE_REPLAY=1`, o botão `live` fica desabilitado na interface e a API recusa chamadas externas:

```powershell
$env:SOMENTE_REPLAY="1"; npm run dev
```

Ou em build de produção:

```powershell
npm run build
$env:SOMENTE_REPLAY="1"; npm start
```

Acesse `http://localhost:3000`. Pressione **`P`** para abrir o **Modo Palco** (atalhos **`1` a `4`** para as cenas principais).

### 2. Modo Live (chama o AI Proxy do evento)

Preencha `AI_PROXY_API_KEY` em `.env.local` (nunca versionado) e rode:

```powershell
npm run ping       # testa chat (/v1/chat/completions) e Jev (/v1/systemone)
npm run dev        # sobe em http://localhost:3000 com seletor live/replay ativo
```

### 3. Testes, verificação de segredos e ablação

```powershell
npm run segredos   # aborta (exit 1) se encontrar prefixo de token ou conta completa
npm test           # 96 testes (gabarito do Passo A, contratos, aceites 1-8, avatares)
npm run typecheck  # tsc --noEmit
npm run analisar   # recalcula analise/estado_agenda.json
npm run ablacao -- --modo replay
npm run snapshot   # regenera analise/snapshot.json (17 cortes)
```

---

## Arquitetura e Elenco de Agentes

```
  pagamentos/*.csv (15 tabelas)
        |
        v
  [Passo A · Cerca] Código determinístico (lib/rules)
      3 vias (OC x NF x título), raiz CNPJ, duplicidade, extratos MER/LIT,
      DDA, troca bancária < 30 dias, detector de injeção PT/EN, alçadas
      -> define o PISO IMUTÁVEL (797 limpos param aqui com 0 chamadas de IA)
        |
        v  (apenas 79 títulos não limpos, agrupados em 25 casos)
  [Passo B · Radar] Jev /v1/systemone (lib/orquestrador/jev.ts)
      triagem estruturada: decisao_lote, risco_fraude, urgencia_operacional
        |
        v
  [Passo C · Especialistas LLM em paralelo] (lib/agents/especialistas)
      +-- Confere (compras): OC, NF, recebimento WMS e 3 vias
      +-- Caixa (bancario): linha digitável, DDA, extratos MER/LIT
      +-- Faro (cadastro_fraude): histórico cadastral, domínios e contato no canal oficial
      (tool calling nativo <= 4 passos -> termina em emitir_parecer)
        |
        v
  [Maestro · Orquestrador] (lib/orquestrador/runner.ts)
      combina pareceres; em divergência registra evento CONFLITO e aplica o mais conservador
      (bloquear > escalar > retirar > corrigir > manter)
        |
        v
  [Cerca · Política pura] (lib/orquestrador/politica.ts)
      valida piso do Passo A, alçada e papel; se o agente tentar rebaixar o piso
      ou trocar o tipo da ação, BARRA e devolve para correção (até 2x)
        |
        v
  [Lupa · Crítico] (lib/orquestrador/critico.ts)
      confere no store se cada ID citado (TP, NF, OC, EM, DDA, AC) existe e se o total bate;
      se falhar, substitui por template determinístico auditável
        |
        v
  [Execução e Acionamentos] (lib/tools + lib/agents/humanos.ts)
      ferramentas simuladas + 1 acionamento por pessoa, janela de corte e caso
      -> despacho de Renata Paiva (PS01) / Marcos (PS02) / Helena (PS03) -> reação do agente
```

---

## O que é real e o que é simulado

Todos os elementos simulados exibem o selo **`SIMULADO`** na interface e `simulado: true` no JSON:

| Camada | Real | Simulado (rotulado na UI e no JSON) |
|---|---|---|
| **Dados e regras (`lib/data`, `lib/rules`)** | Leitura dos 15 CSVs, normalização, cruzamento de 3 vias, extratos Meridiano/Litoral, DDA, cálculo de alçadas e placar financeiro. | — |
| **IA (`lib/ai/proxy.ts`)** | Chamadas reais ao AI Proxy (`/v1/systemone` e `/v1/chat/completions`), linhas de custo `💲` (tokens de chat e US$ do Jev separados) e cache real gravado em `analise/replay/`. | Em modo `replay`, as respostas reais gravadas são reproduzidas sem chamar a rede. |
| **Ferramentas (`lib/tools`)** | Consultas de leitura sobre o store em memória (`consultar_titulo`, `consultar_nf`, `consultar_extrato`, etc.). | Escritas no ERP (`bloquear_titulo`, `retirar_do_lote`, `corrigir_lancamento`, `reverter_alteracao_cadastro`) alteram apenas o `EstadoSimulado` em memória. |
| **Fornecedores e Humanos (`lib/mock`, `lib/agents/humanos.ts`)** | Agrupamento de acionamentos por alçada, validação de segregação de funções e reação do orquestrador. | Resposta do fornecedor ao telefone do cadastro (ex.: Embalarte negando a troca bancária) e despachos das personas (`PS01` Renata Paiva, `PS03` Helena Duarte, `aprovador`) no WhatsApp corporativo. |
| **Cenários de estresse (`lib/mock/cenarios.ts`)** | Reavaliação incremental pelo motor de regras e pelos agentes. | Botões de injeção de anomalia (`troca_conta_fornecedor_novo`, `cnpj_clonado`, `injecao_prompt_v2`). |

---

## Como seria com dados reais (`DataSource`) e Modo Sombra

1. **Camada `DataSource` (`lib/data`)**: hoje o carregamento lê os CSVs de `./pagamentos` e monta índices em memória (`Store`). Como `lib/rules`, `lib/tools` e `lib/orquestrador` consomem apenas a interface do `Store`, a migração para produção consiste em trocar o adaptador de leitura/escrita por conectores do ERP (SAP/TOTVS), varredura de DDA/CIP e extrato via APIs bancárias/Open Finance, mantendo o motor de regras e a política intactos.
2. **Implantação em Modo Sombra (*Shadow Mode*)**:
   - **Fase 1 (Sombra — 30 dias)**: o Guardião roda espelhando as remessas das 10h (Meridiano) e 14h (Litoral) em modo somente leitura, gerando os pareceres e o placar sem bloquear títulos no ERP e sem acionar aprovadores. Ao fim de cada dia, compara-se o que o Guardião teria bloqueado/corrigido com os apontamentos manuais da tesouraria e eventuais estornos.
   - **Fase 2 (Copiloto com contenção assistida)**: ativa os acionamentos agrupados para Renata Paiva (`PS01`) e aprovadores nos casos de bloqueio e alçada dupla, exigindo clique humano antes da escrita no ERP.
   - **Fase 3 (Execução autônoma até a alçada do analista)**: libera correções e retiradas automáticas dentro do limite de R$ 5.000 quando `confiança >= 0,85` e o Crítico (`Lupa`) validar 100% das citações, mantendo alçada humana obrigatória acima de R$ 5.000 e em qualquer suspeita de fraude.
