# STATUS (máx. 80 linhas; atualizar a cada checkpoint, antes do commit)

## Estado atual (2026-11-07 13:27)
Sessão concluída: fases **F1, F2, F3, F4 e F5** entregues e enviadas ao remoto (`origin/main`).
96 testes verdes (`npm test`), `npm run typecheck` limpo, `npm run segredos` ok, build de produção validado em modo replay (`SOMENTE_REPLAY=1`).
Relatório executivo da sessão em `docs/RELATORIO_ALMOCO.md`.

## Feito
- **M0/M1**: Next.js 15, wrapper único do AI Proxy (`lib/ai/proxy.ts`, linhas `💲`), Passo A determinístico (`lib/rules`, gabarito).
- **Pipeline v4**: Jev (`lib/orquestrador/jev.ts`, cache) → 3 especialistas (`lib/agents/especialistas`) → política (`politica.ts`) → crítico (`critico.ts`) → ferramentas simuladas (`lib/tools`) → acionamentos agrupados → personas (`lib/agents/humanos.ts`) → reação.
- **F1 Ablação validada (`21590ea`)**: placar único (`calcularPlacar`), 17 cortes completos (0 `na_fila`), híbrido em replay = live (**−R$ 2.829,51**).
- **F2 Injeção ponta a ponta (`541dead`)**: 3 cenários em replay sem token via `POST /api/injetar`, `reset` restaura 876 títulos / R$ 648.210,75, canário testado, detector PT/EN.
- **F3 Snapshot e build (`e8f7e63`)**: `npm run snapshot` ok (25 casos), `SOMENTE_REPLAY=1` trava chamadas live na UI e na API.
- **F4 Bonito + Identidade Gogroup + Avatares (`effb123..ad0e2fa`)**:
  1. Trace como conversa (`components/Timeline.tsx`) com `<AgenteAvatar>`, carimbos `BARRADO PELA CERCA`/`REFEITO` (com avatar da Cerca), conferência do crítico (avatar da Lupa) e cartão de conflito com Maestro como árbitro.
  2. Carimbos padronizados (`BLOQUEADO`, `RETIRADO DO LOTE`, `ESCALADO`, `CORRIGIDO`, `INJEÇÃO IGNORADA`, `SIMULADO`, `BARRADO PELA CERCA`, `REFEITO`, `LIBERADO`).
  3. Placar antes × depois (`components/Placar.tsx`) com barras proporcionais e ablação medida.
  4. Modo Palco (`components/usePalco.ts`): tecla `P`, cenas `1–4` (Embalarte, duplicidades, injeção `EM570996`, agente barrado), `Esc` sai.
  5. Chat estilo WhatsApp (`components/GavetaChat.tsx`): humanos simulados com iniciais + selo `simulado`.
  6. Cartão da persona Renata Paiva (`components/CartaoRenata.tsx`, `PS01` · Coordenadora CP).
  7. Funil animado (`components/Funil.tsx`) e faixa `Elenco` (`components/AgenteAvatar.tsx`).
  8. Identidade Gogroup: Poppins bold nos títulos e paleta oficial (`#2659a5`, `#d7d900`, `#3dbfef`, `#f8ae13`, `#e5381a`, `#e5273c`, `#e61782`, `#ffffff`).
- **F5 Documentos**:
  - `README.md`: instruções (`dev`, `SOMENTE_REPLAY=1`, `live`), diagrama de arquitetura, tabela real vs simulado, `DataSource` e implantação em Modo Sombra.
  - `docs/correcoes-ia.md`: 17 correções documentadas com "como detectamos" e "como corrigimos".
  - `docs/pitch.md`: roteiro de 5 min, números reais de `analise/ablacao.json`, cenários fora das regras (incluindo a falha do híbrido no `cnpj_clonado`) e 3 respostas curtas para "por que não só um LLM?".
  - `docs/demo-checklist.md`: passo a passo de 5 min em replay com cliques/atalhos exatos e Plano B.

## Notas de avatares e contratos
- `public/agentes/` continha 5 PNGs e 2 JPGs originais com nomes descritivos (1.221 KB a 1.509 KB, > 500 KB); mantivemos os originais intactos e geramos cópias recortadas 256×256 (`radar.png`, `confere.png`, `caixa.png`, `faro.png`, `maestro.png`, `cerca.png`, `lupa.png`, 99–121 KB cada).
- `lib/contratos` não foi alterado; a derivação `TraceEvento`/`Parecer` → `AgenteId` vive em `lib/ui/agentes.ts` + `components/AgenteAvatar.tsx` (testada em `lib/ui/agentes.test.ts`).

## Números reais (`analise/ablacao.json`) e orçamento
- Sem sistema: **−R$ 648.210,75** · `so_regras`: **−R$ 33.182,92** · `llm_puro` (amostra 79+60): **−R$ 326.521,22** (recall 72,2%, FP 43/60) · `hibrido`: **−R$ 2.829,51** (100% evitado, 0 FP, 21 acionamentos, 0 desnecessários).
- Chamadas live na sessão: 212 de 300 (0 chamadas novas em F4 e F5).

## Comandos úteis
- Demo sem proxy: `$env:SOMENTE_REPLAY="1"; npm run dev` (porta 3000, tecla `P` abre o Modo Palco).
- Verificação: `npm run segredos` · `npm test` · `npm run typecheck` · `npm run handoff -- --testes`.

## Pendências do usuário
- Decidir sobre limpeza do histórico do commit `3b98b06` (chave já removida em `f6bc9f2`).
- Publicar o deploy em modo replay (`SOMENTE_REPLAY=1`) se desejar.
