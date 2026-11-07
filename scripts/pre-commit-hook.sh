#!/bin/sh
# Hook de pre-commit do GoLastro (cópia versionada; o .git/hooks não é versionado).
# Instalar (o usuário faz):  cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
# Bloqueia commit que adicione o token do AI Proxy. O prefixo é montado em duas partes
# para este arquivo não conter o literal.
P="gw-tok"; P="$P-"
if git diff --cached -U0 | grep -E "^\+.*${P}[A-Za-z0-9_-]{16,}" >/dev/null; then
  echo "BLOQUEADO: token do AI Proxy no commit"; exit 1
fi
exit 0
