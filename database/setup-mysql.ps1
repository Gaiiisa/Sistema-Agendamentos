# ============================================================
# setup-mysql.ps1
# Instala o MySQL 8.4, sobe o servidor e RESTAURA o banco 'agendamentos'
# a partir do dump do projeto — deixando-o IDÊNTICO ao da outra máquina.
#
# Uso (PowerShell, a partir da RAIZ do projeto):
#   powershell -ExecutionPolicy Bypass -File database\setup-mysql.ps1
#
# Não precisa de admin. Requer 'winget' (App Installer, já vem no Win 10/11)
# e o arquivo database\agendamentos-dump.sql (vem junto no git).
# ============================================================
$ErrorActionPreference = 'Stop'

$DataDir = Join-Path $env:USERPROFILE 'mysql-data'
$Dump    = Join-Path $PSScriptRoot 'agendamentos-dump.sql'

if (-not (Test-Path $Dump)) { throw "Dump nao encontrado: $Dump  (rode 'git pull' antes)" }

# 1) Instala o MySQL (ignora se ja estiver instalado)
Write-Host '== [1/6] Instalando MySQL via winget =='
try {
  winget install --id Oracle.MySQL -e --accept-source-agreements --accept-package-agreements
} catch {
  Write-Host '   (winget indisponivel ou MySQL ja instalado; seguindo)'
}

# 2) Localiza os binarios (independe do PATH)
$server = Get-ChildItem 'C:\Program Files\MySQL' -Directory -Filter 'MySQL Server *' -ErrorAction SilentlyContinue |
          Sort-Object Name -Descending | Select-Object -First 1
if (-not $server) { throw 'Binarios do MySQL nao encontrados em C:\Program Files\MySQL' }
$bin    = Join-Path $server.FullName 'bin'
$mysqld = Join-Path $bin 'mysqld.exe'
$mysql  = Join-Path $bin 'mysql.exe'
Write-Host "== [2/6] MySQL encontrado em: $bin =="

# 3) Inicializa o data dir (apenas na primeira vez)
$fresh = -not (Test-Path $DataDir)
if ($fresh) {
  Write-Host '== [3/6] Inicializando data dir (sem senha) =='
  & $mysqld --initialize-insecure "--datadir=$DataDir"
} else {
  Write-Host '== [3/6] Data dir ja existe; pulando init =='
}

# 4) Sobe o servidor (se nao estiver no ar) e aguarda a porta 3306
if (-not (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue)) {
  Write-Host '== [4/6] Iniciando o servidor MySQL =='
  Start-Process $mysqld -ArgumentList "--datadir=$DataDir" -WindowStyle Hidden
}
$up = $false
foreach ($i in 1..30) {
  Start-Sleep -Milliseconds 700
  if (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue) { $up = $true; break }
}
if (-not $up) { throw 'MySQL nao subiu na porta 3306' }

# 5) Define a senha do root = 'root' (so na primeira vez, apos o init sem senha)
if ($fresh) {
  Write-Host '== [5/6] Definindo a senha do root =='
  & $mysql -u root --skip-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'root'; FLUSH PRIVILEGES;"
} else {
  Write-Host '== [5/6] Senha do root ja configurada; pulando =='
}

# 6) Restaura o dump (recria e sobrescreve o banco 'agendamentos')
Write-Host '== [6/6] Restaurando o banco a partir do dump =='
$dumpFwd = $Dump -replace '\\', '/'
& $mysql -u root -proot --default-character-set=utf8mb4 -e "SOURCE $dumpFwd"

Write-Host ''
Write-Host '======================================================'
Write-Host ' Pronto! Banco "agendamentos" restaurado (identico).'
Write-Host ' Logins:  admin / admin'
Write-Host '          carlos@navalhaecia.com / Navalha@2026'
Write-Host '======================================================'
Write-Host ' Apos reiniciar o PC, suba o MySQL de novo com:'
Write-Host "   Start-Process `"$mysqld`" -ArgumentList `"--datadir=$DataDir`" -WindowStyle Hidden"
