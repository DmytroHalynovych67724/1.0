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

echo Preparing the NaShary demo catalog...
call npm run seed
if errorlevel 1 (
  echo Failed to prepare the database. Check the message above.
  pause
  exit /b 1
)

start "NaShary Dev Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
start "" http://localhost:5173

echo.
echo NaShary started.
echo Open http://localhost:5173
pause
