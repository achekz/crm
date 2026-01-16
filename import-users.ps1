# Script to import users from users_tunisia.csv to the database
# This script will upload the CSV file and run the import on the server

$VPS_HOST = "31.97.38.243"
$VPS_USER = "root"
$APP_DIR = "/var/www/crm"
$CSV_FILE = "backend/users_tunisia.csv"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Import Users to Database" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if CSV file exists
if (-not (Test-Path $CSV_FILE)) {
    Write-Host "[ERROR] CSV file not found: $CSV_FILE" -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("CSV file not found: $CSV_FILE`n`nPlease ensure the file exists.", "Import Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
    exit 1
}

Write-Host "Step 1: Uploading CSV file to server..." -ForegroundColor Yellow
$sshTarget = $VPS_USER + '@' + $VPS_HOST

try {
    scp -o StrictHostKeyChecking=no $CSV_FILE "${sshTarget}:${APP_DIR}/backend/users_tunisia.csv" 2>&1 | Out-Null
    Write-Host "[OK] CSV file uploaded" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to upload CSV file" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("Failed to upload CSV file.`n`nError: $($_.Exception.Message)", "Upload Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
    exit 1
}
Write-Host ""

# Step 2: Check if backend is running
Write-Host "Step 2: Checking backend status..." -ForegroundColor Yellow
$pm2Status = ssh -o StrictHostKeyChecking=no $sshTarget "pm2 status | grep crm-backend" 2>&1
if ($pm2Status -match "crm-backend") {
    Write-Host "[OK] Backend is running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Backend is not running. Starting it..." -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no $sshTarget "cd ${APP_DIR}/backend && pm2 start ecosystem.config.js" 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}
Write-Host ""

# Step 3: Check MongoDB connection
Write-Host "Step 3: Checking MongoDB connection..." -ForegroundColor Yellow
$mongoStatus = ssh -o StrictHostKeyChecking=no $sshTarget "systemctl is-active mongod" 2>&1
if ($mongoStatus -match "active") {
    Write-Host "[OK] MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] MongoDB may not be running" -ForegroundColor Yellow
    Write-Host "  Attempting to start MongoDB..." -ForegroundColor Gray
    ssh -o StrictHostKeyChecking=no $sshTarget "systemctl start mongod" 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}
Write-Host ""

# Step 4: Run the import script
Write-Host "Step 4: Running import script..." -ForegroundColor Yellow
Write-Host "  This will import users from users_tunisia.csv" -ForegroundColor Gray
Write-Host ""

# Try using ts-node first, if not available, use compiled version
$importCommand = "cd ${APP_DIR}/backend && (npm run import-users 2>&1 || node dist/scripts/importUsers.js 2>&1)"
$importOutput = ssh -o StrictHostKeyChecking=no $sshTarget $importCommand 2>&1

Write-Host "Import Output:" -ForegroundColor Cyan
Write-Host $importOutput -ForegroundColor White
Write-Host ""

# Check if import was successful
if ($importOutput -match "Import completed" -or $importOutput -match "imported" -or $LASTEXITCODE -eq 0) {
    Write-Host "[OK] Users imported successfully!" -ForegroundColor Green
    
    # Count imported users
    $userCount = ssh -o StrictHostKeyChecking=no $sshTarget "cd ${APP_DIR}/backend && node -e `"const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI).then(() => { const User = mongoose.model('User', new mongoose.Schema({}, {strict: false})); User.countDocuments().then(count => { console.log(count); mongoose.disconnect(); }); });`"" 2>&1
    Write-Host "  Total users in database: $userCount" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] Import may have encountered issues" -ForegroundColor Yellow
    Write-Host "  Check the output above for details" -ForegroundColor Gray
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Import Complete" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now login with:" -ForegroundColor Yellow
Write-Host "  Admin: admin.tunisia@email.com / admin123" -ForegroundColor White
Write-Host "  Client: ahmed.benali@email.com / azerty123" -ForegroundColor White
Write-Host ""

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("User import complete!`n`nYou can now login with:`nAdmin: admin.tunisia@email.com / admin123`nClient: ahmed.benali@email.com / azerty123", "Import Complete", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null

