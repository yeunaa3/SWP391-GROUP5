$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.local-runtime'
$mysqlRoot = Join-Path $runtimeRoot 'mysql-8.4.6-winx64'
$dataRoot = Join-Path $runtimeRoot 'mysql-data'
$executable = Join-Path $mysqlRoot 'bin\mysqld.exe'
if (!(Test-Path -LiteralPath $executable) -or !(Test-Path -LiteralPath (Join-Path $dataRoot 'auto.cnf'))) {
    throw 'Portable MySQL has not been initialized on this machine. Use README local setup or Docker Compose.'
}
$client = [Net.Sockets.TcpClient]::new()
try { $client.Connect('127.0.0.1',3307); Write-Host 'Port 3307 is already in use; no additional MySQL started.'; return }
catch { }
finally { $client.Dispose() }
Start-Process -FilePath $executable -WindowStyle Hidden -ArgumentList @(
    '--no-defaults', "--basedir=$($mysqlRoot.Replace('\','/'))", "--datadir=$($dataRoot.Replace('\','/'))",
    '--port=3307', '--bind-address=127.0.0.1', '--mysqlx=OFF', '--default-time-zone=+00:00', '--console'
) -RedirectStandardOutput (Join-Path $runtimeRoot 'mysql.stdout.log') -RedirectStandardError (Join-Path $runtimeRoot 'mysql.stderr.log')
Write-Host 'MySQL starting on 127.0.0.1:3307. Existing database is preserved.'
