# GoLastro · Gogroup

Sistema de auditoria contínua e apoio à decisão para o Contas a Pagar do **Gogroup** (GoHACKS — Desafio 2). Confere cada título da agenda de remessa antes do fechamento bancário (Banco Meridiano às 10h e Banco Litoral às 14h), cruzando pedido de compra (OC), nota fiscal (NF), duplicata, extrato bancário, DDA e histórico cadastral. Apenas os títulos não limpos seguem para a triagem do **Radar (Jev)**, para os **especialistas LLM** em paralelo e, quando a alçada exige, para aprovação humana agrupada.

## A dor e o resultado medido

O Gogroup opera com 131 fornecedores ativos. Renata Paiva (`PS01`, coordenadora de Contas a Pagar) precisa liberar dois lotes diários sem atrasar fornecedores legítimos e sem deixar sair pagamento indevido. Na agenda de **03 a 13/11/2026** (**876 títulos**, **R$ 10.206.764,09** em 17 janelas de corte):

- **Sem o sistema** (tesoureiro assina sem conferir): **−R$ 648.210,75** de perda (golpe de troca bancária na Embalarte, boleto falso na Pigmentos Aquarela, 3 fretes já pagos avulso sem baixa, 13 duplicidades `xml_portal × boleto_email`, 8 erros de digitação `×10 / ÷10`, homônimos e OCs inválidas).
- **Só regras (`so_regras`)**: **−R$ 33.182,92** (evita 100% do indevido das regras, mas retém títulos que dependem de despacho humano na virada do corte, gerando multa/juros de atraso).
- **Só LLM (`llm_puro`, amostra declarada de 79 não limpos + 60 de 797 limpos)**: **−R$ 326.521,22** na amostra exata (recall **72,2%**, **43 falsos positivos em 60 títulos limpos**, **83 acionamentos**).
- **Híbrido — GoLastro (`hibrido`)**: **−R$ 2.829,51** (**100%** dos **R$ 648.210,75** evitados, **0 falsos positivos**, **21 acionamentos humanos agrupados**, **0 desnecessários**).

Números **da simulação, sobre dados fictícios com anomalias plantadas** (base do desafio). Fonte única e como reproduzir: [`docs/NUMEROS.md`](docs/NUMEROS.md); evidências: [`docs/ACEITE.md`](docs/ACEITE.md). No híbrido, o indevido evitado é 100%; os R$ 2.829,51 são só custo de atraso (perda total 99,56% menor que sem sistema). O "só LLM" não tem acesso a NF, DDA nem extrato e foi medido numa amostra declarada. Nos cenários injetados, o híbrido **falha no CNPJ clonado** (decide manter).

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

Roda sem token e sem rede: reproduz as respostas reais de modelos gravadas em `analise/replay/*.json` sobre os CSVs fictícios de `./pagamentos` (`analise/snapshot.json` é o registro da execução completa). Com `SOMENTE_REPLAY=1`, o botão `live` fica desabilitado na interface e a API recusa chamadas externas:

```powershell
$env:SOMENTE_REPLAY="1"; npm run dev
```

Ou em build de produção:

```powershell
npm run build
$env:SOMENTE_REPLAY="1"; npm start
```

Acesse `http://localhost:3000`. Pressione **`P`** para abrir o **Modo Palco** (atalhos **`1` a `5`**; a cena **`5`** mostra a delegação de alçada, que NÃO efetiva casos com sinal de fraude, aprovação dupla ou acima do teto).

### 2. Modo Live (chama o AI Proxy do evento)

Preencha `AI_PROXY_API_KEY` em `.env.local` (nunca versionado) e rode:

```powershell
npm run ping       # testa chat (/v1/chat/completions) e Jev (/v1/systemone)
npm run dev        # sobe em http://localhost:3000 com seletor live/replay ativo
```

### 3. Testes, verificação de segredos e ablação

```powershell
npm run segredos   # aborta (exit 1) se encontrar prefixo de token ou conta completa
npm test           # contagem atual em docs/ACEITE.md (gabarito do Passo A, aceites, invariantes de autonomia)
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
| **Cenários de estresse (`lib/mock/cenarios.ts`)** | Reavaliação incremental pelo motor de regras e pelos agentes. | Botões de injeção de anomalia (`troca_conta_fornecedor_novo`, `cnpj_clonado`, `injecao_prompt_v2`, `auto_efetivacao_94`). |
| **Dados** | — | **Todos fictícios** (empresas, CNPJs, contas, pessoas e valores do desafio). |
| **Delegação de alçada e recibo** | Regra de elegibilidade (`autonomia.ts`) e seus testes. | Recibo bancário, código de ocorrência `00`, hash de autenticação e write-back: **simulados**, nenhum sistema real é alterado. |

---

## Limitações (declaradas na auditoria final)

- **Falha conhecida**: o cenário `cnpj_clonado` (fornecedor novo com o mesmo nome e CNPJ de outra raiz) passa pelo híbrido como `manter`. Não há regra determinística para nome duplicado.
- **Detector de injeção por padrões** (PT e EN): variações novas (outro idioma, homóglifos) podem escapar e o corpo chega ao especialista dentro de `<<DADOS_DE_TERCEIROS>>`. A decisão não muda, porque a política não lê texto e o piso não pode ser rebaixado.
- **Modo live degradado**: se a rede falhar no meio da execução live, os casos afetados seguem só pelo piso (`semAgente`/`semJev`) e a interface ainda mostra `live`. A demo deve rodar em replay.
- **Delegação de alçada só olha os achados dos títulos**: um sinal que existe apenas na comunicação (ex.: `pedido_troca_bancaria` vindo do canal oficial) não bloqueia a delegação sozinho.
- **Painel Zero-Trust** é um exemplo ilustrativo (rotulado); os números citados são da agenda original.
- **Custo de IA de uma execução completa não está medido** (não há log 💲 gravado); não citamos custo.
- **Cena `auto_efetivacao_94`**: pela política, trocar a linha digitável e comunicação suspeita exigem humano, então a delegação NÃO efetiva esse caso; os antigos 94,2% eram valores fixos de demonstração e foram removidos.
- **Publicação**: o runner guarda estado em memória do processo; não publicar em serverless. Recomendado: demo local (`SOMENTE_REPLAY=1`) + vídeo.
- **Hook de pre-commit** não é versionado pelo git: instale com `cp scripts/pre-commit-hook.sh .git/hooks/pre-commit`.

## Como seria com dados reais (`DataSource`) e Modo Sombra

1. **Camada `DataSource` (`lib/data`)**: hoje o carregamento lê os CSVs de `./pagamentos` e monta índices em memória (`Store`). Como `lib/rules`, `lib/tools` e `lib/orquestrador` consomem apenas a interface do `Store`, a migração para produção consiste em trocar o adaptador de leitura/escrita por conectores do ERP (SAP/TOTVS), varredura de DDA/CIP e extrato via APIs bancárias/Open Finance, mantendo o motor de regras e a política intactos.
2. **Implantação em Modo Sombra (*Shadow Mode*)**:
   - **Fase 1 (Sombra — 30 dias)**: o GoLastro roda espelhando as remessas das 10h (Meridiano) e 14h (Litoral) em modo somente leitura, gerando os pareceres e o placar sem bloquear títulos no ERP e sem acionar aprovadores. Ao fim de cada dia, compara-se o que o GoLastro teria bloqueado/corrigido com os apontamentos manuais da tesouraria e eventuais estornos.
   - **Fase 2 (Copiloto com contenção assistida)**: ativa os acionamentos agrupados para Renata Paiva (`PS01`) e aprovadores nos casos de bloqueio e alçada dupla, exigindo clique humano antes da escrita no ERP.
   - **Fase 3 (Execução autônoma parametrizável ≥ 90% e Write-Back Multi-Sistema)**: libera liquidação e auto-cura automática quando o **Índice de Segurança Operacional** `indice_seguranca = Math.min(1 - risco_fraude, confianca) >= limiar_autonomia` (padrão **90%**, ajustável de **75% a 99%** na barra de governança) e o Crítico (`Lupa`) validar 100% das citações, mantendo alçada humana obrigatória fora da política ativa ou em qualquer suspeita de fraude.

---

## Delegação de alçada (autonomia) e Continuidade Operacional

- **Regra de Continuidade (`lib/orquestrador/jev.ts` e `lib/agents/especialistas/comum.ts`)**: atrasar um fornecedor legítimo gera multa contratual e custo de relacionamento (R$ 250 a R$ 3.000). Quando a dívida é real (OC e NF válidas), mas há erro corrigível (`×10 / ÷10`) ou tentativa de desvio por terceiro (boleto falso por e-mail na Pigmentos `FP4345` ou e-mail suspeito na Flexcase `FP1179`), o GoLastro **nunca abandona a dívida sem pagar**: bloqueia a via fraudulenta/errada e **redireciona a liquidação para a via original legítima** (DDA bancário original, conta anterior confirmada ou valor exato da duplicata da NF).
- **Índice de Segurança Operacional (`lib/orquestrador/autonomia.ts`)**:
  $$\text{indice\_seguranca} = \min(1 - \text{risco\_fraude}, \text{confianca})$$
- **2 Políticas de Governança em Tempo Real (`components/BarraAutonomia.tsx`)**:
  1. **Alçada Estrita**: o agente só executa sozinho casos até **R$ 5 mil** (alçada do analista_cp) com `indice_seguranca ≥ limiar`.
  2. **Autonomia Expandida**: até **R$ 50 mil** (alçada do aprovador).
  - Nos dois modos, **nunca** executa sozinho: aprovação dupla, piso ou decisão `escalar`/`bloquear`, `risco_fraude ≥ 0,5`, sinal de fraude (troca bancária, boleto divergente, comunicação suspeita, CNPJ divergente), homônimo, CNPJ clonado, OC inválida, recuperação, ou caso sem parecer de especialista (testes em `lib/orquestrador/autonomia.test.ts`). A execução aparece como "executado sob delegação de alçada (política de autonomia)", nunca como aprovação humana. Limiares (padrão 90%) são **configuráveis**, não calibrados. O placar do evento **não** soma acionamentos evitados.
- **Recibo (`components/ReciboAutonomo.tsx`) — SIMULADO**: status `EFETIVADO_AUTO`, código de ocorrência `00` e hash de 16 caracteres são de demonstração (no formato de `retorno_remessa.csv`); nenhum ERP ou banco real é alterado.

---

## Matriz de Governança Zero-Trust ("O que a IA viu")

| Camada de Proteção | O que fica retido localmente (NUNCA vai ao LLM) | O que o LLM recebe (Sanitizado e Auditado) |
|---|---|---|
| **1. Filtro na Origem (`lib/rules`)** | **797 de 876 títulos (90,98%)** sem achado no Passo A seguem pelo motor determinístico com **0 tokens**. | Apenas os **79 títulos não limpos** (24 casos por fornecedor) seguem para análise dos agentes. |
| **2. Mascaramento bancário (`mascararDestino` em `lib/orquestrador/jev.ts`, `mascararContas`/`jsonMascarado` em `lib/orquestrador/replay.ts`, destino mascarado em `lib/agents/especialistas/comum.ts`)** | Conta, agência e chave completas ficam no store; nenhum replay ou snapshot grava conta completa (`npm run segredos` verifica). | Só banco + 4 últimos dígitos (ex.: `ted 905/…03-9`). |
| **3. Anti-injeção (detector `RE_INJECAO` em `lib/rules/comunicacoes.ts`, PT e EN; poda em `lib/orquestrador/casos.ts` e `listar_comunicacoes`)** | Comunicação com sinal `injecao_instrucao` (ex.: `EM570996`, `EM599003`) entra SEM o corpo; `consultar_nf` não expõe as informações complementares da NF. | O sinal e o remetente, com o texto `"[corpo omitido: contém instruções dirigidas ao agente]"`; demais textos de terceiros vão dentro de `<<DADOS_DE_TERCEIROS>>`. A decisão final não depende de texto: a política (`politica.ts`) só lê ações, piso e alçada. |
| **4. Zero Alucinação de IDs (`extrairIdsValidos` + `Lupa`)** | IDs inventados ou fora do escopo do caso são rejeitados pelo crítico determinístico. | O payload inclui `ids_validos_neste_caso: [...]` explícito; a **Lupa (`critico.ts`)** valida 100% das citações no `Store` antes de exibir ou executar. |
