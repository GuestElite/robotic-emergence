@echo off
REM ================================================================
REM   Robotic Emergence — Lanceur du prototype web pour Windows
REM   Double-clique sur ce fichier pour lancer le jeu.
REM ================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

set PORT=8765
set URL=http://localhost:%PORT%/prototype/

echo.
echo ===============================================
echo   ROBOTIC EMERGENCE - Prototype V0
echo ===============================================
echo.
echo Serveur local : %URL%
echo (Le navigateur s'ouvrira automatiquement)
echo.
echo Pour arreter le serveur : ferme cette fenetre
echo                            ou appuie sur Ctrl+C
echo.

REM Ouvre le navigateur apres 2 secondes (le temps que le serveur demarre)
start "" cmd /c "timeout /t 2 /nobreak >nul && start %URL%"

REM Tente python en premier
where python >nul 2>&1
if not errorlevel 1 (
  python -m http.server %PORT%
  goto :eof
)

REM Sinon py (Python Launcher Windows)
where py >nul 2>&1
if not errorlevel 1 (
  py -m http.server %PORT%
  goto :eof
)

REM Sinon Node + npx http-server
where node >nul 2>&1
if not errorlevel 1 (
  npx -y http-server -p %PORT%
  goto :eof
)

echo.
echo [ERREUR] Aucun runtime trouve.
echo Installe Python 3 depuis https://www.python.org/downloads/
echo (coche bien "Add python.exe to PATH" pendant l'installation)
echo.
pause
