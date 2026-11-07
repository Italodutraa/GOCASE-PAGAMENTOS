# STATUS (máx. 80 linhas; atualizar a cada checkpoint, antes do commit)

## Estado atual (2026-11-07 14:57)
Sessão concluída e enviada a `origin/main` (último commit de código: `0de017c`):
- **F1 a F5 + Avatares + Identidade Gogroup + Motor de Auto-Efetivação (≥90%) + Governança Zero-Trust + Despoluição Visual (Modo Palco) + Correção de Scroll + Ativação Real Live (Jev + Chat)** entregues.
- **100 testes verdes** (`npm test`, 15 suítes), `npm run typecheck` limpo (`0` erros), `npm run segredos` ok, `npm run ping` validado ao vivo (`jev-1.14.0`, `gpt-6-astra` e `glm-5.3-flash`).
- Relatórios em `RELATORIO_HACKATHON.md` e `docs/RELATORIO_ALMOCO.md`.

## O que foi construído e entregue (histórico completo até aqui)
1. **Base e Pipeline Híbrido (M0/M1 + F1..F3 — `21590ea..e8f7e63`)**:
   - **Passo A determinístico (`lib/rules`)**: 3 vias (OC × NF × título), raiz CNPJ, duplicidade `xml_portal × boleto_email`, extratos Meridiano (612) e Litoral (437), DDA, troca bancária < 30 dias, detector PT/EN de prompt injection (`podarInjecao`) e alçadas. Liquida **797 de 876 títulos (91%)** na origem com **0 tokens** e define o **piso imutável**.
   - **Passo B · Radar Jev (`lib/orquestrador/jev.ts`)**: `/v1/systemone` (`jev-1.14.0`) com `decisao_lote` (choice), `risco_fraude` (noul, 1× por fornecedor) e `urgencia_operacional` (score), state mascarado `< 20.000` chars.
   - **Passo C · Especialistas LLM em paralelo (`lib/agents/especialistas`)**: `Confere` (`compras`), `Caixa` (`bancario`) e `Faro` (`cadastro_fraude`) com tool calling nativo (`glm-5.3-flash` com fallback automático para `latest` / `gpt-6-astra`), encerrando em `emitir_parecer`.
   - **Maestro + Cerca + Lupa (`runner.ts`, `politica.ts`, `critico.ts`)**: resolução conservadora de conflitos (`bloquear > escalar > retirar > corrigir > manter`), rejeição de pareceres que violem o piso/tipo (até 2 retentativas), conferência determinística de IDs e somas no `Store` pela **Lupa** e agrupamento de acionamentos (1 por pessoa/janela/caso) para personas LLM (`PS01` Renata Paiva, `PS03` Helena Duarte, `PS09` Rafael Nunes, `aprovador`).
   - **Ablação medida (`analise/ablacao.json`)**: Sem sistema **−R$ 648.210,75** · `so_regras` **−R$ 33.182,92** · `llm_puro` (amostra 79+60) **−R$ 326.521,22** (FP 43/60) · `hibrido` **−R$ 2.829,51** (**99,6% de proteção / +R$ 645.381,24 salvos**, recall 100%, 0 FP, 21 acionamentos).
2. **UI Executiva Gogroup, Avatares e Docs F4–F5 (`effb123..d5ce7b5`)**:
   - Paleta Gogroup (`#2659a5`, `#d7d900` com texto `#2659a5`, `#3dbfef`, `#f8ae13`, `#e5381a`, `#e5273c`, `#e61782`, fonte `Poppins` bold).
   - 7 avatares recortados em `public/agentes/` (`radar`, `confere`, `caixa`, `faro`, `maestro`, `cerca`, `lupa`) mapeados em `lib/ui/agentes.ts` + `components/AgenteAvatar.tsx`.
   - Documentação em `README.md`, `docs/correcoes-ia.md` (17 correções), `docs/pitch.md`, `docs/demo-checklist.md`.
3. **Motor de Auto-Efetivação (≥90%), Continuidade, Zero-Trust e Cenário 94% (`d9a0814`)**:
   - **Regra de Continuidade** em `jev.ts` e `comum.ts` + lista explícita `ids_validos_neste_caso` (`extrairIdsValidos`) no final de `montarUsuario`.
   - **Motor de Autonomia (`lib/orquestrador/autonomia.ts` + `autonomia.test.ts`)**: `indice_seguranca = Math.min(1 - risco_fraude, confianca)`, slider reativo **75%–99%** (padrão **90%**), modos `Alçada Estrita` e `Autonomia Expandida`.
   - **Write-Back Multi-Sistema (`components/ReciboAutonomo.tsx`)**: baixa `EFETIVADO_AUTO` no ERP, transmissão `612`/`437` com `codigo_ocorrencia: "00"` e hash hex de 16 chars (`9A4F1BC08821E340` com botão Copiar), **+R$ 60,00** poupados por escalonamento evitado.
   - **Cenário Ao Vivo `auto_efetivacao_94` (`lib/mock/cenarios.ts`)**: fornecedor `FP1179` Flexcase (`TP499004`, R$ 4.860,00, `OC-49004`, `NF 990441`), descarta 2ª via suspeita `EM599004` e liquida via `DDA8809004` com **94,2% de segurança** (botão em `BotoesInjecao.tsx` e tecla **`5`** no Modo Palco).
   - **Governança Zero-Trust (`components/GovernancaZeroTrust.tsx`)**: 3 pílulas de privacidade + comparador lado a lado (dado sensível barrado vs. payload sanitizado).
   - **Manchete de ROI em `Placar.tsx`** e relatório `RELATORIO_HACKATHON.md`.
4. **Despoluição Visual, Modo Palco, Scroll Fix e Execução Live Real (`12c5d49`, `2418b1e`, `0de017c`)**:
   - `PainelCaso.tsx`: destaca Título, Valor, Carimbo (`BLOQUEADO`, `EFETIVADO_AUTO`, etc.) e Parecer Executivo; agrupa Elenco, Pareceres, Trace e Zero-Trust na gaveta colapsável `"🔍 Detalhes da Auditoria / Agentes"`.
   - `BarraAutonomia.tsx` + `TopBar.tsx`: controles de autonomia compactados em pílula discreta na `TopBar` com popover flutuante.
   - Modo Palco (`P`, teclas `1–5`): oculta elementos secundários para focar 100% no caso ativo.
   - Scroll preservado (`usePalco.ts`, `useExecucao.ts`, `page.tsx`, `[overflow-anchor:none]`, `onMouseDown` + `type="button"`).
   - Modo `live` (`jev.ts`, `runner.ts`, `app/api/injetar/route.ts`, `page.tsx`): chama de verdade o Jev (`/v1/systemone`) e o Chat (`/v1/chat/completions`) usando `AI_PROXY_API_KEY` do `.env`, usando o cache apenas no modo `replay` ou como fallback de falha de rede.
