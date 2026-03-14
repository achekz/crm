# Automated Deployment Script for CRM to Hostinger VPS
# This script handles everything automatically

$ErrorActionPreference = "Stop"

$VPS_HOST = "31.97.38.243"
$VPS_USER = "root"
$VPS_PASS = "CmtAudit123456-"
$APP_DIR = "/var/www/crm"
$DOMAIN = "cmtaudit.tn"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Automated CRM Deployment" -ForegroundColor Cyan
Write-Host "Domain: $DOMAIN" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Function to execute SSH command with password
function Invoke-SSHWithPassword {
    param(
        [string]$Command,
        [string]$Host = $VPS_HOST,
        [string]$User = $VPS_USER,
        [string]$Password = $VPS_PASS
    )
    
    # Try using sshpass if available (Linux/WSL)
    if (Get-Command sshpass -ErrorAction SilentlyContinue) {
        $env:SSHPASS = $Password
        sshpass -e ssh -o StrictHostKeyChecking=no "${User}@${Host}" $Command
        return $LASTEXITCODE -eq 0
    }
    
    # Try using plink (PuTTY) if available
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        $Command | plink -ssh -pw $Password "${User}@${Host}" $Command 2>&1
        return $LASTEXITCODE -eq 0
    }
    
    # Fallback: Try regular SSH (will prompt for password)
    try {
        ssh -o StrictHostKeyChecking=no "${User}@${Host}" $Command 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        Write-Host "SSH command failed. You may need to enter password manually." -ForegroundColor Yellow
        return $false
    }
}

# Function to upload file via SCP
function Invoke-SCPUpload {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$Host = $VPS_HOST,
        [string]$User = $VPS_USER,
        [string]$Password = $VPS_PASS
    )
    
    # Try using sshpass if available
    if (Get-Command sshpass -ErrorAction SilentlyContinue) {
        $env:SSHPASS = $Password
        sshpass -e scp -o StrictHostKeyChecking=no "$LocalPath" "${User}@${Host}:${RemotePath}" 2>&1
        return $LASTEXITCODE -eq 0
    }
    
    # Try using plink (pscp)
    if (Get-Command pscp -ErrorAction SilentlyContinue) {
        pscp -pw $Password "$LocalPath" "${User}@${Host}:${RemotePath}" 2>&1
        return $LASTEXITCODE -eq 0
    }
    
    # Fallback: Regular SCP
    try {
        scp -o StrictHostKeyChecking=no "$LocalPath" "${User}@${Host}:${RemotePath}" 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        Write-Host "SCP upload failed. You may need to enter password manually." -ForegroundColor Yellow
        return $false
    }
}

# Step 1: Test SSH connection
Write-Host "Step 1: Testing SSH connection..." -ForegroundColor Yellow
try {
    $sshTarget = $VPS_USER + '@' + $VPS_HOST
    $testResult = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $sshTarget "echo 'Connected'" 2>&1
    if ($LASTEXITCODE -eq 0 -or $testResult -match "Connected") {
        Write-Host "[OK] SSH connection successful" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] SSH connection may require password. Continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] SSH connection test failed. You may need to enter password when prompted." -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Cleanup existing deployment
Write-Host "Step 2: Cleaning up existing deployment..." -ForegroundColor Yellow
$cleanupCommands = @(
    "pm2 delete crm-backend 2>/dev/null; true",
    "pm2 save 2>/dev/null; true",
    "rm -rf $APP_DIR",
    "rm -f /etc/nginx/sites-available/crm",
    "rm -f /etc/nginx/sites-enabled/crm",
    "systemctl reload nginx 2>/dev/null; true",
    "mkdir -p $APP_DIR",
    "echo Cleanup complete"
)

$cleanupScript = $cleanupCommands -join "; "

try {
    $sshTarget = $VPS_USER + '@' + $VPS_HOST
    $result = ssh -o StrictHostKeyChecking=no $sshTarget $cleanupScript 2>&1
    Write-Host "[OK] Cleanup completed" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Cleanup may have failed. Continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Create archive of project files
Write-Host "Step 3: Preparing project files..." -ForegroundColor Yellow
$archiveName = "crm-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"

# Check if tar is available
if (Get-Command tar -ErrorAction SilentlyContinue) {
    Write-Host "  Creating archive (excluding node_modules, dist, .git)..." -ForegroundColor Gray
    tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='*.log' --exclude='*.tsbuildinfo' --exclude='dist.zip' -czf $archiveName . 2>&1 | Out-Null
    
    if (Test-Path $archiveName) {
        Write-Host "[OK] Archive created: $archiveName" -ForegroundColor Green
        
        # Upload archive
        Write-Host "  Uploading archive to server..." -ForegroundColor Gray
        try {
            $scpTarget = $VPS_USER + '@' + $VPS_HOST
            scp -o StrictHostKeyChecking=no $archiveName "${scpTarget}:${APP_DIR}/" 2>&1 | Out-Null
            Write-Host "[OK] Archive uploaded" -ForegroundColor Green
            
            # Extract on server
            Write-Host "  Extracting files on server..." -ForegroundColor Gray
            $extractCmd = "cd $APP_DIR; tar -xzf $archiveName; rm $archiveName; chmod +x *.sh 2>/dev/null; true"
            $sshTarget = $VPS_USER + '@' + $VPS_HOST
            ssh -o StrictHostKeyChecking=no $sshTarget $extractCmd 2>&1 | Out-Null
            Write-Host "[OK] Files extracted" -ForegroundColor Green
            
            # Cleanup local archive
            Remove-Item $archiveName -Force
        } catch {
            Write-Host "[WARNING] Upload failed. You may need to upload manually." -ForegroundColor Yellow
            Write-Host "  Archive saved as: $archiveName" -ForegroundColor Gray
            Write-Host "  Upload it manually to: ${VPS_USER}@${VPS_HOST}:${APP_DIR}/" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] Archive creation failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] Tar not available. Uploading files directly..." -ForegroundColor Yellow
    Write-Host "  This may take longer..." -ForegroundColor Gray
    
    # Upload key files and directories
    $filesToUpload = @(
        "backend",
        "src",
        "public",
        "package.json",
        "package-lock.json",
        "vite.config.ts",
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.node.json",
        "tailwind.config.js",
        "postcss.config.js",
        "eslint.config.js",
        "index.html",
        "quick-deploy.sh",
        "deploy.sh",
        "deploy-app.sh",
        "cleanup-deployment.sh",
        "redeploy.sh"
    )
    
    foreach ($item in $filesToUpload) {
        if (Test-Path $item) {
            Write-Host "  Uploading $item..." -ForegroundColor Gray
            try {
                if (Test-Path $item -PathType Container) {
                    $scpTarget = $VPS_USER + '@' + $VPS_HOST
                    scp -r -o StrictHostKeyChecking=no $item "${scpTarget}:${APP_DIR}/" 2>&1 | Out-Null
                } else {
                    $scpTarget = $VPS_USER + '@' + $VPS_HOST
                    scp -o StrictHostKeyChecking=no $item "${scpTarget}:${APP_DIR}/" 2>&1 | Out-Null
                }
            } catch {
                Write-Host "    [WARNING] Failed to upload $item" -ForegroundColor Yellow
            }
        }
    }
    Write-Host "[OK] Files uploaded" -ForegroundColor Green
}
Write-Host ""

# Step 4: Run deployment
Write-Host "Step 4: Running deployment on server..." -ForegroundColor Yellow
Write-Host "  This will install Node.js, MongoDB, Nginx, PM2, and deploy the app..." -ForegroundColor Gray
Write-Host "  This may take 5-10 minutes..." -ForegroundColor Gray
Write-Host ""

$deployCommand = "cd $APP_DIR; chmod +x quick-deploy.sh; bash quick-deploy.sh $DOMAIN"

try {
    # Run deployment with output
    $sshTarget = $VPS_USER + '@' + $VPS_HOST
    ssh -o StrictHostKeyChecking=no $sshTarget $deployCommand
    
    Write-Host ""
    Write-Host "[OK] Deployment completed!" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Deployment may have encountered issues." -ForegroundColor Yellow
    Write-Host "  Please check manually: ssh ${VPS_USER}@${VPS_HOST}" -ForegroundColor Gray
    Write-Host "  Then run: cd ${APP_DIR}; ./quick-deploy.sh ${DOMAIN}" -ForegroundColor Gray
}
Write-Host ""

# Step 5: Setup SSL (optional - commented out, uncomment to auto-setup)
Write-Host "Step 5: SSL Certificate Setup" -ForegroundColor Yellow
Write-Host "  To set up SSL certificate, run:" -ForegroundColor Gray
Write-Host "  ssh ${VPS_USER}@${VPS_HOST} 'certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}'" -ForegroundColor White
Write-Host ""

# Final summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application URL: http://${DOMAIN}" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update backend configuration:" -ForegroundColor White
Write-Host "   ssh ${VPS_USER}@${VPS_HOST}" -ForegroundColor Gray
Write-Host "   nano ${APP_DIR}/backend/.env" -ForegroundColor Gray
Write-Host "   # Add your MongoDB URI and Stripe keys" -ForegroundColor DarkGray
Write-Host ""
Write-Host "2. Set up SSL certificate:" -ForegroundColor White
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}`"" -ForegroundColor Gray
Write-Host ""
Write-Host "3. After SSL, update frontend for HTTPS:" -ForegroundColor White
Write-Host "   ssh ${VPS_USER}@${VPS_HOST}" -ForegroundColor Gray
Write-Host "   cd ${APP_DIR}" -ForegroundColor Gray
Write-Host "   echo 'VITE_BACKEND_URL=https://${DOMAIN}' > .env.production" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host "   pm2 restart crm-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Check backend logs:" -ForegroundColor White
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"pm2 logs crm-backend`"" -ForegroundColor Gray
Write-Host ""
# Show OK button to exit
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("Deployment complete! Click OK to exit.", "Deployment Complete", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null

