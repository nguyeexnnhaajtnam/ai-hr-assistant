param(
    [string]$GeminiApiKey = "",
    [switch]$NoOpenBrowser
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Wait-Http([string]$Url, [int]$TimeoutSeconds = 120) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 900
        }
    }
    return $false
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required. Please install Docker Desktop first."
}

$resolvedGeminiKey = $GeminiApiKey
if ([string]::IsNullOrWhiteSpace($resolvedGeminiKey) -and (Test-Path ".env")) {
    $envLine = Get-Content ".env" | Where-Object { $_ -match '^GEMINI_API_KEY=' } | Select-Object -First 1
    if ($envLine) {
        $resolvedGeminiKey = ($envLine -replace '^GEMINI_API_KEY=', '').Trim()
    }
}

if (-not [string]::IsNullOrWhiteSpace($resolvedGeminiKey)) {
    $env:GEMINI_API_KEY = $resolvedGeminiKey
} else {
    Remove-Item Env:GEMINI_API_KEY -ErrorAction SilentlyContinue
}
$uiUrl = "http://127.0.0.1:8000/"
$healthUrl = "http://127.0.0.1:8000/health"

Write-Step "Building and starting Docker stack"
docker compose -f docker-compose.demo.yml up -d --build

Write-Step "Waiting for app to become ready"
if (-not (Wait-Http $healthUrl 180)) {
    throw "App did not become ready. Check logs with: docker compose -f docker-compose.demo.yml logs"
}

if (-not $NoOpenBrowser) {
    Start-Process $uiUrl
}

Write-Host ""
Write-Host "App is ready." -ForegroundColor Green
Write-Host "UI:      $uiUrl"
Write-Host "Swagger: http://127.0.0.1:8000/docs"
Write-Host "Health:  $healthUrl"
Write-Host ""
Write-Host "To stop it later, run: powershell -ExecutionPolicy Bypass -File .\stop.ps1"
