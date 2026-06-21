@echo off
title CRM - Starting...
cd /d "%~dp0"

echo.
echo  CRM B2B Electronics Distribution
echo  ================================
echo.
echo  Starting API (port 4000) and Web UI (port 3000)...
echo  Login: admin@crm.local / Admin123!
echo.
echo  Open http://localhost:3000 in your browser when ready.
echo  Press Ctrl+C in each window to stop.
echo.

start "CRM API" cmd /k "cd /d %~dp0 && npm run dev:api"
timeout /t 5 /nobreak >nul
start "CRM Web" cmd /k "cd /d %~dp0 && npm run dev:web"

echo  Two terminal windows opened. Done.