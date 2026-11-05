@echo off
chcp 65001 >nul
title TaleBridge Installer Launcher
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
set "INSTALL_EXIT=%ERRORLEVEL%"
if %INSTALL_EXIT% NEQ 0 (
    echo.
    echo Ошибка при запуске установщика PowerShell.
    pause
)
exit /b %INSTALL_EXIT%
