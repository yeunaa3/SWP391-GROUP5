$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $projectRoot "frontend"
$pnpm = (Get-Command pnpm -ErrorAction SilentlyContinue).Source

if (-not $pnpm) {
    throw "pnpm was not found. Install Node.js and run: corepack enable"
}

Set-Location -LiteralPath $frontendRoot
if (-not (Test-Path -LiteralPath "node_modules")) {
    & $pnpm install
}
& $pnpm dev
