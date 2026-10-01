$ErrorActionPreference = "SilentlyContinue"

function Find-IntelliJTool {
    param([string]$RelativePath)

    $jetBrainsRoot = "C:\Program Files\JetBrains"
    if (-not (Test-Path -LiteralPath $jetBrainsRoot)) { return $null }

    return Get-ChildItem -LiteralPath $jetBrainsRoot -Directory |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { Join-Path $_.FullName $RelativePath } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
}

Write-Host "SWP391-GROUP5 environment check" -ForegroundColor Cyan

$javaPath = Find-IntelliJTool "jbr\bin\java.exe"
if (-not $javaPath) { $javaPath = (Get-Command java).Source }
$javaVersion = if ($javaPath) { (Get-Item -LiteralPath $javaPath).VersionInfo.ProductVersion }
$javaMajor = if ("$javaVersion" -match '^(\d+)') { [int]$Matches[1] } else { 0 }

if ($javaMajor -ge 21) {
    Write-Host "[READY] Java $javaMajor - $javaPath" -ForegroundColor Green
} else {
    Write-Host "[MISSING] JDK 21+" -ForegroundColor Red
}

$mavenPath = (Get-Command mvn).Source
if (-not $mavenPath) { $mavenPath = Find-IntelliJTool "plugins\maven-plugin\lib\maven3\bin\mvn.cmd" }
if ($mavenPath) {
    $mavenLine = & $mavenPath -version 2>&1 | Select-Object -First 1
    Write-Host "[READY] $mavenLine - $mavenPath" -ForegroundColor Green
} else {
    Write-Host "[MISSING] Maven 3.9+" -ForegroundColor Red
}

$nodePath = (Get-Command node).Source
if ($nodePath) {
    Write-Host "[READY] Node.js $(& $nodePath --version) - $nodePath" -ForegroundColor Green
} else {
    Write-Host "[MISSING] Node.js 20.19+ or 22.12+" -ForegroundColor Red
}

$packageManager = Get-Command pnpm
if (-not $packageManager) { $packageManager = Get-Command npm }
if ($packageManager) {
    Write-Host "[READY] $($packageManager.Name) $(& $packageManager.Source --version)" -ForegroundColor Green
} else {
    Write-Host "[MISSING] pnpm or npm" -ForegroundColor Red
}

if (Get-Command docker) {
    Write-Host "[READY] $(& docker --version)" -ForegroundColor Green
} else {
    Write-Host "[MISSING] Docker Desktop or another MySQL 8.4 server" -ForegroundColor Yellow
}

Write-Host "`nExpected local services:" -ForegroundColor Cyan
Write-Host "React:      http://localhost:5173"
Write-Host "Spring API: http://localhost:8080"
Write-Host "MySQL:      localhost:3306/premium_news_ad_local"
