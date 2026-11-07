# BLOQUEIOS (auditoria final, 07/11/2026)

| Fase | Sintoma | Tentado | Hipótese | Precisa do usuário |
|---|---|---|---|---|
| Auditoria (A1.4) | Não há hook de pre-commit em `.git/hooks`; commit com token passa. | Não instalei (regra: não mexer em hooks sem pedido); cópia versionada e testada em `scripts/pre-commit-hook.sh`. | O hook nunca foi instalado neste clone, ou foi perdido. | `cp scripts/pre-commit-hook.sh .git/hooks/pre-commit` |
| Auditoria (A1.3) | Token real no histórico (commit `3b98b06`, já enviado ao GitHub). | Nada (proibido reescrever histórico). | — | Rotacionar o token e/ou publicar em repositório novo sem esse histórico. |
