# Cacador de anomalias - Desafio 2 (Pagamentos)
# Uso: powershell -ExecutionPolicy Bypass -File scripts\cacador_anomalias.ps1
param([string]$Dir = (Join-Path $PSScriptRoot '..\pagamentos'),
      [string]$Out = (Join-Path $PSScriptRoot '..\analise'),
      [int]$MaxLinhas = 60)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$inv = [Globalization.CultureInfo]::InvariantCulture
$REF = [datetime]'2026-11-02 08:00'
$D30 = $REF.AddDays(-30)

function L($f, $d = ',') { Import-Csv (Join-Path $Dir $f) -Delimiter $d -Encoding UTF8 }
function Num($s) { if ([string]::IsNullOrWhiteSpace($s)) { return $null }; [double]::Parse($s, $inv) }
function NumBR($s) { [double]::Parse(($s -replace '\.', '' -replace ',', '.'), $inv) }
function Dig($s) { if ($null -eq $s) { '' } else { $s -replace '\D', '' } }
function Root($s) { $d = Dig $s; if ($d.Length -ge 8) { $d.Substring(0, 8) } else { $d } }
function NormNF($s) { if ([string]::IsNullOrWhiteSpace($s)) { return '' }; $x = ($s.Trim() -split '[-/ ]')[0]; $x = $x.TrimStart('0'); if ($x -eq '') { '0' } else { $x } }
function Dt($s) { if ([string]::IsNullOrWhiteSpace($s)) { return $null }; [datetime]::Parse($s, $inv) }
function Money($v) { 'R$ ' + ('{0:N2}' -f $v) }
function GroupBy($rows, $keyFn) { $h = @{}; foreach ($r in $rows) { $k = & $keyFn $r; if (-not $h.ContainsKey($k)) { $h[$k] = New-Object System.Collections.ArrayList }; [void]$h[$k].Add($r) }; $h }

Write-Host "Carregando bases..." -ForegroundColor Cyan
$forn = L 'fornecedores.csv'; $fornById = @{}; foreach ($f in $forn) { $fornById[$f.fornecedor_id] = $f }
$fornByRoot = GroupBy $forn { param($r) Root $r.cnpj }
$cap = L 'contas_a_pagar.csv'; $capById = @{}; foreach ($t in $cap) { $capById[$t.titulo_id] = $t }
$agenda = L 'agenda_remessa.csv'
$nfs = L 'notas_fiscais.csv'
$nfByRootNum = GroupBy $nfs { param($r) (Root $r.cnpj_emitente) + '|' + (NormNF $r.numero_nf) }
$nfByNum = GroupBy $nfs { param($r) NormNF $r.numero_nf }
$dups = GroupBy (L 'nf_duplicatas.csv') { param($r) $r.chave_acesso }
$ocs = @{}; foreach ($o in (L 'pedidos_compra.csv')) { $ocs[$o.oc_id] = $o }
$alts = L 'alteracoes_cadastro.csv'; $altsByForn = GroupBy $alts { param($r) $r.fornecedor_id }
$comms = L 'comunicacoes_fornecedores.csv'
$dda = L 'dda_boletos.csv'; $ddaByLinha = @{}; foreach ($b in $dda) { $ddaByLinha[$b.linha_digitavel] = $b }
$receb = GroupBy (L 'recebimentos_mercadoria.csv') { param($r) $r.chave_acesso }
$ret = L 'retorno_remessa.csv'; $retByTit = GroupBy $ret { param($r) $r.titulo_id }
$users = @{}; foreach ($u in (L 'usuarios_sistema.csv')) { $users[$u.login] = $u }
$mer = L 'extrato_banco_meridiano.csv'
$lit = L 'extrato_banco_litoral.csv' ';'

# ---------- Extratos: pagamentos avulsos (fora de lote) ----------
$merPagosDoc = @{}; $avulsos = New-Object System.Collections.ArrayList
foreach ($m in $mer) {
  $v = Num $m.valor
  if ($v -ge 0 -or $m.tipo -eq 'TARIFA') { continue }
  if ($m.documento) { $merPagosDoc[$m.documento] = $m } else { [void]$avulsos.Add([pscustomobject]@{banco = 'MER'; data = $m.data; valor = - $v; desc = "$($m.tipo) $($m.descricao)" }) }
}
$retLitCount = @{}
foreach ($r in $ret) { if ($r.lote_remessa -like '*-LIT' -and $r.codigo_ocorrencia -eq '00') { $k = "$($r.data_pagamento)|{0:F2}" -f (Num $r.valor_pago); $retLitCount[$k] = 1 + [int]$retLitCount[$k] } }
foreach ($l in $lit) {
  $v = NumBR $l.'Valor (R$)'; if ($v -ge 0 -or $l.'Histórico' -like 'TAR*') { continue }
  $p = $l.Data -split '/'; $iso = "$($p[2])-$($p[1])-$($p[0])"
  $k = "$iso|{0:F2}" -f (- $v)
  if ([int]$retLitCount[$k] -gt 0) { $retLitCount[$k]-- } else { [void]$avulsos.Add([pscustomobject]@{banco = 'LIT'; data = $iso; valor = - $v; desc = $l.'Histórico' }) }
}
$avByVal = GroupBy $avulsos { param($r) '{0:F2}' -f $r.valor }

# ---------- Historico de bancos de boleto por fornecedor ----------
$bolBancos = @{}
foreach ($t in $cap) { if ($t.linha_digitavel -and $t.status -eq 'pago') { $k = $t.fornecedor_id; if (-not $bolBancos[$k]) { $bolBancos[$k] = @{} }; $bolBancos[$k][$t.linha_digitavel.Substring(0, 3)] = 1 } }
foreach ($b in $dda) { foreach ($f in @($fornByRoot[(Root $b.cnpj_beneficiario)])) { if ($f -and $b.situacao -eq 'liquidado') { if (-not $bolBancos[$f.fornecedor_id]) { $bolBancos[$f.fornecedor_id] = @{} }; $bolBancos[$f.fornecedor_id][$b.banco_cobrador] = 1 } } }

# ---------- Duplicidade: chave fornecedor|NF|parcela ----------
$dupKey = GroupBy ($cap | Where-Object { $_.status -ne 'cancelado' -and $_.numero_nf_digitado }) { param($r) "$($r.fornecedor_id)|$(NormNF $r.numero_nf_digitado)|$($r.parcela)" }

# ---------- Alteracoes bancarias: validade da confirmacao ----------
function PhoneAt($fid, [datetime]$t) {
  $tels = @($altsByForn[$fid] | Where-Object { $_ -and $_.campo -eq 'telefone' } | Sort-Object { Dt $_.data_hora })
  foreach ($c in $tels) { if ((Dt $c.data_hora) -gt $t) { return $c.valor_anterior } }
  return $fornById[$fid].telefone_cadastrado
}
$bankFields = 'banco', 'agencia', 'conta', 'chave_pix'
$bankChg = @{}  # fid -> lista de veredictos
foreach ($a in $alts) {
  if ($bankFields -notcontains $a.campo) { continue }
  $t = Dt $a.data_hora; if ($t -lt $REF.AddDays(-120)) { continue }
  $valid = Dig (PhoneAt $a.fornecedor_id $t.AddDays(-30))
  $txtPhones = @([regex]::Matches($a.confirmacao_como, '\(?\d{2}\)?\s?9?\d{4}-?\d{4}') | ForEach-Object { Dig $_.Value })
  $telRecente = @($altsByForn[$a.fornecedor_id] | Where-Object { $_ -and $_.campo -eq 'telefone' -and (Dt $_.data_hora) -ge $t.AddDays(-30) -and (Dt $_.data_hora) -le $t.AddDays(1) })
  if ($a.confirmacao_registrada -ne 'sim') { $v = 'SEM CONFIRMACAO' }
  elseif ($txtPhones.Count -eq 0) { $v = 'CONFIRMACAO NAO FOI LIGACAO' }
  elseif ($txtPhones -notcontains $valid) { $v = "LIGOU P/ NUMERO ERRADO ($($txtPhones -join ',') != pre-alteracao $valid)" }
  else { $v = 'OK' }
  if ($telRecente.Count -gt 0 -and $v -ne 'OK') { $v += ' + TELEFONE TROCADO <30d' }
  if (-not $bankChg[$a.fornecedor_id]) { $bankChg[$a.fornecedor_id] = New-Object System.Collections.ArrayList }
  [void]$bankChg[$a.fornecedor_id].Add([pscustomobject]@{id = $a.alteracao_id; quando = $t; campo = $a.campo; de = $a.valor_anterior; para = $a.valor_novo; por = $a.alterado_por; origem = $a.origem; conf = $a.confirmacao_como; veredito = $v; recente = ($t -ge $D30) })
}

# ---------- Comunicacoes: vincular a fornecedor ----------
$emailMap = @{}; $telMap = @{}; foreach ($f in $forn) { $emailMap[$f.email_cadastrado.ToLower()] = $f.fornecedor_id; $telMap[(Dig $f.telefone_cadastrado)] = $f.fornecedor_id }
$domMap = @{}; foreach ($f in $forn) { $domMap[($f.email_cadastrado -split '@')[1].ToLower()] = $f.fornecedor_id }
$kwBank = 'nova conta|conta nova|alterac|alteraç|dados banc|troca.*conta|mudamos|novo banco|chave pix|nova chave|segunda via|2a via|urgente|diretor'
$commFlags = New-Object System.Collections.ArrayList
foreach ($c in $comms) {
  $rem = $c.remetente.ToLower(); $fid = $null; $canal = 'desconhecido'
  if ($emailMap[$rem]) { $fid = $emailMap[$rem]; $canal = 'oficial' }
  elseif ($telMap[(Dig $rem)]) { $fid = $telMap[(Dig $rem)]; $canal = 'oficial' }
  elseif ($rem -match '@' -and $domMap[($rem -split '@')[1]]) { $fid = $domMap[($rem -split '@')[1]]; $canal = 'mesmo dominio, outro e-mail' }
  else { foreach ($f in $forn) { if ($f.nome_fantasia.Length -ge 4 -and ($c.nome_remetente + ' ' + $c.texto + ' ' + $c.assunto) -match [regex]::Escape($f.nome_fantasia)) { $fid = $f.fornecedor_id; $canal = 'NAO OFICIAL'; break } } }
  $hit = ($c.assunto + ' ' + $c.texto) -match $kwBank
  $bolDiv = $false
  if ($fid -and $c.anexos -match 'banco (\d{3})') { $bk = $Matches[1]; if ($bolBancos[$fid] -and -not $bolBancos[$fid][$bk]) { $bolDiv = $true } }
  if ($c.anexos -match 'CNPJ ([\d\./-]+)') { if ($fid -and (Root $Matches[1]) -ne (Root $fornById[$fid].cnpj)) { $bolDiv = $true } }
  if ($hit -or $canal -ne 'oficial' -or $bolDiv) { [void]$commFlags.Add([pscustomobject]@{id = $c.comunicacao_id; data = $c.data_hora; canal = $c.canal; rem = $c.remetente; nome = $c.nome_remetente; fid = $fid; via = $canal; kw = $hit; boletoDivergente = $bolDiv; assunto = $c.assunto; texto = $c.texto }) }
}
$commByForn = GroupBy ($commFlags | Where-Object { $_.fid }) { param($r) $r.fid }

# ---------- Analise de cada titulo da agenda ----------
$achados = New-Object System.Collections.ArrayList
function Add($a, $cat, $msg, $sev) { [void]$achados.Add([pscustomobject]@{lote = $a.lote_remessa; fecha = "$($a.data_prevista) $($a.horario_fechamento)"; titulo = $a.titulo_id; fornecedor = $a.fornecedor_id; nome = $fornById[$a.fornecedor_id].nome_fantasia; categoria_forn = $fornById[$a.fornecedor_id].categoria; valor = (Num $a.valor); tipo = $cat; severidade = $sev; detalhe = $msg }) }
$aprov = New-Object System.Collections.ArrayList

foreach ($a in $agenda) {
  $t = $capById[$a.titulo_id]; $f = $fornById[$a.fornecedor_id]; $val = Num $a.valor
  $motivosDupla = New-Object System.Collections.ArrayList
  if (-not $t) { Add $a 'INTEGRIDADE' 'titulo nao existe no ERP' 'ALTA'; continue }
  if ($t.status -ne 'agendado') { Add $a 'JA PAGO/CANCELADO' "status no ERP = $($t.status) $($t.data_pagamento)" 'ALTA' }
  if ([math]::Abs((Num $t.valor) - $val) -gt 0.009) { Add $a 'INTEGRIDADE' "valor agenda $val != titulo $($t.valor)" 'ALTA' }
  if ($t.fornecedor_id -ne $a.fornecedor_id) { Add $a 'INTEGRIDADE' "fornecedor agenda != titulo ($($t.fornecedor_id))" 'ALTA' }
  if ($f.status_cadastro -ne 'ativo') { Add $a 'CADASTRO' "fornecedor com status_cadastro=$($f.status_cadastro)" 'MEDIA' }
  $u = $users[$t.lancado_por]
  if ($u -and $u.data_desligamento -and (Dt $t.data_lancamento) -gt (Dt $u.data_desligamento)) { Add $a 'USUARIO DESLIGADO' "lancado por $($t.lancado_por) em $($t.data_lancamento), desligado em $($u.data_desligamento)" 'ALTA' }

  # -- ja pago (extrato / retorno / avulso)
  if ($merPagosDoc[$a.titulo_id]) { Add $a 'JA PAGO (extrato)' "Meridiano debitou este titulo em $($merPagosDoc[$a.titulo_id].data)" 'ALTA' }
  foreach ($r in @($retByTit[$a.titulo_id])) { if ($r -and $r.codigo_ocorrencia -eq '00') { Add $a 'JA PAGO (retorno CNAB)' "pago no lote $($r.lote_remessa) em $($r.data_pagamento)" 'ALTA' } }
  foreach ($av in @($avByVal['{0:F2}' -f $val])) {
    if (-not $av) { continue }
    # avulso so conta se: nome do favorecido bate com o fornecedor, NF ja existia e o avulso NAO esta baixado em outro titulo (parcela anterior de mesmo valor)
    $w = (($f.razao_social -replace '[^\p{L} ]', '') -split ' ')[0].Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
    if ($av.desc -notmatch [regex]::Escape($w.ToUpper())) { continue }
    if ((Dt $av.data) -lt (Dt $t.data_lancamento).Date.AddDays(-15)) { continue }
    $baixadoOutro = @($cap | Where-Object { $_.fornecedor_id -eq $t.fornecedor_id -and $_.status -eq 'pago' -and $_.data_pagamento -eq $av.data -and [math]::Abs((Num $_.valor) - $val) -lt 0.01 })
    if ($baixadoOutro.Count) { continue }
    Add $a 'JA PAGO AVULSO (sem baixa)' "$($av.banco) $($av.data) $($av.desc) $(Money $av.valor)" 'ALTA'
  }

  # -- duplicidade
  if ($t.numero_nf_digitado) {
    $k = "$($t.fornecedor_id)|$(NormNF $t.numero_nf_digitado)|$($t.parcela)"
    $outros = @($dupKey[$k] | Where-Object { $_.titulo_id -ne $t.titulo_id })
    foreach ($o in $outros) { Add $a 'DUPLICIDADE' "mesma NF/parcela em $($o.titulo_id) (status $($o.status), NF digitada '$($o.numero_nf_digitado)' vs '$($t.numero_nf_digitado)', origem $($o.origem_lancamento)/$($t.origem_lancamento))" 'ALTA' }
  }

  # -- NF
  $nf = $null
  if (-not $t.numero_nf_digitado) {
    if ($f.categoria -ne 'aluguel') { Add $a 'SEM NF' 'titulo sem NF (exige aprovacao dupla)' 'MEDIA'; [void]$motivosDupla.Add('sem NF') }
  } else {
    $cands = @($nfByRootNum[(Root $f.cnpj) + '|' + (NormNF $t.numero_nf_digitado)])
    if ($cands.Count -gt 0 -and $cands[0]) { $nf = $cands[0] }
    else {
      $outras = @($nfByNum[(NormNF $t.numero_nf_digitado)] | Where-Object { $_ })
      if ($outras.Count) { Add $a 'CNPJ DIVERGENTE' ("NF $($t.numero_nf_digitado) existe so com outra raiz: " + (($outras | ForEach-Object { "$($_.cnpj_emitente) $($_.razao_social_emitente)" }) -join '; ') + " (fornecedor $($f.cnpj))") 'ALTA' }
      else { Add $a 'NF INEXISTENTE' "NF '$($t.numero_nf_digitado)' nao esta no portal NF-e" 'ALTA' }
    }
  }
  if ($nf) {
    if ($nf.situacao_sefaz -ne 'autorizada') { Add $a 'NF NAO AUTORIZADA' "situacao_sefaz=$($nf.situacao_sefaz)" 'ALTA' }
    if ($nf.manifestacao_destinatario -match 'desconhec|nao realizada|não realizada') { Add $a 'NF DESCONHECIDA' "manifestacao=$($nf.manifestacao_destinatario)" 'ALTA' }
    foreach ($rc in @($receb[$nf.chave_acesso])) { if ($rc -and $rc.situacao -ne 'conferido') { $sv = if ($rc.situacao -like 'conferido com ressalva*') { 'BAIXA' } else { 'ALTA' }; Add $a 'RECEBIMENTO' "WMS: $($rc.situacao) $($rc.observacao)" $sv } }
    $n = [int](($t.parcela -split '/')[0])
    $dp = @($dups[$nf.chave_acesso] | Where-Object { $_ -and [int]$_.n_dup -eq $n })
    if ($dp.Count -eq 0) { Add $a 'PARCELA INEXISTENTE' "NF $($nf.numero_nf) nao tem duplicata $($t.parcela)" 'ALTA' }
    else {
      $dv = Num $dp[0].valor; $dias = [math]::Max(0, ((Dt $a.data_prevista) - (Dt $dp[0].vencimento)).Days)
      $maxOk = $dv * (1 + 0.02 + 0.01 * $dias / 30) + 0.10
      if ($val -gt $maxOk -or $val -lt $dv - 0.10) { Add $a 'NF x TITULO' ("titulo $(Money $val) vs duplicata $(Money $dv) (dif $(Money ($val - $dv)))") 'ALTA' }
      elseif ([math]::Abs($val - $dv) -gt 0.10) { Add $a 'NF x TITULO (encargos)' "dif $(Money ($val - $dv)) compativel com multa/juros ($dias dias)" 'BAIXA' }
    }
  }

  # -- OC
  if (-not $t.oc_id) {
    if ($f.categoria -ne 'utilidades' -and $f.categoria -ne 'aluguel') { Add $a 'SEM OC' 'titulo sem OC (exige aprovacao dupla)' 'MEDIA'; [void]$motivosDupla.Add('sem OC') }
  } else {
    $oc = $ocs[$t.oc_id]
    if (-not $oc) { Add $a 'OC INEXISTENTE' "$($t.oc_id) nao existe em Compras" 'ALTA'; [void]$motivosDupla.Add('OC inexistente') }
    else {
      if ($oc.status -notin 'aprovada', 'encerrada') { Add $a 'OC NAO APROVADA' "$($t.oc_id) status=$($oc.status)" 'ALTA'; [void]$motivosDupla.Add("OC $($oc.status)") }
      if ($oc.status -eq 'encerrada') { Add $a 'OC ENCERRADA' "$($t.oc_id) ja tem todas as parcelas pagas" 'ALTA' }
      if ((Root $oc.cnpj_fornecedor) -ne (Root $f.cnpj)) { Add $a 'OC DE OUTRO FORNECEDOR' "OC $($oc.cnpj_fornecedor) $($oc.nome_fornecedor) vs fornecedor $($f.cnpj)" 'ALTA' }
      if ($nf) {
        $base = if ($oc.tipo -eq 'contrato') { Num $oc.valor_mensal } else { Num $oc.valor_total }
        $nfv = Num $nf.valor_total; $tol = [math]::Max(0.02 * $base, 50)
        if ($nfv - $base -gt $tol) { Add $a 'OC x NF' "NF $(Money $nfv) > OC $(Money $base) (+$(Money ($nfv - $base)), tolerancia $(Money $tol)) -> acionar comprador" 'ALTA' }
        if ($nf.oc_informada -and $nf.oc_informada -ne $t.oc_id) { Add $a 'OC DIVERGENTE NA NF' "NF cita $($nf.oc_informada), titulo usa $($t.oc_id)" 'MEDIA' }
      }
    }
  }
  if ($nf -and (Root $nf.cnpj_emitente) -ne (Root $f.cnpj)) { Add $a 'CNPJ DIVERGENTE' "NF $($nf.cnpj_emitente) vs fornecedor $($f.cnpj)" 'ALTA' }

  # -- boleto
  if ($a.forma_pagamento -eq 'boleto') {
    $ld = $t.linha_digitavel
    if (-not $ld) { Add $a 'BOLETO SEM LINHA' 'forma boleto sem linha digitavel' 'ALTA' }
    else {
      $bk = $ld.Substring(0, 3); $vl = [double]$ld.Substring(37, 10) / 100
      if ([math]::Abs($vl - $val) -gt 0.10) { Add $a 'BOLETO x TITULO' "valor na linha $(Money $vl) vs titulo $(Money $val)" 'ALTA' }
      if ($t.cnpj_beneficiario_boleto -and (Root $t.cnpj_beneficiario_boleto) -ne (Root $f.cnpj)) { Add $a 'BOLETO BENEFICIARIO' "CNPJ beneficiario $($t.cnpj_beneficiario_boleto) != fornecedor $($f.cnpj)" 'ALTA' }
      if ($bolBancos[$f.fornecedor_id] -and -not $bolBancos[$f.fornecedor_id][$bk]) { Add $a 'BOLETO BANCO NOVO' "banco $bk nunca usado (historico: $(($bolBancos[$f.fornecedor_id].Keys) -join ','))" 'ALTA' }
      $d = $ddaByLinha[$ld]
      if (-not $d) { Add $a 'BOLETO FORA DO DDA' "linha nao registrada no DDA (origem $($t.origem_lancamento))" 'MEDIA' }
      elseif ($d.situacao -ne 'em aberto') { Add $a 'BOLETO NO DDA' "situacao CIP = $($d.situacao) em $($d.data_situacao)" 'ALTA' }
    }
  }

  # -- troca bancaria
  foreach ($bc in @($bankChg[$a.fornecedor_id])) {
    if (-not $bc) { continue }
    if ($bc.veredito -ne 'OK') {
      $sev = if ($bc.recente) { 'ALTA' } else { 'MEDIA' }
      if ($a.forma_pagamento -ne 'boleto') { Add $a 'TROCA BANCARIA SUSPEITA' "$($bc.id) $($bc.quando.ToString('yyyy-MM-dd HH:mm')) $($bc.campo) '$($bc.de)'->'$($bc.para)' via $($bc.origem) por $($bc.por): $($bc.veredito) | conf='$($bc.conf)' | destino=$($a.destino_pagamento)" $sev }
      if ($bc.recente) { [void]$motivosDupla.Add('troca bancaria <30d sem confirmacao valida') }
    }
  }
  # -- antecipacao
  if ((Dt $a.data_prevista) -lt (Dt $t.vencimento)) { $prox = (Dt $t.vencimento) - (Dt $a.data_prevista); if ($prox.Days -gt 3) { Add $a 'ANTECIPACAO' "paga em $($a.data_prevista), vence $($t.vencimento)" 'MEDIA'; [void]$motivosDupla.Add('antecipacao') } }
  if ($commByForn[$a.fornecedor_id]) { foreach ($c in $commByForn[$a.fornecedor_id]) { if ($c.via -ne 'oficial' -or $c.boletoDivergente) { Add $a 'COMUNICACAO SUSPEITA' "$($c.id) $($c.data) $($c.canal) $($c.rem) [$($c.via)] $($c.assunto)" 'ALTA' } } }

  $nivel = if ($val -le 5000) { 'analista' } elseif ($val -le 50000) { 'aprovador' } else { 'diretoria PS03' }
  [void]$aprov.Add([pscustomobject]@{lote = $a.lote_remessa; titulo = $a.titulo_id; fornecedor = $a.fornecedor_id; valor = $val; nivel = $nivel; dupla = ($motivosDupla | Select-Object -Unique) -join '; '; aprovado = $t.aprovado_por })
}

# ---------- Fracionamento ----------
$frac = GroupBy ($agenda | Where-Object { $capById[$_.titulo_id].numero_nf_digitado }) { param($r) "$($r.fornecedor_id)|$(NormNF $capById[$r.titulo_id].numero_nf_digitado)|$($r.data_prevista)" }
foreach ($k in $frac.Keys) { $g = $frac[$k]; if ($g.Count -gt 1) { $s = ($g | ForEach-Object { Num $_.valor } | Measure-Object -Sum).Sum; $mx = ($g | ForEach-Object { Num $_.valor } | Measure-Object -Maximum).Maximum
  if (($mx -le 5000 -and $s -gt 5000) -or ($mx -le 50000 -and $s -gt 50000)) { foreach ($a in $g) { Add $a 'FRACIONAMENTO' "soma $(Money $s) do mesmo fornecedor/NF/dia em $($g.Count) titulos ($k)" 'MEDIA' } } } }

# ================= SAIDA =================
New-Item -ItemType Directory -Force $Out | Out-Null
$achados | Export-Csv (Join-Path $Out 'achados_agenda.csv') -NoTypeInformation -Encoding UTF8
$aprov | Export-Csv (Join-Path $Out 'alcadas_agenda.csv') -NoTypeInformation -Encoding UTF8
$commFlags | Export-Csv (Join-Path $Out 'comunicacoes_suspeitas.csv') -NoTypeInformation -Encoding UTF8
$bankChg.Values | ForEach-Object { $_ } | Export-Csv (Join-Path $Out 'trocas_bancarias.csv') -NoTypeInformation -Encoding UTF8

Write-Host "`n===== AGENDA: $($agenda.Count) titulos, $(Money (($agenda | ForEach-Object { Num $_.valor } | Measure-Object -Sum).Sum)) =====" -ForegroundColor Yellow
$agenda | Group-Object lote_remessa | ForEach-Object { '{0}  {1,4} tit  {2,18}' -f $_.Name, $_.Count, (Money (($_.Group | ForEach-Object { Num $_.valor } | Measure-Object -Sum).Sum)) }

Write-Host "`n===== ACHADOS POR TIPO (titulos distintos / valor em risco) =====" -ForegroundColor Yellow
$achados | Group-Object tipo | Sort-Object Count -Descending | ForEach-Object {
  $u = $_.Group | Sort-Object titulo -Unique
  '{0,-26} {1,4} tit  {2,18}  [{3}]' -f $_.Name, $u.Count, (Money (($u | Measure-Object valor -Sum).Sum)), (($_.Group.severidade | Select-Object -Unique) -join '/') }

Write-Host "`n===== DETALHE (severidade ALTA, exceto ruido) =====" -ForegroundColor Yellow
$achados | Where-Object { $_.severidade -eq 'ALTA' } | Sort-Object tipo, lote | Select-Object -First $MaxLinhas | ForEach-Object { '[{0}] {1} {2} {3} {4} {5} | {6}' -f $_.tipo, $_.lote, $_.titulo, $_.fornecedor, $_.nome, (Money $_.valor), $_.detalhe }

Write-Host "`n===== TROCAS BANCARIAS ultimos 120d =====" -ForegroundColor Yellow
foreach ($fid in $bankChg.Keys) { foreach ($bc in $bankChg[$fid]) { $na = @($agenda | Where-Object { $_.fornecedor_id -eq $fid }); '{0} {1} {2} {3} {4}->{5} via {6} por {7} | {8} | agenda: {9} tit {10}' -f $fid, $fornById[$fid].nome_fantasia, $bc.quando.ToString('yyyy-MM-dd'), $bc.campo, $bc.de, $bc.para, $bc.origem, $bc.por, $bc.veredito, $na.Count, (Money (($na | ForEach-Object { Num $_.valor } | Measure-Object -Sum).Sum)) } }

Write-Host "`n===== COMUNICACOES SUSPEITAS (canal nao oficial ou boleto divergente) =====" -ForegroundColor Yellow
$commFlags | Where-Object { $_.via -ne 'oficial' -or $_.boletoDivergente } | Select-Object -First $MaxLinhas | ForEach-Object { $tx = if ($_.texto.Length -gt 140) { $_.texto.Substring(0, 140) } else { $_.texto }; '{0} {1} {2} {3} [{4}] forn={5} bolDiv={6} | {7} | {8}' -f $_.id, $_.data, $_.canal, $_.rem, $_.via, $_.fid, $_.boletoDivergente, $_.assunto, $tx }

Write-Host "`n===== ALCADAS NA AGENDA =====" -ForegroundColor Yellow
$aprov | Group-Object nivel | ForEach-Object { '{0,-16} {1,4} tit {2,18}' -f $_.Name, $_.Count, (Money (($_.Group | Measure-Object valor -Sum).Sum)) }
'Aprovacao dupla: {0} titulos' -f @($aprov | Where-Object { $_.dupla }).Count
$aprov | Where-Object { $_.dupla } | Group-Object dupla | ForEach-Object { '   {0,-60} {1,4}' -f $_.Name, $_.Count }
Write-Host "`n===== HISTORICO: mesma NF/parcela PAGA 2x (recuperacao - controller PS09) =====" -ForegroundColor Yellow
$hist = @($cap | Where-Object { $_.status -eq 'pago' -and $_.numero_nf_digitado } | Group-Object { "$($_.fornecedor_id)|$(NormNF $_.numero_nf_digitado)|$($_.parcela)" } | Where-Object Count -gt 1)
$perda = ($hist | ForEach-Object { ($_.Group | ForEach-Object { Num $_.valor } | Sort-Object | Select-Object -First ($_.Count - 1) | Measure-Object -Sum).Sum } | Measure-Object -Sum).Sum
'{0} parcelas pagas em duplicidade (ago-out), {1} pagos a mais' -f $hist.Count, (Money $perda)
$hist | ForEach-Object { $_.Group } | Group-Object origem_lancamento | ForEach-Object { '   origem {0}: {1}' -f $_.Name, $_.Count }
$hist | ForEach-Object { [pscustomobject]@{chave = $_.Name; titulos = ($_.Group.titulo_id -join ';'); valores = ($_.Group.valor -join ';'); pago_em = ($_.Group.data_pagamento -join ';') } } | Export-Csv (Join-Path $Out 'duplicidades_historicas_pagas.csv') -NoTypeInformation -Encoding UTF8
Write-Host "`nCSVs gravados em $Out" -ForegroundColor Cyan
