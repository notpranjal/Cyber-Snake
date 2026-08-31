@echo off
title Cyber Snake Launcher
color 0b
echo =======================================================
echo          CYBER SNAKE - NEXT-GEN ARCADE
echo =======================================================
echo.
echo Launching Cyber Snake in your default browser...
echo.

cd /d "%~dp0"

if exist "snake game\index.html" (
    start "" "snake game\index.html"
) else if exist "index.html" (
    start "" "index.html"
) else (
    echo [ERROR] index.html not found!
    pause
    exit /b 1
)

echo Game launched successfully! Enjoy playing!
timeout /t 3 >nul
exit
