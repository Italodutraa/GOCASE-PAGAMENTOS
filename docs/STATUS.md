# STATUS (máx. 80 linhas; atualizar a cada checkpoint, antes do commit)

## Estado atual (2026-11-07, auditoria final 15:05–16:05)
Produto renomeado para **GoLastro** (empresa: Gogroup). Auditoria final com 6 auditores independentes; evidências em `docs/ACEITE.md`, números em `docs/NUMEROS.md`.
P0 corrigidos: delegação de alçada (autonomia) violava a política; métricas/hash fixos; placar da tela somava bônus; relatório com afirmações falsas (retirado); docs com funções inexistentes.
Abertos (do usuário): instalar o hook de pre-commit; histórico com token (`3b98b06`). Ver `docs/BLOQUEIOS.md`.

## Feito
- Passo A determinístico (`lib/rules`), Jev, 3 especialistas com tool calling, orquestrador, política (piso não rebaixável), crítico, tools simuladas, acionamentos agrupados, humanos simulados (`lib/agents/humanos.ts`).
- Runner com 17 cortes, placar único `calcularPlacar` (runner = ablação, testado), replay sem rede (`SOMENTE_REPLAY=1`).
- Ablação: so_regras, llm_puro (amostra declarada), híbrido; cenários fora das regras (falha no `cnpj_clonado`).
- UI (Next.js) com Modo Palco, chat simulado, placar antes × depois, avatares.
- Auditoria final: invariantes da delegação de alçada (I1–I5) com testes; README com LIMITAÇÕES e real × simulado.

## Em andamento
- Nada.

## Próximos passos (do usuário)
1. Instalar o hook: `cp scripts/pre-commit-hook.sh .git/hooks/pre-commit`.
2. Rotacionar o token e/ou publicar em repositório novo sem o commit `3b98b06`; renomear o repositório no GitHub.
3. Gravar o plano B (vídeo da demo em replay); não publicar em serverless (estado em memória do processo).

## Decisões tomadas
- "Dúvida → desligue e declare": `RELATORIO_HACKATHON.md` retirado; Painel Zero-Trust rotulado "exemplo ilustrativo"; custo de IA não citado (não medido).
- Delegação de alçada: Estrita ≤ R$ 5 mil, Expandida ≤ R$ 50 mil; nunca dupla, fraude, escalar/bloquear, risco ≥ 0,5, troca de via (BOLETO_*/CNPJ_DIVERGENTE) ou sem parecer; fail-closed sem títulos.
- Limiares (0,70 / 0,85 / 0,90; risco 0,5 / 0,8) são configuráveis, não calibrados.
- Placar do evento não soma acionamentos evitados.

## Armadilhas e erros já vistos
- Ver `docs/correcoes-ia.md` (23 entradas, inclusive as da auditoria final).
- Git e Node podem estar fora do PATH: `C:\Program Files\Git\cmd` e `C:\Program Files\nodejs`.
- O Next carrega o `.env` local por cima de variável vazia: para demo sem proxy use `SOMENTE_REPLAY=1`.

## Comandos úteis
- `npm test` · `npm run typecheck` · `npm run build` · `npm run segredos` · `npm run handoff -- --testes`
- `npm run analisar` · `npm run ablacao -- --modo replay` · `npm run snapshot`
- Demo: `$env:SOMENTE_REPLAY="1"; npm run build; npm start` → http://localhost:3000 (tecla P = Modo Palco)

## Pendências do usuário
- Instalar o hook de pre-commit; histórico do `3b98b06`; renomear o repo no GitHub; torná-lo público; deploy (não recomendado em serverless); gravar plano B; relatório individual e submissão.
