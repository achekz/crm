# Quick status check script

$VPS_HOST = "31.97.38.243"
$VPS_USER = "root"
$DOMAIN = "cmtaudit.tn"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Checking Deployment Status" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend status..." -ForegroundColor Yellow
try {
    $sshTarget = $VPS_USER + '@' + $VPS_HOST
    $pm2Status = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $sshTarget "pm2 status" 2>&1
    if ($pm2Status -match "crm-backend") {
        Write-Host "[OK] Backend is running" -ForegroundColor Green
        Write-Host $pm2Status -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] Backend may not be running" -ForegroundColor Yellow
        Write-Host $pm2Status -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Could not check backend status" -ForegroundColor Red
}
Write-Host ""

# Check if Nginx is running
Write-Host "2. Checking Nginx status..." -ForegroundColor Yellow
try {
    $sshTarget = $VPS_USER + '@' + $VPS_HOST
    $nginxStatus = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $sshTarget "systemctl is-active nginx" 2>&1
    if ($nginxStatus -match "active") {
        Write-Host "[OK] Nginx is running" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Nginx may not be running" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Could not check Nginx status" -ForegroundColor Red
}
Write-Host ""

# Check if application directory exists
Write-Host "3. Checking application files..." -ForegroundColor Yellow
try {
    $sshTarget = $VPS_USER + '@' + $VPS_HOST
    $appCheck = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $sshTarget "test -d /var/www/crm && echo 'exists' || echo 'missing'" 2>&1
    if ($appCheck -match "exists") {
        Write-Host "[OK] Application directory exists" -ForegroundColor Green
        
        # Check for key files
        $filesCheck = ssh -o StrictHostKeyChecking=no $sshTarget "cd /var/www/crm && ls -la package.json backend/package.json dist/index.html 2>/dev/null | wc -l" 2>&1
        Write-Host "  Files check: $filesCheck" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] Application directory not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Could not check application files" -ForegroundColor Red
}
Write-Host ""

# Check website accessibility
Write-Host "4. Checking website accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$DOMAIN" -Method Head -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Website is accessible at http://$DOMAIN" -ForegroundColor Green
        Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] Website returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    try {
        $response = Invoke-WebRequest -Uri "http://$VPS_HOST" -Method Head -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] Website is accessible at http://$VPS_HOST" -ForegroundColor Green
            Write-Host "  Note: Using IP address instead of domain" -ForegroundColor Gray
        }
    } catch {
        Write-Host "[ERROR] Website is not accessible" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
}
Write-Host ""

# Check API endpoint
Write-Host "5. Checking API endpoint..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-WebRequest -Uri "http://$DOMAIN/api" -Method Get -TimeoutSec 10 -ErrorAction SilentlyContinue
    Write-Host "[OK] API endpoint is responding" -ForegroundColor Green
} catch {
    try {
        $apiResponse = Invoke-WebRequest -Uri "http://$VPS_HOST/api" -Method Get -TimeoutSec 10 -ErrorAction SilentlyContinue
        Write-Host "[OK] API endpoint is responding (via IP)" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] API endpoint may not be working" -ForegroundColor Yellow
        Write-Host "  This is normal if authentication is required" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Status Check Complete" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view backend logs:" -ForegroundColor Yellow
Write-Host "  ssh $VPS_USER@$VPS_HOST 'pm2 logs crm-backend'" -ForegroundColor White
Write-Host ""
Write-Host "To restart services:" -ForegroundColor Yellow
Write-Host "  ssh $VPS_USER@$VPS_HOST 'pm2 restart crm-backend'" -ForegroundColor White
Write-Host "  ssh $VPS_USER@$VPS_HOST 'systemctl restart nginx'" -ForegroundColor White
Write-Host ""
# Show OK button to exit
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("Status check complete. Click OK to exit.", "Deployment Status", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null

