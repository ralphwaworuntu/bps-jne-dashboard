# Start BPS JNE Dashboard — lokal (Docker + API + Celery + Frontend)
# Klik-ganda file ini, atau:  powershell -ExecutionPolicy Bypass -File .\start-local.ps1
# Stop: tutup jendela API / Celery / Frontend, lalu  docker compose down  (opsional)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Python = Join-Path $Backend "venv\Scripts\python.exe"
$Celery = Join-Path $Backend "venv\Scripts\celery.exe"
$ComposeFile = Join-Path $Root "docker-compose.yml"

function Ensure-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Require-File($Path, $Hint) {
    if (-not (Test-Path $Path)) {
        Write-Host "ERROR: Tidak ditemukan: $Path" -ForegroundColor Red
        Write-Host $Hint -ForegroundColor Yellow
        Read-Host "Tekan Enter untuk keluar"
        exit 1
    }
}

Ensure-Path

Write-Host ""
Write-Host "=== BPS JNE Dashboard — start lokal ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host ""

Require-File $ComposeFile "Pastikan Anda menjalankan skrip dari root repo."
Require-File $Python "Buat venv dulu: cd backend; python -m venv venv; pip install -r requirements.txt"
Require-File $Celery "Install deps: cd backend; pip install -r requirements.txt"
Require-File (Join-Path $Frontend "package.json") "Folder frontend tidak lengkap."

# Docker
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "ERROR: Perintah 'docker' tidak ada di PATH." -ForegroundColor Red
    Write-Host "Buka Docker Desktop, tunggu Engine running, lalu buka ulang terminal." -ForegroundColor Yellow
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Write-Host "[1/4] Docker Compose (Postgres + Redis)..." -ForegroundColor Green
Push-Location $Root
try {
    docker info 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker engine tidak merespons. Buka Docker Desktop dulu."
    }
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up gagal" }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    Pop-Location
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}
Pop-Location

Write-Host "[2/4] Backend API :8000 ..." -ForegroundColor Green
Start-Process -FilePath "powershell" -WorkingDirectory $Backend -ArgumentList @(
    "-NoExit",
    "-Command",
    "& '$Python' -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
)

Write-Host "[3/4] Celery worker (concurrency 2) ..." -ForegroundColor Green
Start-Process -FilePath "powershell" -WorkingDirectory $Backend -ArgumentList @(
    "-NoExit",
    "-Command",
    "& '$Celery' -A celery_app.celery worker --loglevel=INFO --pool=threads --concurrency=2"
)

Write-Host "[4/4] Frontend :3000 ..." -ForegroundColor Green
Start-Process -FilePath "powershell" -WorkingDirectory $Frontend -ArgumentList @(
    "-NoExit",
    "-Command",
    "npm run dev -- --hostname 0.0.0.0 --port 3000"
)

Write-Host ""
Write-Host "Selesai. Tiga jendela terminal akan terbuka." -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:3000"
Write-Host "  API docs : http://localhost:8000/docs"
Write-Host "  Postgres : localhost:5433  |  Redis : localhost:6379"
Write-Host ""
Write-Host "Tunggu ~15–60 detik sampai frontend Ready, lalu buka browser."
Write-Host "Stop: tutup 3 jendela PowerShell itu. Docker biarkan jalan, atau: docker compose down"
Write-Host ""
Start-Sleep -Seconds 4
