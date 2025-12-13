import puppeteer from 'puppeteer';
import fs from 'fs';

async function generatePDF(htmlFile, outputFile) {
    console.log(`🔄 Génération de ${outputFile}...`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        // Lire le fichier HTML
        const htmlContent = fs.readFileSync(htmlFile, 'utf8');
        
        // Définir le contenu HTML
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // Configuration pour le PDF A4
        await page.pdf({
            path: outputFile,
            format: 'A4',
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            },
            printBackground: true,
            preferCSSPageSize: true
        });
        
        console.log(`✅ PDF généré: ${outputFile}`);
    } catch (error) {
        console.error(`❌ Erreur lors de la génération de ${outputFile}:`, error.message);
    } finally {
        await browser.close();
    }
}

async function generateAllPDFs() {
    const files = [
        'Note_Honoraires_Mustapha_TEMIMI_Avril_2025.html',
        'Note_Honoraires_Mustapha_TEMIMI_Mai_2025.html',
        'Note_Honoraires_Mustapha_TEMIMI_Juin_2025.html',
        'Note_Honoraires_Mustapha_TEMIMI_Juillet_2025.html'
    ];
    
    console.log('🚀 Début de la génération des PDFs...\n');
    
    for (const file of files) {
        if (fs.existsSync(file)) {
            const outputFile = file.replace('.html', '.pdf');
            await generatePDF(file, outputFile);
        } else {
            console.log(`⚠️  Fichier non trouvé: ${file}`);
        }
    }
    
    console.log('\n🎉 Génération terminée !');
    console.log('\n📁 PDFs générés:');
    files.forEach(file => {
        const pdfFile = file.replace('.html', '.pdf');
        if (fs.existsSync(pdfFile)) {
            console.log(`   ✅ ${pdfFile}`);
        }
    });
}

// Exécuter le script
generateAllPDFs().catch(console.error); 