# Aborta (exit 1) se o stage, analise/ ou o snapshot tiverem token do proxy ou conta bancária completa de fornecedor.
# Uso: powershell -File scripts\verificar-segredos.ps1   (rodar antes de todo commit/push e depois de gerar snapshot/replay)
$ErrorActionPreference = 'Stop'
$env:Path += ';C:\Program Files\Git\cmd'
$falhas = @()

# 1) token no que vai ser commitado
# prefixo montado em duas partes: o próprio fonte não pode conter o literal (regra do pre-commit)
$prefixo = 'gw-tok' + '-'
if (git diff --cached | Select-String -Pattern $prefixo -SimpleMatch -Quiet) { $falhas += 'token do proxy no stage' }

# 2) token ou conta completa em analise/ (replay e snapshot vão para o repo/deploy)
$contas = Import-Csv pagamentos\fornecedores.csv -Encoding UTF8 | ForEach-Object { $_.conta } | Where-Object { $_ -match '^\d{5,}-\d$' }
$arquivos = Get-ChildItem analise -Recurse -File -Include *.json -ErrorAction SilentlyContinue
foreach ($a in $arquivos) {
  $txt = [IO.File]::ReadAllText($a.FullName)
  if ($txt.Contains($prefixo)) { $falhas += "token em $($a.Name)" }
  # JSON corrompido (ex.: mascaramento sobre números) apaga o cache de replay em silêncio
  try { $null = $txt | ConvertFrom-Json } catch { $falhas += "JSON inválido em $($a.Name)" }
  if ($a.FullName -match '\\replay\\|snapshot') {
    $vaz = @($contas | Where-Object { $txt.Contains($_) }).Count
    if ($vaz) { $falhas += "$vaz conta(s) completa(s) em $($a.Name)" }
  }
}

if ($falhas.Count) { $falhas | ForEach-Object { Write-Host "BLOQUEADO: $_" -ForegroundColor Red }; exit 1 }
Write-Host 'ok: sem token e sem conta completa' -ForegroundColor Green
