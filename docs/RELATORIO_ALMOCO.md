# Relatório da Sessão Autônoma (`RELATORIO_ALMOCO.md`)

## 1. Fases concluídas (100% de F1 a F5)
- **F1 (Ablação validada — `21590ea`)**: placar único (`calcularPlacar`), 17 cortes completos (0 `na_fila`), `hibrido` em replay = live.
- **F2 (Injeção ponta a ponta — `541dead`)**: 3 cenários em replay sem token (`POST /api/injetar`), `reset`, teste canário e detector de injeção PT/EN.
- **F3 (Snapshot e build — `e8f7e63`)**: `analise/snapshot.json` regenerado, `SOMENTE_REPLAY=1` travando chamadas live na UI e na API, `next build` validado.
- **F4 (Bonito + Identidade Gogroup + Avatares — `effb123..ad0e2fa`)**: trace como conversa, carimbos padronizados, placar antes × depois, modo Palco (`P` e `1–4`), chat estilo WhatsApp, cartão de Renata Paiva (`PS01`), funil animado, `<AgenteAvatar>` + faixa `Elenco` com os 7 PNGs e paleta Gogroup (`#2659a5`, `#d7d900`, `#3dbfef`, `#f8ae13`, `#e5381a`, `#e5273c`, `#e61782`, `#ffffff`, títulos em Poppins bold).
- **F5 (Documentos)**: `README.md`, `docs/correcoes-ia.md` (17 entradas), `docs/pitch.md` (números reais + falha no `cnpj_clonado`) e `docs/demo-checklist.md`.

## 2. Números principais medidos (`analise/ablacao.json`)
- **Sem sistema**: **−R$ 648.210,75** (876 títulos, R$ 10,2 mi em 17 cortes MER/LIT).
- **Só regras (`so_regras`)**: **−R$ 33.182,92** (100% do indevido evitado; R$ 33.182,92 de atraso; 16 acionamentos).
- **Só LLM (`llm_puro`, amostra exata 79 não limpos + 60 de 797 limpos)**: **−R$ 326.521,22** (recall 72,2%, 43 FP em 60 limpos, 83 acionamentos).
- **Híbrido (`hibrido`, Guardião Gogroup)**: **−R$ 2.829,51** (100% dos R$ 648.210,75 evitados, 0 FP, 21 acionamentos agrupados, 0 desnecessários).
- **Cenários fora das regras**: híbrido captura `troca_conta_fornecedor_novo` e `injecao_prompt_v2`, e **falha** no `cnpj_clonado` (`TP499002` → `manter`).

## 3. Decisões tomadas autonomamente
- `llm_puro`: 737 limpos fora da amostra entram como `manter` (placar exato na amostra; extrapolação rotulada em `detalhes`); 62 inválidos da 1ª rodada refeitos 1x no mesmo modelo (`glm-5.3-flash`, `max_tokens: 6000`).
- `mascararContas` restrito a strings (`jsonMascarado`) para não corromper números/timestamps do JSON de replay.
- Em `public/agentes/`, preservados os 7 arquivos originais (> 1,2 MB, nomes descritivos) e geradas cópias 256×256 (`radar.png..lupa.png`, ~110 KB cada).

## 4. Bloqueios e orçamento live
- **Bloqueios**: nenhum bloqueio de permissão ou erro sem solução na sessão (96 testes passando).
- **Chamadas live usadas na sessão**: **212 chamadas de chat** (0 chamadas novas em F4 e F5; demo 100% operacional com `SOMENTE_REPLAY=1`).

## 5. O que precisa de decisão do usuário
1. **Histórico Git (`3b98b06`)**: decidir se deseja reescrever o histórico para expurgar o commit antigo `3b98b06` (a chave já foi removida em `f6bc9f2` e o repo é privado) ou rotacionar a chave ao final do evento.
2. **Publicação / Deploy**: se quiser publicar em nuvem, configurar `SOMENTE_REPLAY=1` e deixar `AI_PROXY_API_KEY` vazia.
3. **Avatares (`public/agentes/`)**: conferir se deseja manter também os 7 arquivos originais de alta resolução (> 1,2 MB) ao lado dos 7 PNGs padronizados (`radar..lupa.png`).
