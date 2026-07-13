@echo off
setlocal
cd /d "%~dp0"

echo Checking for processes listening on port 3000...
set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":3000 " ^| findstr LISTENING') do (
  set FOUND=1
  echo Found PID %%p using port 3000, attempting to stop...
  taskkill /PID %%p /F >nul 2>nul
  if errorlevel 1 (
    echo Failed to stop PID %%p
  ) else (
    echo Stopped PID %%p
  )
)

if "%FOUND%"=="0" (
  echo No process found listening on port 3000.
  echo To stop Node.js processes anyway, run:
  echo    taskkill /F /IM node.exe
)

pause
