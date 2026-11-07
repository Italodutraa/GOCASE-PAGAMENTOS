# STATUS (máx. 80 linhas; atualizar a cada checkpoint, antes do commit)

## Estado atual (2026-11-07 13:21)
Pilares 1 (FEITO), 2 (CERTO) e 3 (BONITO / F4) concluídos; 96 testes verdes, build de produção validado em replay sem token.
Próxima fase: F5 (DOCUMENTOS: README.md, docs/correcoes-ia.md, docs/pitch.md, docs/demo-checklist.md) e docs/RELATORIO_ALMOCO.md.
Repo privado; token mantido; hook de pre-commit ativo.

## Feito
- M0/M1: Next.js 15, wrapper do AI Proxy (`lib/ai/proxy.ts`, linha 💲), Passo A determinístico (`lib/rules`, gabarito).
- Pipeline v4: Jev (`lib/orquestrador/jev.ts`, cache) → 3 especialistas (`lib/agents/especialistas`) → política (`politica.ts`) → crítico → ferramentas simuladas (`lib/tools`) → acionamentos → personas (`lib/agents/humanos.ts`) → reação.
- F1 ablação validada (21590ea): placar único (`calcularPlacar`), 17 cortes (0 `na_fila`), híbrido em replay = live (−R$ 2.829,51).
- F2 injeção ponta a ponta (541dead): 3 cenários em replay sem token via `POST /api/injetar`, reset restaura 876 títulos / R$ 648.210,75, canário testado, detector cobre PT/EN.
- F3 snapshot e build (e8f7e63): `npm run snapshot` ok (25 casos), `SOMENTE_REPLAY=1` trava chamadas live na UI e na API.
- F4 bonito + identidade Gogroup + avatares:
  1. Trace como conversa (`components/Timeline.tsx`) com `<AgenteAvatar>`, carimbos `BARRADO PELA CERCA`/`REFEITO` (com avatar da Cerca), conferência do crítico (avatar da Lupa) e cartão de conflito com Maestro como árbitro.
  2. Carimbos padronizados (`BLOQUEADO`, `RETIRADO DO LOTE`, `ESCALADO`, `CORRIGIDO`, `INJEÇÃO IGNORADA`, `SIMULADO`, `BARRADO PELA CERCA`, `REFEITO`, `LIBERADO`).
  3. Placar antes × depois (`components/Placar.tsx`) com barras proporcionais e números reais da ablação.
  4. Modo Palco (`components/usePalco.tsx`): tecla `P`, cenas `1–4` (Embalarte, duplicidades, injeção EM570996, agente barrado), `Esc` sai.
  5. Chat estilo WhatsApp (`components/GavetaChat.tsx`): humanos simulados com iniciais + selo `simulado` (nunca PNG de agente).
  6. Cartão da persona Renata Paiva (`components/CartaoRenata.tsx`, PS01 · Coordenadora CP, dupla alçada).
  7. Funil animado (`components/Funil.tsx`) e faixa `Elenco` (`components/AgenteAvatar.tsx`) com pulso no agente do último evento.
  8. Identidade Gogroup aplicada: Poppins bold nos títulos, paleta oficial (`#2659a5`, `#d7d900`, `#3dbfef`, `#f8ae13`, `#e5381a`, `#e5273c`, `#e61782`, `#ffffff`), pílulas `#d7d900` com texto `#2659a5`.

## Notas de avatares e contratos (F4)
- `public/agentes/` continha 5 PNGs e 2 JPGs originais com nomes descritivos (1.221 KB a 1.509 KB, > 500 KB); mantivemos os originais intactos sem renomear/apagar e geramos cópias recortadas 256×256 (`radar.png`, `confere.png`, `caixa.png`, `faro.png`, `maestro.png`, `cerca.png`, `lupa.png`, 99–121 KB cada).
- `lib/contratos` não foi alterado; a derivação `TraceEvento`/`Parecer` → `AgenteId` vive no cliente (`lib/ui/agentes.ts` + `components/AgenteAvatar.tsx`, coberta por `lib/ui/agentes.test.ts`).

## PRÓXIMO (F5 — Documentos)
- Erros a registrar em `docs/correcoes-ia.md`: ablação media ação e não dinheiro; placares divergentes; 267 títulos `na_fila` (loop de 10 cortes); `llm_puro` com 47 fora do formato + 15 falhas 503 tratados como `manter` (refeitos: 62/62 válidos); mascaramento sobre o JSON inteiro corrompeu o replay; detector de injeção só em português; `.env` local sobrepondo variável vazia (+8 chamadas live) → `SOMENTE_REPLAY`.
- Números reais (`analise/ablacao.json`): `so_regras` −R$ 33.182,92; `llm_puro` (amostra exata 79+60) −R$ 326.521,22, recall 0,72, FP 43/60; `hibrido` −R$ 2.829,51, 100% evitado (R$ 648.210,75), 21 acionamentos, 0 desnecessários. Cenários fora das regras: híbrido pega `troca_conta_fornecedor_novo` e `injecao_prompt_v2`, e FALHA no `cnpj_clonado` (`manter`).
- Orçamento live da sessão: 212 de 300 chamadas de chat usadas (0 chamadas novas na F4).

## Decisões tomadas
- `llm_puro`: 737 limpos fora da amostra entram como `manter` (placar exato na amostra; extrapolação rotulada em `detalhes`).
- Acionamento humano: 1 por pessoa, por janela de fechamento e por caso.
- `risco_fraude`: parecer de `cadastro_fraude` prevalece sobre Jev; bloqueio exige sinal de fraude do Passo A.
- Escalar sobre piso `corrigir` = pedir aprovação da correção; sobre `retirar` = retirar.

## Armadilhas conhecidas
- Nunca mascarar JSON serializado inteiro (`jsonMascarado` só em strings); sempre validar com `npm run segredos`.
- Git e Node podem exigir recarregar PATH no PowerShell (`C:\Program Files\Git\cmd;C:\Program Files\nodejs`).

## Pendências do usuário
- Limpeza opcional do histórico do commit `3b98b06` (chave já removida em `f6bc9f2`).
- Publicar o deploy em modo replay (`SOMENTE_REPLAY=1`) se desejar.
