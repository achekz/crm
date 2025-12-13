@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    Générateur de PDF - Notes d'Honoaires
echo ========================================
echo.

echo 🚀 Début de la génération des PDFs...
echo.

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js détecté
echo.

REM Installer Puppeteer
echo 📦 Installation de Puppeteer...
npm install puppeteer

REM Générer les PDFs
echo 🔄 Génération des PDFs...
node generate-pdfs.js

echo.
echo 🎉 Génération terminée !
echo.
pause 