const fs = require('fs');
const path = require('path');

// Read the markdown report
const reportPath = path.join(__dirname, 'CRM_Project_Analysis_Report.md');
const reportContent = fs.readFileSync(reportPath, 'utf8');

// Create an HTML version for better PDF conversion
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRM Project Analysis Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        h3 {
            color: #2980b9;
            margin-top: 25px;
            margin-bottom: 10px;
        }
        .critical {
            background-color: #ffebee;
            border: 1px solid #f44336;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        .warning {
            background-color: #fff3e0;
            border: 1px solid #ff9800;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        .info {
            background-color: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        .success {
            background-color: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        ul, ol {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .priority-high {
            color: #f44336;
            font-weight: bold;
        }
        .priority-medium {
            color: #ff9800;
            font-weight: bold;
        }
        .priority-low {
            color: #4caf50;
            font-weight: bold;
        }
        .page-break {
            page-break-before: always;
        }
        .executive-summary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .toc {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .toc h3 {
            margin-top: 0;
            color: #495057;
        }
        .toc ul {
            list-style: none;
            padding-left: 0;
        }
        .toc li {
            margin-bottom: 5px;
        }
        .toc a {
            color: #007bff;
            text-decoration: none;
        }
        .toc a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        ${reportContent
            .replace(/## (.*?)/g, '<h2>$1</h2>')
            .replace(/### (.*?)/g, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/- \[ \]/g, '<input type="checkbox" disabled>')
            .replace(/- \[x\]/g, '<input type="checkbox" checked disabled>')
            .replace(/🚨/g, '<span style="color: #f44336;">🚨</span>')
            .replace(/🔧/g, '<span style="color: #ff9800;">🔧</span>')
            .replace(/📋/g, '<span style="color: #2196f3;">📋</span>')
            .replace(/🔍/g, '<span style="color: #9c27b0;">🔍</span>')
            .replace(/🎯/g, '<span style="color: #4caf50;">🎯</span>')
            .replace(/📊/g, '<span style="color: #607d8b;">📊</span>')
            .replace(/🛡️/g, '<span style="color: #795548;">🛡️</span>')
            .replace(/🚀/g, '<span style="color: #e91e63;">🚀</span>')
            .replace(/💡/g, '<span style="color: #ffc107;">💡</span>')
            .replace(/📞/g, '<span style="color: #009688;">📞</span>')
            .replace(/📝/g, '<span style="color: #3f51b5;">📝</span>')
        }
    </div>
</body>
</html>
`;

// Save HTML version
const htmlPath = path.join(__dirname, 'CRM_Project_Analysis_Report.html');
fs.writeFileSync(htmlPath, htmlContent);

console.log('✅ HTML report generated successfully!');
console.log('📄 File saved as: CRM_Project_Analysis_Report.html');
console.log('');
console.log('To convert to PDF, you can:');
console.log('1. Open the HTML file in your browser and print to PDF');
console.log('2. Use online tools like html2pdf or similar services');
console.log('3. Use browser developer tools to save as PDF');
console.log('');
console.log('📋 Report Summary:');
console.log('- Critical Security Issues: 4 identified');
console.log('- Backend Integration Gaps: 3 major issues');
console.log('- Performance Opportunities: 5 areas for improvement');
console.log('- Total Recommendations: 20+ actionable items');