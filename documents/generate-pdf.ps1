# Script PowerShell pour générer les PDFs des notes d'honoraires

Write-Host "🚀 Début de la génération des PDFs..." -ForegroundColor Green

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Installer Puppeteer si nécessaire
Write-Host "📦 Installation de Puppeteer..." -ForegroundColor Yellow
npm install puppeteer

# Générer les PDFs
Write-Host "🔄 Génération des PDFs..." -ForegroundColor Yellow
node generate-pdfs.js

Write-Host "🎉 Génération terminée !" -ForegroundColor Green 