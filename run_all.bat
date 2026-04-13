@echo off
echo Starting BPS JNE Dashboard Environment...

echo Launching Backend...
start "Backend API" cmd /k "run_backend.bat"

echo Launching Frontend...
timeout /t 3 /nobreak >nul
start "Frontend App" cmd /k "run_frontend.bat"

echo.
echo Both services are starting...
echo Backend will be at http://localhost:8000
echo Frontend will be at http://localhost:3000
echo.
pause
