@echo off
setlocal
set "BACKEND=%~dp0backend"
start "BPS JNE - Backend (port 8000)" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%BACKEND%'; if (-not (Test-Path 'venv\Scripts\python.exe')) { Write-Host 'Membuat virtual environment...'; py -m venv venv; if ($LASTEXITCODE -ne 0) { Write-Host 'Gagal: pastikan perintah py (Python Launcher) tersedia.'; pause; exit 1 } }; Write-Host 'Sinkron dependency backend (requirements.txt)...'; & '.\venv\Scripts\python.exe' -m pip install -r requirements.txt; if ($LASTEXITCODE -ne 0) { Write-Host 'Gagal install dependency. Cek koneksi internet / pip.'; pause; exit 1 }; Write-Host 'Menjalankan backend di http://0.0.0.0:8000 ...'; & '.\venv\Scripts\python.exe' run_app.py"
