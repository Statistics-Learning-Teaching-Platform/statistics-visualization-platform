@echo off
REM UTF-8 codepage so any UTF-8 output from Node/Vite renders correctly.
chcp 65001 >nul
setlocal

REM cd to this script's folder (project root) so double-click works from anywhere.
cd /d "%~dp0"

echo ============================================
echo   Statistics Visualization Platform - start
echo ============================================
echo.

REM Check Node.js is installed.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Please install Node.js ^(LTS recommended^):
  echo         https://nodejs.org/
  echo.
  pause
  exit /b 1
)

REM First run: install dependencies if node_modules is missing.
if not exist "node_modules" (
  echo [INIT] node_modules not found, installing dependencies, please wait...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Dependency install failed. Check your network or npm config and retry.
    pause
    exit /b 1
  )
  echo.
)

echo [START] Launching dev server. Open in your browser:
echo         http://127.0.0.1:5173/
echo (Press Ctrl+C to stop the server.)
echo.

REM Use "call" so the script continues after npm exits.
call npm run dev

echo.
echo Dev server stopped.
pause
