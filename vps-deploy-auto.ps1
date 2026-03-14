#!/usr/bin/env pwsh
# CRM System Auto-Deploy to VPS with HTTPS
# Usage: .\vps-deploy-auto.ps1
# This script automates the entire deployment process on the VPS

param(
    [string]$VpsHost = "31.97.38.243",
    [string]$VpsUser = "root",
    [string]$Domain = "cmtaudit.tn",
    [string]$AppPath = "/var/www/crm",
    [string]$Email = "admin@cmtaudit.tn"
)

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          CRM System Auto-Deploy to VPS with HTTPS             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Error-Custom { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Blue }
function Write-Step { Write-Host "`n► $args" -ForegroundColor Yellow }

# Step 1: Verify SSH connection
Write-Step "Verifying SSH connection to $VpsHost..."
try {
    $TestConnection = ssh -o ConnectTimeout=5 "$VpsUser@$VpsHost" "echo 'SSH connection successful'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "SSH connection established"
    } else {
        throw "SSH connection failed"
    }
} catch {
    Write-Error-Custom "Cannot connect to VPS at $VpsHost"
    Write-Host "Make sure you have SSH access configured" -ForegroundColor Yellow
    exit 1
}

# Step 2: Git push latest changes
Write-Step "Pushing latest changes to GitHub..."
try {
    $Status = git status --porcelain
    if ($Status) {
        Write-Info "Found uncommitted changes, committing..."
        git add -A
        git commit -m "Auto-deploy: Update configuration for $Domain"
        Write-Success "Changes committed"
    }
    git push origin main
    Write-Success "Changes pushed to GitHub"
} catch {
    Write-Error-Custom "Git push failed"
    exit 1
}

# Step 3: Create deployment script on VPS
Write-Step "Creating deployment script on VPS..."

$DeployScript = @'
#!/bin/bash
set -e

APP_PATH="/var/www/crm"
DOMAIN="cmtaudit.tn"
EMAIL="admin@cmtaudit.tn"
LOG_FILE="/var/log/crm-deploy.log"

echo "[$(date)] Starting deployment..." >> $LOG_FILE

# Function to log
log() {
    echo "[$(date)] $1" >> $LOG_FILE
}

# Create app directory if it doesn't exist
mkdir -p $APP_PATH
cd $APP_PATH

# Clone or pull repository
log "Pulling latest code from GitHub..."
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/achekz/crm.git .
fi

# Verify git pull
if [ $? -ne 0 ]; then
    log "ERROR: Git pull failed"
    exit 1
fi

log "Code pulled successfully"

# Install/update backend dependencies
log "Installing backend dependencies..."
cd backend
npm install --production
npm run build
log "Backend built successfully"

# Install/update frontend dependencies
log "Installing frontend dependencies..."
cd ..
npm install --production
npm run build
log "Frontend built successfully"

# Setup .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    log "Creating .env file..."
    cat > "backend/.env" << EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017/crm}
JWT_SECRET=${JWT_SECRET:-change-this-secret-in-production}
FRONTEND_URL=https://${DOMAIN}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
GOOGLE_REDIRECT_URI=https://${DOMAIN}/auth/google/callback
EOF
    log "Environment file created"
fi

# Setup/restart PM2
log "Setting up PM2..."
npm install -g pm2 --quiet

# Delete old processes
pm2 delete "crm-backend" 2>/dev/null || true
pm2 delete "crm-frontend" 2>/dev/null || true

# Start backend
log "Starting backend application..."
pm2 start "node dist/server.js" --name "crm-backend" --instances max --exec-mode cluster

# Start frontend preview (or use with nginx proxy)
log "Starting frontend..."
pm2 start "npm run preview" --name "crm-frontend" --watch false

# Save PM2 config
pm2 save
pm2 startup -u root --hp /root > /dev/null 2>&1 || true

log "PM2 processes started"

log "Deployment completed successfully"
echo "✓ Deployment completed at $(date)"
'@

# Upload deployment script
ssh "$VpsUser@$VpsHost" "cat > /tmp/deploy.sh" << $DeployScript
Write-Success "Deployment script created"

# Step 4: Make script executable and run deployment
Write-Step "Running deployment on VPS..."
ssh "$VpsUser@$VpsHost" "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Deployment script executed successfully"
} else {
    Write-Error-Custom "Deployment script failed"
    exit 1
}

# Step 5: Run HTTPS setup
Write-Step "Setting up HTTPS and Nginx..."

$HttpsScript = @'
#!/bin/bash
set -e

DOMAIN="cmtaudit.tn"
EMAIL="admin@cmtaudit.tn"
APP_PATH="/var/www/crm"

echo "Setting up HTTPS for $DOMAIN..."

# Update packages
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

# Stop nginx
systemctl stop nginx || true

# Get Let's Encrypt certificate
echo "Getting SSL certificate..."
certbot certonly --standalone \
    -d $DOMAIN \
    -d "www.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --no-redirect

# Create nginx config
cat > /etc/nginx/sites-available/cmtaudit.tn << 'NGINX_CONF'
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name cmtaudit.tn www.cmtaudit.tn;
    
    location /.well-known/acme-challenge/ {
        allow all;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cmtaudit.tn www.cmtaudit.tn;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/cmtaudit.tn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cmtaudit.tn/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    root /var/www/crm/public;
    index index.html;

    # Frontend Routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Routes
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    access_log /var/log/nginx/cmtaudit-access.log;
    error_log /var/log/nginx/cmtaudit-error.log;
}
NGINX_CONF

# Enable site
rm -f /etc/nginx/sites-enabled/cmtaudit.tn
ln -s /etc/nginx/sites-available/cmtaudit.tn /etc/nginx/sites-enabled/cmtaudit.tn

# Test and start nginx
nginx -t
systemctl start nginx
systemctl enable nginx

# Setup automatic renewal
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✓ HTTPS setup completed for $DOMAIN"
'@

# Upload HTTPS script
ssh "$VpsUser@$VpsHost" "cat > /tmp/setup-https.sh" << $HttpsScript
ssh "$VpsUser@$VpsHost" "chmod +x /tmp/setup-https.sh && /tmp/setup-https.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Success "HTTPS setup completed"
} else {
    Write-Error-Custom "HTTPS setup failed"
    exit 1
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                DEPLOYMENT COMPLETED SUCCESSFULLY               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Your CRM application is now live!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application at:" -ForegroundColor Cyan
Write-Host "  🌐 https://$Domain" -ForegroundColor Green
Write-Host "  🌐 https://www.$Domain" -ForegroundColor Green
Write-Host ""

Write-Host "Admin Information:" -ForegroundColor Cyan
Write-Host "  API Docs: https://$Domain/api-docs" -ForegroundColor Gray
Write-Host "  Backend: https://api.$Domain" -ForegroundColor Gray
Write-Host ""

Write-Host "VPS Access:" -ForegroundColor Cyan
Write-Host "  SSH: ssh root@$VpsHost" -ForegroundColor Gray
Write-Host "  App Path: $AppPath" -ForegroundColor Gray
Write-Host ""

Write-Host "SSL Certificate:" -ForegroundColor Cyan
Write-Host "  Issuer: Let's Encrypt" -ForegroundColor Gray
Write-Host "  Auto-renewal: Enabled" -ForegroundColor Gray
Write-Host "  Check renewal: systemctl status certbot.timer" -ForegroundColor Gray
Write-Host ""

Write-Host "Application Management:" -ForegroundColor Cyan
Write-Host "  View logs: ssh root@$VpsHost 'pm2 logs'" -ForegroundColor Gray
Write-Host "  Restart app: ssh root@$VpsHost 'pm2 restart all'" -ForegroundColor Gray
Write-Host "  Stop app: ssh root@$VpsHost 'pm2 stop all'" -ForegroundColor Gray
Write-Host ""
