# STATUS (retomada sem depender da conversa)

Atualizado: checkpoint 2 (pilar 1 FEITO).

## Feito
- M0/M1: Next.js 15 + wrapper AI Proxy (`lib/ai/proxy.ts`, linha 💲 com raciocínio) + Passo A (`lib/rules`, gabarito).
- Arquitetura v4 ponta a ponta: Jev (`lib/orquestrador/jev.ts`, cache) → 3 especialistas (`lib/agents/especialistas`, tool calling nativo, fallback glm→latest em 503) → política pura (`politica.ts`) → crítico (`critico.ts`) → tools simuladas (`lib/tools/registro.ts`) → acionamentos por pessoa+janela+caso (`runner.ts`) → personas (`lib/agents/humanos.ts`) → reação (mais_info 1 rodada; reverter só com dupla).
- Cena Embalarte validada em live: fornecedor nega (simulado) → risco 0,98 → bloquear + incidente → aprovador+PS01+PS03 aprovam → `reverter_alteracao_cadastro` executa → 25 títulos pela conta antiga, atraso R$ 0.
- Rotas: GET /api/estado, POST /api/avancar {modo,humanos}, /api/acao, /api/injetar {cenario}, /api/reset (relê store e limpa cenários).
- UI (components/, app/page.tsx, app/avaliacao) consome ExecucaoView real; replay roda sem proxy a partir de analise/replay/*.json.
- Testes: 80 verdes (inclui 8 de aceite em `lib/orquestrador/aceite.test.ts`).
- Ablação: só `so_regras` rodada (analise/ablacao.json). llm_puro e hibrido NÃO rodados.

## Pendente (ordem)
1. Push: bloqueado esperando login do GitHub (`git push -u origin main`). Commits locais ok.
2. Rodar `npm run ablacao` (llm_puro + hibrido live) e levar erros do llm_puro para docs/correcoes-ia.md.
3. Testar os 3 botões de injeção na UI (código pronto, testes verdes; rota não exercitada no navegador).
4. `npm run snapshot` + build de produção + deploy em modo replay.
5. Passada "bonito"; avatares (cereja).

## Comandos
- `npm test` · `npm run typecheck` · `npm run analisar` · `npm run ping`
- `npx tsx --tsconfig tsconfig.json scripts/rodar.ts --modo live|replay --lotes N` (pipeline sem UI)
- `npm run ablacao -- --so so_regras|llm_puro|hibrido [--limite N] [--modo replay]`
- Git fora do PATH: `$env:Path += ';C:\Program Files\Git\cmd'`

## Decisões
- Acionamento = 1 por pessoa por janela **por caso** (misturar fornecedores fez a persona recusar).
- risco_fraude: parecer do cadastro_fraude prevalece sobre o Jev; bloqueio só com sinal de fraude no Passo A.
- Escalar sobre piso "corrigir" com sugestão = pedir aprovação da correção; sobre piso "retirar" = retirar (alçada do agente).
- Contas mascaradas em todo state do Jev (`mascararContas`).
- Freio de orçamento: aviso de limite ou >85% → commit+push, atualizar este arquivo, rebaixar para Sonnet (exceto política/orquestrador), ordem de corte: conferir(3) → injeção(4) → especialistas paralelos(1) → ablação(5) e ciclo(2).
