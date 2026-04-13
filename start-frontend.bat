@echo off
setlocal
set "FRONTEND=%~dp0frontend"
start "BPS JNE - Frontend (Next.js)" powershell -NoExit -ExecutionPolicy Bypass -Command ^
  "Set-Location -LiteralPath '%FRONTEND%'; ^
   if (-not (Test-Path 'node_modules')) { Write-Host 'npm install (pertama kali)...'; npm install }; ^
   Write-Host 'Menjalankan frontend (biasanya http://localhost:3000) ...'; ^
   npm run dev"
