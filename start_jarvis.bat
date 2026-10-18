@echo off
title JARVIS AI - Autonomous Assistant Launcher
color 0B

echo ================================================================
echo    ___  ___  ______  _   _  _____  _____ 
echo   ^|_  ^|^/ _ \ ^| ___ \^| ^| ^| ^|^|_   _^|/  ___^|
echo     ^| ^|/ /_\ \^| ^|_/ /^| ^| ^| ^|  ^| ^|  \ `--. 
echo     ^| ^|^|  _  ^|^|    / ^| ^| ^| ^|  ^| ^|   `--. \
echo /\__/ /^| ^| ^| ^|^| ^|\ \ \ \_/ / _^|_^|_ /\__/ /
echo \____/ \_^| ^|_/\_^| \_^| \___/  \___/ \____/ 
echo.
echo           Autonomous Voice-Controlled Desktop OS
echo ================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: 1. Check Python Virtual Environment or System Python
if exist "%ROOT_DIR%.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%ROOT_DIR%.venv\Scripts\python.exe"
    echo [OK] Python Virtual Environment .venv detected.
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        set "PYTHON_EXE=python"
        echo [OK] System Python detected.
    ) else (
        echo [ERROR] Python was not found in .venv or system PATH.
        echo Please ensure Python is installed and configured.
        pause
        exit /b 1
    )
)

:: 2. Check Node.js / npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm was not found in system PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js and npm detected.

:: 3. Check / Start Ollama if installed
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    netstat -ano 2>nul | findstr ":11434" | findstr "LISTENING" >nul 2>nul
    if %errorlevel% neq 0 (
        echo [OLLAMA] Starting Ollama server in background...
        start "JARVIS_OLLAMA_SVC" /min cmd /c "ollama serve"
        ping 127.0.0.1 -n 2 >nul
    ) else (
        echo [OK] Local Ollama service is already running on port 11434.
    )
)

echo.
:: 4. Clean up any existing instances on ports 8000 and 5173
:RESTART_SERVICES
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul

:: 5. Launch Backend (FastAPI)
echo [1/3] Launching JARVIS Neural Core Backend (Port 8000)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%PYTHON_EXE%' -ArgumentList '-m uvicorn main:app --host 127.0.0.1 --port 8000' -WorkingDirectory '%ROOT_DIR%backend' -WindowStyle Minimized"

:: 6. Launch Frontend (Vite React)
echo [2/3] Launching Holographic Reactor Frontend (Port 5173)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev' -WorkingDirectory '%ROOT_DIR%frontend' -WindowStyle Minimized"

:: 7. Wait for servers to become active
echo [3/3] Establishing neural links and verifying services...

:WAIT_LOOP
ping 127.0.0.1 -n 3 >nul
netstat -ano 2>nul | findstr ":5173" | findstr "LISTENING" >nul 2>nul
if %errorlevel% neq 0 (
    echo       ...waiting for frontend UI to initialize...
    goto WAIT_LOOP
)

:: 8. Launch Browser
echo [ONLINE] Opening JARVIS in your default web browser...
powershell -NoProfile -Command "Start-Process 'http://localhost:5173'"

:CONTROL_MENU
echo.
echo ================================================================
echo  * Status: ONLINE
echo  * Backend API:  http://127.0.0.1:8000
echo  * WebSocket:    ws://127.0.0.1:8000/ws/jarvis
echo  * Frontend UI:  http://localhost:5173
echo ================================================================
echo.
echo  JARVIS SYSTEM CONTROLS:
echo   [1] Open / Focus Web Interface in Browser
echo   [2] Restart JARVIS System Services
echo   [0] SHUT DOWN JARVIS ^& EXIT ALL SERVICES (or press Q)
echo.
echo ================================================================
choice /C 120Q /N /M "Press [1], [2], [0], or [Q] to select an option: "

if errorlevel 4 goto SHUTDOWN
if errorlevel 3 goto SHUTDOWN
if errorlevel 2 goto RESTART_SERVICES
if errorlevel 1 goto OPEN_BROWSER
goto CONTROL_MENU

:OPEN_BROWSER
echo.
echo [JARVIS] Launching Web Interface...
powershell -NoProfile -Command "Start-Process 'http://localhost:5173'"
ping 127.0.0.1 -n 2 >nul
goto CONTROL_MENU

:SHUTDOWN
echo.
echo ================================================================
echo  Shutting down JARVIS services...
echo ================================================================
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul

echo.
echo [OFFLINE] All JARVIS services stopped safely. Goodbye, Sir.
ping 127.0.0.1 -n 3 >nul
exit /b 0
