#!/bin/bash

# VPS HTTPS Setup Script for cmtaudit.tn
# Run this on the VPS: bash vps-https-setup.sh

DOMAIN="cmtaudit.tn"
EMAIL="admin@cmtaudit.tn"
APP_PATH="/var/www/crm"

echo "════════════════════════════════════════════════════════════════"
echo "         CRM System HTTPS Auto Setup for $DOMAIN"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Update system packages
echo "► Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
echo "✓ System packages updated"

# Step 2: Install required packages
echo ""
echo "► Installing required packages..."
apt-get install -y -qq \
    curl wget git nodejs npm nginx certbot python3-certbot-nginx \
    build-essential openssl libssl-dev pkg-config \
    supervisor

echo "✓ Required packages installed"

# Step 3: Stop nginx temporarily
echo ""
echo "► Stopping nginx temporarily for SSL setup..."
systemctl stop nginx 2>/dev/null || true
echo "✓ Nginx stopped"

# Step 4: Install SSL Certificate with Let's Encrypt
echo ""
echo "► Setting up Let's Encrypt SSL certificate for $DOMAIN..."
certbot certonly --standalone \
    -d $DOMAIN \
    -d "www.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --no-redirect 2>&1

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate installed successfully"
else
    echo "✗ Failed to install SSL certificate"
    exit 1
fi

# Step 5: Create nginx configuration with SSL
echo ""
echo "► Configuring Nginx with SSL..."

mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

cat > /etc/nginx/sites-available/cmtaudit.tn << 'NGINX_EOF'
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
    root /var/www/crm/dist;
    index index.html;

    # Frontend Routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Routes - Proxy to Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
NGINX_EOF

echo "✓ Nginx configuration created"

# Step 6: Enable the site
echo ""
echo "► Enabling Nginx site configuration..."
rm -f /etc/nginx/sites-enabled/cmtaudit.tn
ln -s /etc/nginx/sites-available/cmtaudit.tn /etc/nginx/sites-enabled/cmtaudit.tn
echo "✓ Site enabled"

# Step 7: Test nginx configuration
echo ""
echo "► Testing Nginx configuration..."
nginx -t 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ Nginx configuration test failed"
    exit 1
fi

# Step 8: Start nginx
echo ""
echo "► Starting Nginx..."
systemctl start nginx
systemctl enable nginx
echo "✓ Nginx started and enabled"

# Step 9: Setup automatic SSL renewal
echo ""
echo "► Setting up automatic SSL certificate renewal..."
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true
echo "✓ Certbot renewal scheduled"

# Step 10: Display summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                  HTTPS SETUP COMPLETED                         "
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "Configuration Summary:"
echo "  Domain: $DOMAIN"
echo "  Certificate: /etc/letsencrypt/live/$DOMAIN/"
echo "  Nginx Config: /etc/nginx/sites-available/cmtaudit.tn"
echo "  App Path: $APP_PATH"
echo ""

echo "Next Steps:"
echo "  1. Install backend dependencies: cd $APP_PATH/backend && npm install"
echo "  2. Build backend: npm run build"
echo "  3. Install frontend dependencies: cd $APP_PATH && npm install"
echo "  4. Build frontend: npm run build"
echo "  5. Start with PM2: pm2 start backend/dist/server.js --name crm-backend"
echo ""

echo "Verify HTTPS:"
echo "  https://$DOMAIN"
echo "  https://www.$DOMAIN"
echo ""

echo "SSL Certificate Renewal (automatic):"
echo "  Check status: systemctl status certbot.timer"
echo "  Manual renewal: certbot renew"
echo ""
