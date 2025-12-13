# 📄 Générateur de PDF - Notes d'Honoaires

Ce projet génère des PDFs à partir des fichiers HTML des notes d'honoraires pour M. Mustapha TEMIMI.

## 📋 Fichiers inclus

- **Note_Honoraires_Mustapha_TEMIMI_Avril_2025.html** → **Note_Honoraires_Mustapha_TEMIMI_Avril_2025.pdf**
- **Note_Honoraires_Mustapha_TEMIMI_Mai_2025.html** → **Note_Honoraires_Mustapha_TEMIMI_Mai_2025.pdf**
- **Note_Honoraires_Mustapha_TEMIMI_Juin_2025.html** → **Note_Honoraires_Mustapha_TEMIMI_Juin_2025.pdf**
- **Note_Honoraires_Mustapha_TEMIMI_Juillet_2025.html** → **Note_Honoraires_Mustapha_TEMIMI_Juillet_2025.pdf**

## 🚀 Méthodes de génération

### Option 1: Script automatique (Recommandé)

#### Windows (PowerShell)
```powershell
.\generate-pdf.ps1
```

#### Windows (Command Prompt)
```cmd
generate-pdf.bat
```

### Option 2: Manuel avec Node.js

1. **Installer Node.js** (si pas déjà installé)
   - Télécharger depuis: https://nodejs.org/
   - Version recommandée: 16.x ou plus récente

2. **Installer les dépendances**
   ```bash
   npm install puppeteer
   ```

3. **Générer les PDFs**
   ```bash
   node generate-pdf.js
   ```

## 📊 Caractéristiques des PDFs générés

- **Format**: A4 (210mm x 297mm)
- **Marges**: 10mm sur tous les côtés
- **Qualité**: Haute définition
- **Police**: Inter (Google Fonts)
- **Design**: Minimaliste, noir et blanc

## 🎯 Contenu des notes d'honoraires

### Avril 2025 (NH-2025-001)
- **Services**: Phase 1 - Analyse des besoins
- **Montant**: 500,00 TND

### Mai 2025 (NH-2025-002)
- **Services**: Finalisation des spécifications techniques
- **Montant**: 500,00 TND

### Juin 2025 (NH-2025-003)
- **Services**: Développement du site web
- **Montant**: 500,00 TND

### Juillet 2025 (NH-2025-004)
- **Services**: Finalisation du site web et début du développement CRM
- **Montant**: 500,00 TND

## 🔧 Dépannage

### Erreur: "Node.js n'est pas installé"
- Télécharger et installer Node.js depuis https://nodejs.org/
- Redémarrer le terminal après l'installation

### Erreur: "Puppeteer n'est pas installé"
- Exécuter: `npm install puppeteer`
- Ou utiliser les scripts automatiques qui installent automatiquement les dépendances

### Erreur: "Fichier HTML non trouvé"
- Vérifier que tous les fichiers HTML sont présents dans le répertoire
- Vérifier les noms de fichiers (sensible à la casse)

## 📁 Structure des fichiers

```
crm_system/
├── Note_Honoraires_Mustapha_TEMIMI_Avril_2025.html
├── Note_Honoraires_Mustapha_TEMIMI_Mai_2025.html
├── Note_Honoraires_Mustapha_TEMIMI_Juin_2025.html
├── Note_Honoraires_Mustapha_TEMIMI_Juillet_2025.html
├── generate-pdf.js
├── generate-pdf.ps1
├── generate-pdf.bat
├── package.json
└── PDF_GENERATOR_README.md
```

## ✅ Vérification

Après la génération, vous devriez voir:
```
🎉 Génération terminée !

📁 PDFs générés:
   ✅ Note_Honoraires_Mustapha_TEMIMI_Avril_2025.pdf
   ✅ Note_Honoraires_Mustapha_TEMIMI_Mai_2025.pdf
   ✅ Note_Honoraires_Mustapha_TEMIMI_Juin_2025.pdf
   ✅ Note_Honoraires_Mustapha_TEMIMI_Juillet_2025.pdf
```

## 📞 Support

Pour toute question ou problème, contactez:
- **Développeur**: M. Zied El Achek
- **Email**: [Votre email]
- **Téléphone**: [Votre numéro]

---

*Généré automatiquement pour le Cabinet Comptable CMT* 