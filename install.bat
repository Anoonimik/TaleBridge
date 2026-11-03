@echo off
chcp 65001 >nul
title TaleBridge Installer Launcher
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ошибка при запуске установщика PowerShell.
    pause
)
