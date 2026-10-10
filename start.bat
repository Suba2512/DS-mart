@echo off
title DS Mart - Data Structures Shopping Game
color 0b
echo ================================================================
echo           DS MART - AN INTERACTIVE DATA STRUCTURES GAME
echo ================================================================
echo.
echo [1/3] Checking C Engine...
cd /d "%~dp0backend"

if not exist "ds_core.exe" (
    echo [INFO] Compiling C Engine with GCC...
    gcc -O2 ds_core.c -o ds_core.exe
    if errorlevel 1 (
        echo [ERROR] Failed to compile ds_core.c. Ensure GCC is installed.
        pause
        exit /b
    )
    echo [OK] C Engine compiled successfully!
) else (
    echo [OK] C Engine binary ready: ds_core.exe.
)

echo.
echo [2/3] Launching Game in your Default Web Browser...
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo [3/3] Starting DS Mart Node.js Server on port 3000...
echo ----------------------------------------------------------------
echo   Keep this window open while playing! Press Ctrl+C to stop.
echo ----------------------------------------------------------------
echo.
node server.js
pause
