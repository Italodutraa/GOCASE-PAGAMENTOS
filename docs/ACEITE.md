# ACEITE — auditoria final (GoLastro)

Início: 2026-11-07 15:05 · tag `pre-auditoria` = 8de7fc6. Regra: PASS só com evidência (comando + saída). Sem evidência = NÃO VERIFICADO = FAIL.

| ID | Critério | Veredito | Evidência | Ação |
|---|---|---|---|---|
| A1.1 | git limpo; HEAD = origin; sem arquivos proibidos | PASS (após correção) | `git status -sb` → `## main...origin/main`; `HEAD=d3fd035 origin=d3fd035`; `git ls-files` proibidos = 0 (antes: `tsconfig.tsbuildinfo` rastreado) | `git rm --cached` + `.gitignore` |
| A1.2 | segredos | PASS | `npm run segredos` → `ok: sem token e sem conta completa` (exit 0); `git grep -E 'gw-tok-[A-Za-z0-9_-]{16,}' HEAD` → 0; contas completas em replay/snapshot → 0 | — |
| A1.3 | token no histórico | FAIL (registrado; do usuário) | `git log --all -S` → `3b98b06` (adicionou ao `.env.example`), `f6bc9f2` (removeu) | BLOQUEIOS.md: rotacionar / repo novo |
| A1.4 | hook recusa commit com token | FAIL → mitigado | Auditor: commit de teste com token PASSOU (desfeito com `git reset --mixed HEAD~1`); `.git/hooks/pre-commit` não existe. Cópia `scripts/pre-commit-hook.sh` testada em repo descartável: com token `exit 1`, sem token `exit 0` | usuário instala o hook |
| A1.5 | artefatos rastreados | PASS | `git ls-files`: `analise/replay/*.json` (4), `snapshot.json`, `ablacao.json`, `estado_agenda.json`, 7 avatares usados, 24 CSVs; originais grandes (7) ignorados | — |
| A2.1 | alçadas = politicas.csv | PASS | `grep alcadas pagamentos/politicas.csv` → 5000 / 50000 / PS03 > 50000 / dupla; aceite: TP432130 (R$ 96.480) → PS03; "R$ 200 mil gerente" só no `RELATORIO_HACKATHON.md` (P0) | relatório retirado |
| A2.2 | mutação em TRANSICOES derruba teste | PASS (após correção) | retirar→manter: `1 failed | 99 passed`; corrigir→manter não era pego | teste novo "transições proibidas a partir do piso" |
| A2.3 | invariantes I1–I5 da delegação | FAIL → PASS | 1ª rodada: >R$ 50 mil, dupla, CNPJ clonado e 94% efetivados (P0). Reverificação (script de propriedade, 28 casos × 4 perfis × 2 modos × 3 limiares): I1/I2/I3/I5 = 0 violações; I4 (troca de linha) corrigido depois (`BOLETO_*`, fail-closed) + teste do cenário | `autonomia.ts`, `autonomia.test.ts` |
| A2.4 | 94,2% e recibo | FAIL → corrigido | 0,058/0,942 e hash `9A4F…` eram fixos; placar da tela somava R$ 60 | constantes removidas; recibo SIMULADO; placar = `calcularPlacar` |
| A2.5 | "calibrado" | PASS | `grep -rniE calibrad components app README.md docs` → 0 | — |
| A3.1 | proveniência | PASS | `ablacao_llm_puro.json`: 139× `"modelo":"glm-5.3-flash"` (real); replay de 21590ea/e8f7e63 (real); `ablacao.json` = replay; cenários = sintéticos rotulados | — |
| A3.2 | ablação reproduz | PASS | `executarAblacao({modo:"replay"})` (2138 ms) = `analise/ablacao.json` nas 3 configs e cenários | — |
| A3.3 | recomputação independente e placar único | PASS | script próprio: so_regras −33.182,92; híbrido −2.829,51 (evitado 648.210,75 = 100%; atraso 2.829,51; 21 acionamentos; 0 desnecessários); `calcularPlacar` definida 1× (runner.ts) e usada pelas 3 configs; "99,56%" = redução da perda, não "evitado" | docs corrigidos |
| A3.4 | 3 casos à mão | PASS | Embalarte 25 tít. R$ 194.440,08; fretes R$ 159.169,05; duplicidades 13 tít. R$ 105.263,62 | — |
| A3.5 | baseline justo | PASS (com ressalva) | prompt neutro, mesmo modelo, retentativa; sem acesso a NF/DDA/extrato → rotulado "só LLM sem acesso às bases"; com/sem inválidos em NUMEROS.md | — |
| A3.6 | cenários fora das regras | PASS (honesto) | troca_conta ✅/✅; **cnpj_clonado ❌/❌**; injecao_prompt_v2 ✅/✅; auto_efetivacao_94 fora da ablação | declarado no README e pitch |
| A3.7 | custo | NÃO VERIFICADO | não há log 💲 gravado de execução completa | não citado; LIMITAÇÕES |
| A3.8 | Passo A | PASS | `npm run analisar`: 876; 797/36/43; R$ 648.210,75; R$ 10.206.764,09; 206 ms; 17 cortes | — |
| A4.1 | canários e poda | PASS / P1 | `vitest aceite + lib/mock` 34/34; 6 trechos de injeção = 0 em replay/snapshot; 6 variações novas escapam do detector, decisão não muda | LIMITAÇÕES |
| A4.2 | contas em prompts gravados | PASS | `\b[0-9]{5,}-[0-9]\b` em replay/snapshot → 0 | — |
| A4.3 | Painel Zero-Trust | FAIL → corrigido (P1) | "91%" fixo e literais sem rótulo | selo "exemplo ilustrativo"; 90,98% |
| A4.4 | live degradado / deepseek / teto | P1 / PASS | queda de rede no live não muda o rótulo da UI; teto 600 e 429 ok; deepseek só em bloqueio | LIMITAÇÕES; demo em replay |
| A5.1 | typecheck, testes, build | PASS | `npx tsc --noEmit` exit 0; `vitest run` → `Test Files 15 passed (15) · Tests 107 passed (107)`; `npm run build` exit 0 (15:17, commit d3fd035) | — |
| A5.2 | replay sem token | PASS | cópia sem `.env`, `SOMENTE_REPLAY=1`: `liveDisponivel:false`, 0 linhas 💲 | — |
| A5.3 | API e ciclo 2× | PASS | todas 200; reset → 876 títulos, R$ 648.210,75; placar −2.829,51, 21 acionamentos nas 2 rodadas | — |
| A5.4 | ensaio da demo | PARCIAL | atalhos 1–5 e P existem; rótulos do checklist alinhados à UI; tempo por cena NÃO VERIFICADO (sem navegador) | — |
| A5.5 | UI | PASS / NÃO VERIFICADO | avatares 200; selo simulado presente; sem texto branco sobre `#d7d900`; layout em 1366/1920 NÃO VERIFICADO | — |
| A5.7 | publicação | Recomendação | runner guarda estado em `globalThis` → não publicar em serverless; demo local + vídeo | LIMITAÇÕES |
| A6.1 | nome GoLastro | PASS (após renomeação) | `grep -rniE 'guardi.{1,2}o'` (fontes visíveis) → 0 | — |
| A6.2 | grafia Gogroup | PASS | `GoGroup|Go Group|GOGROUP` em texto visível → 0 (só razão social fictícia nos dados) | — |
| A6.3 | afirmações com prova | PASS (após correção) | relatório falso retirado; números com ressalva "simulação, dados fictícios"; pitch corrigido (clone FP9901/Cosmoderm) | — |
| A6.4 | README real × simulado + LIMITAÇÕES | PASS (após correção) | linhas "dados fictícios" e "recibo/hash simulados"; seção Limitações | — |
| A5.6 | clone limpo do commit final | PASS | `git clone` local → `log -1` = d3fd035, sem `.env`; `npm ci` exit 0; `tsc` exit 0; `Test Files 15 passed · Tests 107 passed`; `npm run build` exit 0; `next start` com `SOMENTE_REPLAY=1`: `liveDisponivel:false`, 0 linhas 💲; ciclo reset → avançar até o fim (9 chamadas) → injetar 4 → reset 2×: todos 200, placar −2.829,51 e 21 acionamentos nas duas; reset → 876 títulos, R$ 648.210,75; página mostra "GoLastro" | — |

**Resumo:** 0 P0 abertos no código. Abertos do usuário: hook de pre-commit (A1.4) e histórico do `3b98b06` (A1.3). NÃO VERIFICADO: custo de IA (A3.7), tempo das cenas e layout no navegador (A5.4/A5.5).
