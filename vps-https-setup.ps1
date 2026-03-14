# VPS HTTPS Setup Script for cmtaudit.tn
# Run this on the VPS via SSH: ssh root@31.97.38.243
# Then execute: pwsh vps-https-setup.ps1

param(
    [string]$Domain = "cmtaudit.tn",
    [string]$Email = "admin@cmtaudit.tn",
    [string]$AppPath = "/var/www/crm"
)

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        CRM System HTTPS Auto Setup for $Domain            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Color functions
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Error-Custom { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Blue }
function Write-Step { Write-Host "`n► $args" -ForegroundColor Yellow }

# Step 1: Update system packages
Write-Step "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
Write-Success "System packages updated"

# Step 2: Install required packages
Write-Step "Installing required packages..."
apt-get install -y -qq \
    curl wget git nodejs npm nginx certbot python3-certbot-nginx \
    build-essential openssl libssl-dev pkg-config \
    supervisor

Write-Success "Required packages installed"

# Step 3: Stop nginx temporarily
Write-Step "Stopping nginx temporarily for SSL setup..."
systemctl stop nginx
Write-Success "Nginx stopped"

# Step 4: Install SSL Certificate with Let's Encrypt
Write-Step "Setting up Let's Encrypt SSL certificate for $Domain..."
certbot certonly --standalone \
    -d $Domain \
    -d "www.$Domain" \
    --non-interactive \
    --agree-tos \
    --email $Email \
    --no-redirect

if ($LASTEXITCODE -eq 0) {
    Write-Success "SSL certificate installed successfully"
} else {
    Write-Error-Custom "Failed to install SSL certificate"
    exit 1
}

# Step 5: Create nginx configuration with SSL
Write-Step "Configuring Nginx with SSL..."

$NginxConfig = @"
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $Domain www.$Domain;
    
    location /.well-known/acme-challenge/ {
        allow all;
    }
    
    location / {
        return 301 https://`$server_name`$request_uri;
    }
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $Domain www.$Domain;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$Domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$Domain/privkey.pem;
    
    # SSL Protocols and Ciphers (High Security)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Root directory
    root $AppPath/public;
    index index.html;

    # Frontend Routes
    location / {
        try_files `$uri `$uri/ /index.html;
    }

    # API Routes - Proxy to Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket for Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Logging
    access_log /var/log/nginx/cmtaudit-access.log combined;
    error_log /var/log/nginx/cmtaudit-error.log;
}
"@

$NginxConfig | Out-File -FilePath "/etc/nginx/sites-available/cmtaudit.tn" -Encoding ASCII
Write-Success "Nginx configuration created"

# Step 6: Enable the site
Write-Step "Enabling Nginx site configuration..."
Remove-Item -Path "/etc/nginx/sites-enabled/cmtaudit.tn" -Force -ErrorAction SilentlyContinue
New-Item -ItemType SymbolicLink `
    -Path "/etc/nginx/sites-enabled/cmtaudit.tn" `
    -Target "/etc/nginx/sites-available/cmtaudit.tn"
Write-Success "Site enabled"

# Step 7: Test nginx configuration
Write-Step "Testing Nginx configuration..."
nginx -t
if ($LASTEXITCODE -eq 0) {
    Write-Success "Nginx configuration is valid"
} else {
    Write-Error-Custom "Nginx configuration test failed"
    exit 1
}

# Step 8: Start nginx
Write-Step "Starting Nginx..."
systemctl start nginx
systemctl enable nginx
Write-Success "Nginx started and enabled"

# Step 9: Setup automatic SSL renewal
Write-Step "Setting up automatic SSL certificate renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer
Write-Success "Certbot renewal scheduled"

# Step 10: Verify the setup
Write-Step "Verifying HTTPS setup..."
Write-Info "Testing HTTPS connectivity..."
$Response = Invoke-WebRequest -Uri "https://$Domain" -SkipCertificateCheck -MaximumRetryCount 2 -ErrorAction SilentlyContinue
if ($Response.StatusCode -eq 200) {
    Write-Success "HTTPS is working correctly!"
} else {
    Write-Info "HTTPS response code: $($Response.StatusCode)"
}

# Step 11: Display summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                  HTTPS SETUP COMPLETED                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  Domain: $Domain" -ForegroundColor Gray
Write-Host "  Certificate: /etc/letsencrypt/live/$Domain/" -ForegroundColor Gray
Write-Host "  Nginx Config: /etc/nginx/sites-available/cmtaudit.tn" -ForegroundColor Gray
Write-Host "  App Path: $AppPath" -ForegroundColor Gray
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Pull latest code: cd $AppPath && git pull origin main" -ForegroundColor Gray
Write-Host "  2. Install backend deps: cd backend && npm install" -ForegroundColor Gray
Write-Host "  3. Build backend: npm run build" -ForegroundColor Gray
Write-Host "  4. Install frontend deps: cd .. && npm install" -ForegroundColor Gray
Write-Host "  5. Build frontend: npm run build" -ForegroundColor Gray
Write-Host "  6. Start with PM2: pm2 start backend/dist/server.js --name crm-backend" -ForegroundColor Gray
Write-Host ""

Write-Host "Verify HTTPS:" -ForegroundColor Yellow
Write-Host "  https://$Domain" -ForegroundColor Cyan
Write-Host "  https://www.$Domain" -ForegroundColor Cyan
Write-Host ""

Write-Host "SSL Certificate Renewal (automatic):" -ForegroundColor Yellow
Write-Host "  Check status: systemctl status certbot.timer" -ForegroundColor Gray
Write-Host "  Manual renewal: certbot renew" -ForegroundColor Gray
Write-Host ""
