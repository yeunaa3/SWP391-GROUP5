$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $projectRoot "frontend"
$pnpm = (Get-Command pnpm -ErrorAction SilentlyContinue).Source
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source

if (-not $pnpm -and -not $npm) {
    throw "Neither pnpm nor npm was found. Install Node.js before starting the frontend."
}

Set-Location -LiteralPath $frontendRoot
if (-not (Test-Path -LiteralPath "node_modules")) {
    if ($pnpm) {
        & $pnpm install
    } else {
        & $npm install
    }
}

if ($pnpm) {
    & $pnpm dev
} else {
    & $npm run dev
}
