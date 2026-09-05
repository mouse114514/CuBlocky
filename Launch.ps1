<#
.SYNOPSIS
    CuBlocky 一键启动脚本
.DESCRIPTION
    源码模式：构建前后端 → 启动 Kestrel → 打开浏览器
    发布模式：直接运行 CuBlocky.Server.exe
    关闭 PowerShell 窗口即停服务
#>

$ErrorActionPreference = 'Stop'
$Url = 'http://localhost:5099'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ''
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host '    CuBlocky - CU Mod Block Editor' -ForegroundColor Cyan
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host ''

Set-Location $Root

$isRelease = Test-Path 'CuBlocky.Server.exe'

if ($isRelease) {
    # ── 发布模式：直接运行 exe ──
    Write-Host '[1/2] Release mode detected.' -ForegroundColor DarkGray
    Write-Host "[2/2] Starting CuBlocky.Server.exe on $Url ..." -ForegroundColor Yellow
    $proc = Start-Process -FilePath '.\CuBlocky.Server.exe' `
        -ArgumentList "--urls $Url" `
        -WorkingDirectory $Root `
        -PassThru `
        -WindowStyle Hidden
} else {
    # ── 源码模式：构建 + dotnet run ──
    if (-not (Test-Path 'server\wwwroot\index.html')) {
        Write-Host '[1/4] Building frontend...' -ForegroundColor Yellow
        Push-Location web
        npm install --silent | Out-Null
        npx vite build
        Pop-Location
        Write-Host ''
    } else {
        Write-Host '[1/4] Frontend ready (delete server\wwwroot to rebuild).' -ForegroundColor DarkGray
    }

    Write-Host '[2/4] Building server...' -ForegroundColor Yellow
    dotnet build server\server.csproj -c Release --nologo -v q
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  BUILD FAILED.' -ForegroundColor Red
        Read-Host 'Press Enter to exit'
        exit 1
    }
    Write-Host ''

    Write-Host "[3/4] Starting server on $Url ..." -ForegroundColor Yellow
    $proc = Start-Process dotnet -ArgumentList "run --project server\server.csproj -c Release --urls $Url --no-build" `
        -WorkingDirectory $Root `
        -PassThru `
        -WindowStyle Hidden
}

Write-Host "       Server PID: $($proc.Id)" -ForegroundColor DarkGray

# ── 等待就绪 ──
Write-Host '       Waiting for server...' -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $null = Invoke-WebRequest -Uri "$Url/api/catalog" -UseBasicParsing -TimeoutSec 2
        $ready = $true
        break
    } catch {}
}

if ($ready) {
    Write-Host '       Server ready!' -ForegroundColor Green
    Start-Process $Url
} else {
    Write-Host '       Timeout — server may still be starting. Try opening manually.' -ForegroundColor Yellow
}

# ── 保持窗口,监控进程 ──
Write-Host ''
Write-Host '  Server running. Close this window or press Ctrl+C to stop.' -ForegroundColor Cyan
Write-Host ''

try {
    while (-not $proc.HasExited) {
        Start-Sleep -Seconds 2
    }
    Write-Host '  Server stopped.' -ForegroundColor DarkGray
} catch {
    # Ctrl+C / window closed
} finally {
    if (-not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}
