# STATUS (máx. 80 linhas; atualizar a cada checkpoint, antes do commit)

## Estado atual
Pilar 1 feito (pipeline v4 ponta a ponta, replay na UI, 81 testes verdes). Pilar 2 em curso: ablação rodando, injeção e snapshot por validar.
Último commit: f6bc9f2 (remoção da chave do .env.example; antes, 3b98b06 = checkpoint 2). Há mudanças locais não commitadas (ver docs/HANDOFF.md).
Repo privado; token mantido; hook de pre-commit instalado pelo usuário.

## Feito
- M0/M1: Next.js 15, wrapper do AI Proxy (`lib/ai/proxy.ts`, linha 💲 com raciocínio), Passo A (`lib/rules`, gabarito).
- v4: Jev (`lib/orquestrador/jev.ts`, cache) → 3 especialistas (`lib/agents/especialistas`) → política (`politica.ts`) → crítico → ferramentas simuladas (`lib/tools`) → acionamentos → personas (`lib/agents/humanos.ts`) → reação.
- Cena Embalarte validada em live: fornecedor nega (simulado), risco 0,98, bloqueio, 3 aprovações, reversão da troca, 25 títulos na conta antiga.
- Rotas: /api/estado, avancar, acao, injetar, reset, analise, custos, ping.
- UI consome ExecucaoView real; replay roda sem proxy (`analise/replay/*.json`).
- Segredos: `npm run segredos` (aborta), `mascararContas` em replay e snapshot. Docs: correcoes-ia.md com 10 entradas.
- Seção "Regras aprendidas" no CLAUDE.md. Teste do fallback 503. Injeção grava mensagem em replay.
- Handoff: `npm run handoff` gera docs/HANDOFF.md; AGENTS.md aponta para os docs.

## Sessão autônoma (usuário ausente)
- Início: 2026-11-07 12:23. Fases F1→F5 (ver docs/RELATORIO_ALMOCO.md ao fim). Bloqueios em docs/BLOQUEIOS.md.
- F1 ablação validada: 12:53. Placar único (`calcularPlacar`), 17 cortes (0 "na_fila"), híbrido em replay = live (−R$ 2.829,51). so_regras −R$ 33.182,92; llm_puro (amostra exata) −R$ 326.521,22, recall 0,72, 43/60 limpos com FP. Cenários: híbrido FALHA no cnpj_clonado (manter). Chamadas live na sessão: 204 de 300 (62 llm_puro + 122 híbrido + 20 cenários).
- F2 injeção: 13:05. 3 cenários em replay sem token via POST /api/injetar (teste), reset restaura 876 títulos / R$ 648.210,75, canário com texto trocado = mesma decisão. Detector de injeção agora cobre inglês (antes o cenário marcava à mão e listar_comunicacoes vazaria o texto); risco residual: detector por padrões.

## Em andamento
- Ablação `llm_puro` + `hibrido` em segundo plano. Conferir `analise/ablacao.json` e `analise/ablacao_llm_puro.json`. Só `so_regras` está confirmada.

## Próximos passos (ordem)
1. Conferir a ablação; levar erros do `llm_puro` para docs/correcoes-ia.md (números só do que rodou, amostra declarada).
2. Testar os 3 botões de injeção na UI e confirmar a gravação em analise/replay/.
3. `npm run snapshot` (exige cache de todos os casos) e build de produção.
4. Passada "bonito"; avatares só se public/agentes/ ainda não existir.
5. Checkpoint: STATUS → `npm run segredos` → `npm run handoff` → commit/push.
6. Deploy em modo replay (sem AI_PROXY_API_KEY o live fica desabilitado).

## Decisões tomadas
- (autônomo) llm_puro: os 737 limpos fora da amostra entram como "manter" → placar EXATO na amostra; extrapolação só em detalhes, rotulada.
- (autônomo) llm_puro: os 62 inválidos refeitos uma vez com o MESMO modelo (raciocínio mínimo, 6000 tokens) para não misturar modelos; todos ficaram válidos.
- (autônomo) cache de casos.json restaurado do commit 3b98b06 (7 casos válidos) e o resto refeito em live; o arquivo do commit ee6334f estava corrompido.
- (autônomo) teto do híbrido live fixado em 193 chamadas para preservar o orçamento dos cenários (não foi atingido: 122).
- Acionamento: 1 por pessoa, por janela de fechamento e por caso.
- risco_fraude: o parecer do cadastro_fraude prevalece sobre o Jev; bloqueio só com sinal de fraude do Passo A.
- Escalar sobre piso "corrigir" = pedir aprovação da correção; sobre "retirar" = retirar (alçada do agente).
- Modelo dos agentes `glm-5.3-flash`, fallback `latest` em 503; teto de 600 chamadas de chat por execução.
- Política de modelos: Opus para política, orquestrador, crítico, loop, especialistas, personas, ablação; Sonnet para ferramentas, injeção, UI; Haiku para docs.
- Freio de orçamento (aviso de limite ou > 85%): commit + push, atualizar STATUS, rebaixar para Sonnet (exceto política e orquestrador); corte: conferir lançamento → injeção → especialistas paralelos → ablação e ciclo.

## Armadilhas e erros já vistos
- Token no `.env.example` foi commitado (3b98b06): o script alertou e não abortou. Agora aborta; não desative o hook.
- Conta completa em resposta de persona no replay: sempre gravar via `gravarReplay` (mascara).
- Mascarar o TEXTO JSON inteiro corrompeu números (timestamps) e apagou o cache de replay em silêncio: mascarar só strings (`jsonMascarado`); `gravarReplay` aborta se o arquivo existente for ilegível; `npm run segredos` valida JSON.
- Ablação: loop do híbrido parava em 10 de 17 cortes (267 títulos "na_fila"); placar medido por ação, não por dinheiro. Agora `avancarTudo` + `calcularPlacar` único.
- 503 "GLM indisponível": o loop refaz 1 vez com `latest`; se falhar, só o piso.
- Misturar fornecedores num acionamento faz a persona recusar por alçada.
- Persona aprovadora recusava reversão bancária citando R$ 50 mil; prompt corrigido.
- Git fora do PATH: `$env:Path += ';C:\Program Files\Git\cmd'`. Node: recarregar PATH em PowerShell novo.
- Vitest: mock que rejeita deve delegar a uma função comum.

## Comandos úteis
- `npm test` · `npm run typecheck` · `npm run segredos` · `npm run handoff [-- --testes]`
- `npm run analisar` · `npm run ping` · `npm run snapshot` · `npm run ablacao -- --so so_regras|llm_puro|hibrido [--limite N] [--modo replay]`
- `npx tsx --tsconfig tsconfig.json scripts/rodar.ts --modo live|replay --lotes N`

## Pendências do usuário
- Decidir o push (só o líder faz commit/push).
- Gerar avatares fora do proxy, se quiser (public/agentes/<nome>.png); senão a UI usa ícones.
- Publicar o deploy e testar em janela anônima.
