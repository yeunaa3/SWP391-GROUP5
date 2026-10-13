$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $projectRoot "frontend"
$pnpm = (Get-Command pnpm -ErrorAction SilentlyContinue).Source

if (-not $pnpm) {
    $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npm) { throw "Install Node.js and npm or pnpm first." }
    Set-Location -LiteralPath $frontendRoot
    if (-not (Test-Path -LiteralPath "node_modules")) { & $npm install }
    & $npm run dev
    exit $LASTEXITCODE
}

Set-Location -LiteralPath $frontendRoot
if (-not (Test-Path -LiteralPath "node_modules")) {
    & $pnpm install
}
& $pnpm dev
