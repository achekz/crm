#!/usr/bin/env pwsh

# ============================================================================
# 🚀 VPS AUTO-DEPLOY POWERSHELL WRAPPER
# Automated deployment with SSL, Nginx, and PM2
# ============================================================================

param(
    [string]$Domain = "yourdomain.com",
    [string]$VpsIP = "31.97.38.243",
    [string]$VpsUser = "root",
    [string]$MongoURI = "mongodb+srv://user:pass@cluster.mongodb.net/crm",
    [string]$JwtSecret = "your-secret-key-change-this"
)

# Colors
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Info { Write-Host "$Blue[INFO]$Reset $args" }
function Write-Success { Write-Host "$Green[✓]$Reset $args" }
function Write-Error { Write-Host "$Red[✗]$Reset $args" }
function Write-Warning { Write-Host "$Yellow[!]$Reset $args" }

# Header
Write-Host "$Blue╔════════════════════════════════════════════════════════════════╗$Reset"
Write-Host "$Blue║        🚀 CRM AUTO DEPLOYMENT - VPS SETUP 🚀                 ║$Reset"
Write-Host "$Blue╚════════════════════════════════════════════════════════════════╝$Reset"
Write-Host ""

Write-Info "Starting VPS deployment..."
Write-Info "Target: $VpsIP"
Write-Info "Domain: $Domain"
Write-Info "VPS User: $VpsUser"
Write-Host ""

# ============================================================================
# STEP 1: VERIFY SSH CONNECTION
# ============================================================================

Write-Info "Step 1/8: Verifying SSH connection to VPS..."

try {
    $result = ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$VpsUser@$VpsIP" "echo 'SSH connection successful'"
    Write-Success "SSH connection verified"
} catch {
    Write-Error "Cannot connect to VPS via SSH"
    Write-Error "Make sure you can SSH with: ssh root@$VpsIP"
    exit 1
}
Write-Host ""

# ============================================================================
# STEP 2: INITIALIZE VPS
# ============================================================================

Write-Info "Step 2/8: Initializing VPS and updating system..."

$initScript = @'
set -e
echo "Updating system..."
apt-get update -qq
apt-get upgrade -y -qq

echo "Installing required tools..."
apt-get install -y -qq curl wget git build-essential python3 certbot python3-certbot-nginx

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    apt-get install -y -qq nodejs
fi

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
    pm2 startup
    pm2 save
fi

# Install Nginx if needed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get install -y -qq nginx
    systemctl enable nginx
    systemctl start nginx
fi

# Create directories
mkdir -p /var/www/crm/backend/uploads
mkdir -p /var/www/crm/backend/logs

echo "✓ VPS initialization complete"
'@

ssh "$VpsUser@$VpsIP" $initScript
Write-Success "VPS initialized"
Write-Host ""

# ============================================================================
# STEP 3: CLONE/UPDATE REPOSITORY
# ============================================================================

Write-Info "Step 3/8: Cloning/updating Git repository..."

$gitScript = @'
set -e
cd /var/www/crm

if [ -d .git ]; then
    echo "Updating repository..."
    git fetch origin main
    git reset --hard origin/main
    git clean -fd
else
    echo "Cloning repository..."
    git clone https://github.com/achekz/crm.git .
fi

echo "✓ Repository ready"
'@

ssh "$VpsUser@$VpsIP" $gitScript
Write-Success "Repository ready"
Write-Host ""

# ============================================================================
# STEP 4: INSTALL BACKEND DEPENDENCIES
# ============================================================================

Write-Info "Step 4/8: Installing backend dependencies..."

$backendScript = @'
set -e
cd /var/www/crm/backend

echo "Creating .env file..."
cat > .env << 'EOFENV'
MONGODB_URI={MONGO_URI}
JWT_SECRET={JWT_SECRET}
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://{DOMAIN}
CORS_ORIGIN=https://{DOMAIN}
LOG_DIR=/var/www/crm/backend/logs
UPLOAD_DIR=/var/www/crm/backend/uploads
EOFENV

echo "Installing dependencies..."
npm install --production

echo "✓ Backend dependencies installed"
'@

$backendScript = $backendScript -replace '{MONGO_URI}', $MongoURI
$backendScript = $backendScript -replace '{JWT_SECRET}', $JwtSecret
$backendScript = $backendScript -replace '{DOMAIN}', $Domain

ssh "$VpsUser@$VpsIP" $backendScript
Write-Success "Backend dependencies installed"
Write-Host ""

# ============================================================================
# STEP 5: BUILD FRONTEND
# ============================================================================

Write-Info "Step 5/8: Building frontend..."

$frontendScript = @'
set -e
cd /var/www/crm

echo "Creating frontend .env..."
cat > .env << 'EOFENV'
VITE_BACKEND_URL=https://{DOMAIN}/api
VITE_SOCKET_URL=https://{DOMAIN}
EOFENV

echo "Installing dependencies..."
npm install --production

echo "Building..."
npm run build

echo "✓ Frontend built successfully"
'@

$frontendScript = $frontendScript -replace '{DOMAIN}', $Domain

ssh "$VpsUser@$VpsIP" $frontendScript
Write-Success "Frontend built"
Write-Host ""

# ============================================================================
# STEP 6: START WITH PM2
# ============================================================================

Write-Info "Step 6/8: Starting application with PM2..."

$pm2Script = @'
set -e
cd /var/www/crm/backend

echo "Stopping existing PM2 process..."
pm2 stop crm-backend 2>/dev/null || true
pm2 delete crm-backend 2>/dev/null || true

echo "Starting new PM2 process..."
if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js
else
    pm2 start server.ts --name crm-backend --interpreter ts-node
fi

pm2 save
pm2 startup

echo "✓ PM2 configured"
'@

ssh "$VpsUser@$VpsIP" $pm2Script
Write-Success "PM2 started"
Write-Host ""

# ============================================================================
# STEP 7: CONFIGURE NGINX
# ============================================================================

Write-Info "Step 7/8: Configuring Nginx..."

$nginxScript = @'
set -e

cat > /etc/nginx/sites-available/crm << 'EOFNGINXCONF'
upstream backend {
    server localhost:5000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name {DOMAIN} www.{DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name {DOMAIN} www.{DOMAIN};
    
    ssl_certificate /etc/letsencrypt/live/{DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{DOMAIN}/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    root /var/www/crm/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;
    }
    
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
    
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location ~ /\. {
        deny all;
    }
}
EOFNGINXCONF

ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "✓ Nginx configured"
'@

$nginxScript = $nginxScript -replace '{DOMAIN}', $Domain

ssh "$VpsUser@$VpsIP" $nginxScript
Write-Success "Nginx configured"
Write-Host ""

# ============================================================================
# STEP 8: REQUEST SSL CERTIFICATE
# ============================================================================

Write-Info "Step 8/8: Requesting SSL certificate from Let's Encrypt..."

$sslScript = @'
set -e

mkdir -p /var/www/certbot

echo "Requesting SSL certificate..."
certbot certonly --non-interactive --agree-tos \
    --email admin@{DOMAIN} \
    --webroot --webroot-path /var/www/certbot \
    -d {DOMAIN} -d www.{DOMAIN} 2>&1 || true

if [ ! -f /etc/letsencrypt/live/{DOMAIN}/fullchain.pem ]; then
    certbot certonly --non-interactive --agree-tos \
        --email admin@{DOMAIN} \
        --standalone \
        -d {DOMAIN} -d www.{DOMAIN}
fi

systemctl reload nginx

systemctl enable certbot.timer
systemctl start certbot.timer

echo "✓ SSL certificate installed"
'@

$sslScript = $sslScript -replace '{DOMAIN}', $Domain

ssh "$VpsUser@$VpsIP" $sslScript
Write-Success "SSL certificate installed"
Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================

Write-Host "$Green╔════════════════════════════════════════════════════════════════╗$Reset"
Write-Host "$Green║           ✅ DEPLOYMENT COMPLETED SUCCESSFULLY! ✅            ║$Reset"
Write-Host "$Green╚════════════════════════════════════════════════════════════════╝$Reset"
Write-Host ""

Write-Success "All 8 steps completed!"
Write-Host ""

Write-Host "📋 DEPLOYMENT SUMMARY:"
Write-Host "  • VPS IP: $VpsIP"
Write-Host "  • Domain: $Domain"
Write-Host "  • Frontend: https://$Domain"
Write-Host "  • Backend API: https://$Domain/api"
Write-Host "  • WebSocket: wss://$Domain/socket.io"
Write-Host ""

Write-Host "📝 NEXT STEPS:"
Write-Host "  1. Update your domain DNS to point to $VpsIP"
Write-Host "  2. Wait for DNS propagation (5-10 minutes)"
Write-Host "  3. Visit https://$Domain in your browser"
Write-Host "  4. Check logs: ssh root@$VpsIP 'pm2 logs crm-backend'"
Write-Host ""

Write-Host "🔧 USEFUL COMMANDS:"
Write-Host "  • Check status:     ssh root@$VpsIP 'pm2 status'"
Write-Host "  • View logs:        ssh root@$VpsIP 'pm2 logs crm-backend'"
Write-Host "  • Restart app:      ssh root@$VpsIP 'pm2 restart crm-backend'"
Write-Host "  • Check Nginx:      ssh root@$VpsIP 'systemctl status nginx'"
Write-Host "  • Check SSL:        ssh root@$VpsIP 'certbot certificates'"
Write-Host ""

Write-Success "Happy coding! 🎉"
