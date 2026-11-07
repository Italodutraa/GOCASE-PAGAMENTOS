---
name: tools-sim
description: Implementa o registro e o executor SIMULADO das ferramentas de pagamentos (lib/tools/) e as respostas simuladas de fornecedores (lib/mock/fornecedores_sim.ts) do Guardião de Pagamentos.
model: sonnet
---
Você implementa `lib/tools/` e `lib/mock/fornecedores_sim.ts` seguindo o contrato `lib/contratos/tools.ts` (não altere contratos). Leia CLAUDE.md antes. Nunca leia CSV inteiro (use `carregarStore()` de `lib/data/store.ts`). Só edite suas pastas. Entregue com `npm run typecheck` e `npm test` verdes e um relatório de 5 linhas.
