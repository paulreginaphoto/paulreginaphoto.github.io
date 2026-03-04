@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: --- COULEURS ANSI ---
set "G=%ESC%[92m"
set "B=%ESC%[94m"
set "Y=%ESC%[93m"
set "R=%ESC%[91m"
set "W=%ESC%[0m"
set "CYAN=%ESC%[96m"

title [GIT] Auto-Push Console

echo.
echo  %CYAN%┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓%W%
echo  %CYAN%┃%W%  %B%GIT PUSH MANAGER%W%                             %CYAN%┃%W%
echo  %CYAN%┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛%W%
echo.

:: 1. Vérification du statut
echo  %W%[1/3] Analyse des modifications...%W%
git status --short
echo.

:: 2. Demande du message de commit
set "msg="
set /p msg="%B%  ❯ Message du commit (laisser vide pour 'update') : %W%"
if "%msg%"=="" set "msg=update %date% %time%"

:: 3. Exécution des commandes Git
echo.
echo  %W%[2/3] Indexation et Commit...%W%
git add .
git commit -m "%msg%"

echo.
echo  %W%[3/3] Envoi vers GitHub...%W%
echo  %CYAN%──────────────────────────────────────────────────%W%
git push
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  %R%[!] Erreur lors du Push. Vérifie ta connexion ou les conflits.%W%
) else (
    echo.
    echo  %G%[SUCCESS] Ton site est à jour sur GitHub !%W%
)
echo  %CYAN%──────────────────────────────────────────────────%W%

echo.
echo  Appuyez sur une touche pour quitter...
pause >nul
