# Script to fix and complete deployment

$VPS_HOST = "31.97.38.243"
$VPS_USER = "root"
$APP_DIR = "/var/www/crm"
$DOMAIN = "cmtaudit.cloud"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fixing Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$sshTarget = $VPS_USER + '@' + $VPS_HOST

# Step 1: Check if files are deployed
Write-Host "Step 1: Checking application files..." -ForegroundColor Yellow
$filesCheck = ssh -o StrictHostKeyChecking=no $sshTarget "cd $APP_DIR && ls -la package.json backend/package.json 2>/dev/null | wc -l" 2>&1
if ($filesCheck -match "2") {
    Write-Host "[OK] Application files found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Application files not found. Please deploy first." -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("Application files not found. Please run auto-deploy.ps1 first.", "Deployment Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
    exit 1
}
Write-Host ""

# Step 2: Setup backend
Write-Host "Step 2: Setting up backend..." -ForegroundColor Yellow
Write-Host "  Installing dependencies..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no $sshTarget "cd $APP_DIR/backend && npm install --production" 2>&1 | Out-Null

Write-Host "  Building backend..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no $sshTarget "cd $APP_DIR/backend && npm run build" 2>&1 | Out-Null

# Check if .env exists
Write-Host "  Checking .env file..." -ForegroundColor Gray
$envExists = ssh -o StrictHostKeyChecking=no $sshTarget "test -f $APP_DIR/backend/.env && echo 'exists' || echo 'missing'" 2>&1
if ($envExists -match "missing") {
    Write-Host "  Creating .env file..." -ForegroundColor Gray
    $jwtSecret = ssh -o StrictHostKeyChecking=no $sshTarget "openssl rand -hex 32" 2>&1
    $envContent = @"
MONGODB_URI=mongodb://localhost:27017/crm
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
STRIPE_CURRENCY=usd
"@
    $envFile = [System.IO.Path]::GetTempFileName()
    $envContent | Out-File -FilePath $envFile -Encoding ASCII
    scp -o StrictHostKeyChecking=no $envFile "${sshTarget}:${APP_DIR}/backend/.env" 2>&1 | Out-Null
    Remove-Item $envFile -Force
    Write-Host "  [WARNING] .env file created with default values. Please update with your actual configuration." -ForegroundColor Yellow
}

Write-Host "[OK] Backend setup complete" -ForegroundColor Green
Write-Host ""

# Step 3: Start backend with PM2
Write-Host "Step 3: Starting backend..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $sshTarget "cd $APP_DIR/backend && pm2 delete crm-backend 2>/dev/null; true" 2>&1 | Out-Null
ssh -o StrictHostKeyChecking=no $sshTarget "cd $APP_DIR/backend && pm2 start ecosystem.config.js" 2>&1 | Out-Null
ssh -o StrictHostKeyChecking=no $sshTarget "pm2 save" 2>&1 | Out-Null

# Check if started
Start-Sleep -Seconds 2
$pm2Status = ssh -o StrictHostKeyChecking=no $sshTarget "pm2 status" 2>&1
if ($pm2Status -match "crm-backend") {
    Write-Host "[OK] Backend started successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend failed to start. Checking logs..." -ForegroundColor Red
    ssh -o StrictHostKeyChecking=no $sshTarget "pm2 logs crm-backend --lines 20 --nostream" 2>&1
}
Write-Host ""

# Step 4: Setup frontend
Write-Host "Step 4: Setting up frontend..." -ForegroundColor Yellow
Write-Host "  Installing dependencies..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no $sshTarget "cd $APP_DIR && npm install" 2>&1 | Out-Null

Write-Host "  Creating .env.production..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no $sshTarget "echo 'VITE_BACKEND_URL=http://$DOMAIN' > $APP_DIR/.env.production" 2>&1 | Out-Null

Write-Host "  Building frontend..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no $sshTarget "cd $APP_DIR && npm run build" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Frontend built successfully" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Frontend build may have issues" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Verify Nginx configuration
Write-Host "Step 5: Verifying Nginx configuration..." -ForegroundColor Yellow
$nginxConfig = ssh -o StrictHostKeyChecking=no $sshTarget "test -f /etc/nginx/sites-available/crm && echo 'exists' || echo 'missing'" 2>&1
if ($nginxConfig -match "missing") {
    Write-Host "  Creating Nginx configuration..." -ForegroundColor Gray
    $nginxConf = @"
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    location / {
        try_files `$uri `$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}
"@
    $nginxFile = [System.IO.Path]::GetTempFileName()
    $nginxConf | Out-File -FilePath $nginxFile -Encoding ASCII
    scp -o StrictHostKeyChecking=no $nginxFile "${sshTarget}:/etc/nginx/sites-available/crm" 2>&1 | Out-Null
    Remove-Item $nginxFile -Force
    ssh -o StrictHostKeyChecking=no $sshTarget "ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx" 2>&1 | Out-Null
    Write-Host "[OK] Nginx configured" -ForegroundColor Green
} else {
    Write-Host "[OK] Nginx configuration exists" -ForegroundColor Green
    ssh -o StrictHostKeyChecking=no $sshTarget "nginx -t && systemctl reload nginx" 2>&1 | Out-Null
}
Write-Host ""

# Step 6: Final status check
Write-Host "Step 6: Final status check..." -ForegroundColor Yellow
$pm2Final = ssh -o StrictHostKeyChecking=no $sshTarget "pm2 status | grep crm-backend" 2>&1
$nginxFinal = ssh -o StrictHostKeyChecking=no $sshTarget "systemctl is-active nginx" 2>&1

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Fix Complete" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend Status:" -ForegroundColor Yellow
Write-Host $pm2Final -ForegroundColor White
Write-Host ""
Write-Host "Nginx Status: $nginxFinal" -ForegroundColor Yellow
Write-Host ""
Write-Host "Website should be accessible at:" -ForegroundColor Yellow
Write-Host "  http://$DOMAIN" -ForegroundColor Green
Write-Host "  http://$VPS_HOST" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update backend/.env with your MongoDB URI and Stripe keys" -ForegroundColor White
Write-Host "2. Set up SSL: certbot --nginx -d $DOMAIN -d www.$DOMAIN" -ForegroundColor White
Write-Host "3. Check logs: pm2 logs crm-backend" -ForegroundColor White
Write-Host ""

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("Deployment fix complete!`n`nBackend should now be running.`n`nCheck the website at http://$DOMAIN", "Deployment Fixed", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null

