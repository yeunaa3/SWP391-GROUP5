$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "backend"
$environmentFile = Join-Path $backendRoot ".env"

function Find-IntelliJTool {
    param([string]$RelativePath)

    Get-ChildItem -LiteralPath "C:\Program Files\JetBrains" -Directory |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { Join-Path $_.FullName $RelativePath } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
}

$javaExecutable = Find-IntelliJTool "jbr\bin\java.exe"
$mavenExecutable = (Get-Command mvn -ErrorAction SilentlyContinue).Source
if (-not $mavenExecutable) {
    $mavenExecutable = Find-IntelliJTool "plugins\maven-plugin\lib\maven3\bin\mvn.cmd"
}

if (-not $javaExecutable -or -not $mavenExecutable) {
    throw "JDK 21+ or Maven 3.9+ was not found. Open README.md for setup instructions."
}

if (Test-Path -LiteralPath $environmentFile) {
    Get-Content -LiteralPath $environmentFile |
        Where-Object { $_ -and -not $_.TrimStart().StartsWith("#") -and $_.Contains("=") } |
        ForEach-Object {
            $name, $value = $_ -split "=", 2
            Set-Item -Path "Env:$($name.Trim())" -Value $value.Trim()
        }
}

$env:JAVA_HOME = Split-Path -Parent (Split-Path -Parent $javaExecutable)
Set-Location -LiteralPath $backendRoot
& $mavenExecutable spring-boot:run
