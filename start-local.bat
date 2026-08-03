@echo off
REM Satu klik start lokal — memanggil start-local.ps1
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
pause
