@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: --- FIX POUR LES COULEURS (ANSI) ---
:: Cette commande magique active l'interprétation des codes couleurs sous Windows
for /f "tokens=2 delims==" %%a in ('set ^| findstr /I "ALLUSERSPROFILE"') do set "ESC= "
:: Si le caractère au-dessus ne s'affiche pas bien, on utilise une autre méthode :
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"

:: Définition des couleurs
set "G=%ESC%[92m"
set "B=%ESC%[94m"
set "Y=%ESC%[93m"
set "R=%ESC%[91m"
set "W=%ESC%[0m"
set "CYAN=%ESC%[96m"

set "TARGET_DIR=tools"

:menu
cls
echo.
echo  %CYAN%┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓%W%
echo  %CYAN%┃%W%  %B%PRO-LAUNCHER%W% : %W%/%TARGET_DIR%                  %CYAN%┃%W%
echo  %CYAN%┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛%W%
echo.
echo  Scripts détectés :
echo.

set i=0
set "exts=*.py *.sh *.bat *.ps1 *.js"

:: On boucle sur les scripts
for /r "%TARGET_DIR%" %%f in (%exts%) do (
    if not "%%~nxf"=="%~nx0" (
        set /a i+=1
        set "script[!i!]=%%f"
        
        :: Extraction du nom de fichier et dossier parent pour un affichage propre
        set "fname=%%~nxf"
        set "fpath=%%~pf"
        
        :: On affiche l'index en bleu, le chemin raccourci et le fichier en vert
        echo    %B%[!i!]%W% ...!fpath:~-15!%G%!fname!%W%
    )
)

if %i%==0 (
    echo    %R%[!] Aucun script détecté dans /%TARGET_DIR%%W%
    pause
    exit
)

echo.
echo  %CYAN%──────────────────────────────────────────────────%W%
echo    %Y%[Q] QUITTER%W% 
echo  %CYAN%──────────────────────────────────────────────────%W%
echo.
set /p choice="%B%  ❯ Sélection : %W%"

if /i "%choice%"=="Q" exit

if defined script[%choice%] (
    set "target=!script[%choice%]!"
    set "filename=%%~nxA"
    
    cls
    echo.
    echo  %G%[LANCEMENT]%W% %Y%!target!%W%
    echo  %CYAN%──────────────────────────────────────────────────%W%
    echo.
    
    :: Exécution
    if "!target:~-3!"==".py" ( python "!target!" ) else ( start /wait "" "!target!" )
    
    echo.
    echo  %CYAN%──────────────────────────────────────────────────%W%
    echo  %G%[OK]%W% Terminé. Appuyez sur une touche...
    pause >nul
    goto menu
) else (
    echo.
    echo  %R% [!] Choix invalide.%W%
    timeout /t 2 >nul
    goto menu
)
