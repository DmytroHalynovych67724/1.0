@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js/npm not found. Install Node.js first.
  exit /b 1
)

if not exist .git (
  git init
  git branch -M main
)

if not exist node_modules (
  npm install
)

if not exist .env (
  copy .env.example .env >nul
)

start "E-commerce Dev Server" cmd /k "npm run dev"
start "http://localhost:3000" http://localhost:3000

echo.
echo Project started.
echo Open http://localhost:3000
pause
