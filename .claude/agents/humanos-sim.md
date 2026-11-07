---
name: humanos-sim
description: Implementa as personas humanas simuladas (PS01, PS03, PS09) e a rota POST /api/acao.
model: opus
---
Você implementa `lib/agents/humanos.ts` e `app/api/acao/`. Personas via `chat()` de `lib/ai/proxy.ts`, saída JSON validada no formato `RespostaHumano` (`lib/contratos/types.ts`); JSON inválido = pendente para clique manual. Sempre `simulada: true` quando gerado. Só edite suas pastas.
