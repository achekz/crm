# PowerShell script to deploy CRM to Hostinger VPS
# Run this from the project root directory

$VPS_HOST = "31.97.38.243"
$VPS_USER = "root"
$VPS_PASS = "CmtAudit123456-"
$APP_DIR = "/var/www/crm"
$DOMAIN = "cmtaudit.tn"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CRM Deployment to Hostinger VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSH is available
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "SSH is not available. Please install OpenSSH client." -ForegroundColor Red
    Write-Host "Or use WinSCP/FileZilla to upload files manually." -ForegroundColor Yellow
    exit 1
}

# Function to execute SSH command
function Invoke-SSHCommand {
    param([string]$Command)
    
    $tempScript = [System.IO.Path]::GetTempFileName()
    $Command | Out-File -FilePath $tempScript -Encoding ASCII
    
    try {
        # Use sshpass equivalent or expect-like approach
        # For Windows, we'll use a different method
        $result = ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" $Command 2>&1
        return $result
    } catch {
        Write-Host "Error executing SSH command: $_" -ForegroundColor Red
        return $null
    } finally {
        Remove-Item $tempScript -ErrorAction SilentlyContinue
    }
}

Write-Host "Step 0: Cleaning up existing deployment..." -ForegroundColor Yellow
# Upload cleanup script
scp -o StrictHostKeyChecking=no cleanup-deployment.sh "${VPS_USER}@${VPS_HOST}:/tmp/"
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "chmod +x /tmp/cleanup-deployment.sh && bash /tmp/cleanup-deployment.sh"
Write-Host "✓ Cleanup completed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Testing SSH connection..." -ForegroundColor Yellow
try {
    $testResult = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${VPS_USER}@${VPS_HOST}" "echo 'Connection successful'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SSH connection successful" -ForegroundColor Green
    } else {
        Write-Host "✗ SSH connection failed" -ForegroundColor Red
        Write-Host "Please ensure SSH access is configured." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "✗ SSH connection failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Upload files manually using WinSCP or FileZilla:" -ForegroundColor Yellow
    Write-Host "  Host: $VPS_HOST" -ForegroundColor White
    Write-Host "  User: $VPS_USER" -ForegroundColor White
    Write-Host "  Password: [your password]" -ForegroundColor White
    Write-Host "  Remote directory: $APP_DIR" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Step 2: Creating application directory on VPS..." -ForegroundColor Yellow
$createDirCmd = "mkdir -p $APP_DIR && chown -R $VPS_USER:$VPS_USER $APP_DIR"
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" $createDirCmd
Write-Host "✓ Directory created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Uploading deployment scripts..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no deploy.sh "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
scp -o StrictHostKeyChecking=no deploy-app.sh "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
scp -o StrictHostKeyChecking=no quick-deploy.sh "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
scp -o StrictHostKeyChecking=no redeploy.sh "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "chmod +x ${APP_DIR}/*.sh" 2>&1 | Out-Null
Write-Host "✓ Deployment scripts uploaded" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Uploading application files..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

# Exclude node_modules, dist, and other unnecessary files
$excludePatterns = @(
    "node_modules",
    ".git",
    "dist",
    "*.log",
    ".env",
    ".env.local",
    ".env.production"
)

# Create a temporary archive (excluding node_modules and dist)
Write-Host "Creating archive (excluding node_modules and dist)..." -ForegroundColor Gray
$archiveName = "crm-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"

# Use tar if available, otherwise just upload files
if (Get-Command tar -ErrorAction SilentlyContinue) {
    # Create archive excluding node_modules and dist
    tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='*.log' -czf $archiveName .
    scp -o StrictHostKeyChecking=no $archiveName "${VPS_USER}@${VPS_HOST}:${APP_DIR}/"
    ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "cd ${APP_DIR} && tar -xzf $archiveName && rm $archiveName"
    Remove-Item $archiveName
    Write-Host "✓ Files uploaded via archive" -ForegroundColor Green
} else {
    Write-Host "Tar not available. Uploading files directly..." -ForegroundColor Yellow
    Write-Host "Note: This will upload all files. node_modules will be installed on server." -ForegroundColor Yellow
    
    # Upload entire directory (excluding .git via rsync if available, or manual selection)
    # For now, we'll upload everything and let the server handle it
    Write-Host "Uploading project files..." -ForegroundColor Gray
    
    # Use rsync if available, otherwise scp
    if (Get-Command rsync -ErrorAction SilentlyContinue) {
        rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.git' --exclude '*.log' -e "ssh -o StrictHostKeyChecking=no" ./ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/"
    } else {
        # Manual file upload - upload key directories
        Write-Host "Uploading backend..." -ForegroundColor Gray
        scp -r -o StrictHostKeyChecking=no backend "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
        
        Write-Host "Uploading frontend source..." -ForegroundColor Gray
        scp -r -o StrictHostKeyChecking=no src "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
        scp -r -o StrictHostKeyChecking=no public "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
        
        Write-Host "Uploading configuration files..." -ForegroundColor Gray
        scp -o StrictHostKeyChecking=no package.json package-lock.json "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
        scp -o StrictHostKeyChecking=no vite.config.ts tsconfig*.json "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
        scp -o StrictHostKeyChecking=no tailwind.config.js postcss.config.js eslint.config.js "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
        scp -o StrictHostKeyChecking=no index.html "${VPS_USER}@${VPS_HOST}:${APP_DIR}/" 2>&1 | Out-Null
    }
    
    Write-Host "✓ Files uploaded" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 5: Running server setup on VPS..." -ForegroundColor Yellow
Write-Host "This will install Node.js, MongoDB, Nginx, PM2, etc." -ForegroundColor Gray
Write-Host ""

# Run quick deployment (all-in-one)
Write-Host ""
Write-Host "Step 6: Deploying application..." -ForegroundColor Yellow
Write-Host "Using domain: $DOMAIN" -ForegroundColor Cyan
Write-Host ""

# Run quick deployment script
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "cd ${APP_DIR} && bash quick-deploy.sh $DOMAIN"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your application should be available at:" -ForegroundColor Yellow
Write-Host "  http://$DOMAIN" -ForegroundColor White
Write-Host "  https://$DOMAIN (after SSL setup)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update .env file: ssh ${VPS_USER}@${VPS_HOST} 'nano ${APP_DIR}/backend/.env'" -ForegroundColor White
Write-Host "   - Add your MongoDB URI (or use MongoDB Atlas)" -ForegroundColor Gray
Write-Host "   - Add your Stripe API keys" -ForegroundColor Gray
Write-Host "2. Set up SSL certificate:" -ForegroundColor White
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} 'certbot --nginx -d $DOMAIN -d www.$DOMAIN'" -ForegroundColor Gray
Write-Host "3. After SSL, update frontend:" -ForegroundColor White
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} 'cd ${APP_DIR} && echo \"VITE_BACKEND_URL=https://$DOMAIN\" > .env.production && npm run build && pm2 restart crm-backend'" -ForegroundColor Gray
Write-Host "4. Check backend logs: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs crm-backend'" -ForegroundColor White
Write-Host ""
# Show OK button to exit
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("Deployment complete! Click OK to exit.", "Deployment Complete", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null

