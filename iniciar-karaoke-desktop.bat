@echo off
title Pampo Karaokê - Edição Estúdio Desktop
echo ========================================================
echo   PAMPO KARAOKE - VERSAO DESKTOP (ULTRA BAIXA LATENCIA)
echo ========================================================
echo Iniciando aplicativo desktop com switches de audio em tempo real...
cd /d "%~dp0"
call npm run desktop
if %errorlevel% neq 0 (
  echo.
  echo Erro ao iniciar. Pressione qualquer tecla para sair...
  pause >nul
)
