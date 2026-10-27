@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing app dependencies...
  call npm install
  if errorlevel 1 goto failed
)

echo Building the C++ coin engine and web app...
call npm run build
if errorlevel 1 goto failed

echo Starting Coin Flip...
start "Coin Flip server" cmd /k "cd /d ""%~dp0"" && npm start"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
exit /b 0

:failed
echo.
echo Coin Flip could not start. Check the error above; Node.js 20+ and a C++17 compiler are required.
pause
exit /b 1
