@echo off
chcp 65001 >nul
title Painel de Recargas 1.0

cd /d "%~dp0"

echo ========================================
echo    PAINEL DE RECARGAS 1.0
echo    Lovable Remix Automation
echo ========================================
echo.

:: Verificar se o Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

:: Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo [INFO] Instalando dependências...
    npm install
    echo.
)

:: Matar processo na porta 3008 se existir
echo [INFO] Verificando porta 3008...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3008 ^| findstr LISTENING') do (
    echo [INFO] Encerrando processo existente na porta 3008...
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo [INFO] Iniciando servidor na porta 3008...
echo [INFO] Acesse: http://localhost:3008
echo.
echo [INFO] Pressione Ctrl+C para encerrar
echo ========================================
echo.

:: Abrir navegador após 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3008"

:: Iniciar servidor
node src/server.js

echo.
echo [INFO] Servidor encerrado.
pause
