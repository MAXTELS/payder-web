@echo off
cd /d "%~dp0"
echo ================================================
echo PAYDER web setup
echo ================================================
echo.
node --version
call npm --version
echo.

if not exist ".env.local" (
  echo Creating .env.local from .env.example ...
  copy .env.example .env.local >nul
)
echo.

echo --- Installing npm dependencies ---
call npm install
echo.

echo --- Starting web dev server on http://localhost:3001 (this window stays open - Ctrl+C to stop) ---
set PORT=3001
call npm run dev

echo.
echo Web dev server exited.
pause
