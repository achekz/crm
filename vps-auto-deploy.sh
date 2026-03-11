#!/bin/bash

# ============================================================================
# 🚀 VPS AUTO-DEPLOY SCRIPT
# Complete automated deployment with SSL, Nginx, and PM2
# ============================================================================

set -e  # Exit on any error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION
# ============================================================================

VPS_IP="31.97.38.243"
VPS_USER="root"
PROJECT_DIR="/var/www/crm"
DOMAIN="${1:-yourdomain.com}"  # Pass domain as argument
REPO_URL="https://github.com/achekz/crm.git"
BACKEND_PORT="5000"
MONGO_URI="${MONGO_URI:-mongodb+srv://user:pass@cluster.mongodb.net/crm}"
JWT_SECRET="${JWT_SECRET:-your-secret-key-change-this}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        🚀 CRM AUTO DEPLOYMENT SCRIPT - VPS SETUP 🚀           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Starting VPS deployment..."
log_info "Target: $VPS_IP"
log_info "Domain: $DOMAIN"
log_info "Project: $REPO_URL"
echo ""

# Check if domain provided
if [ "$DOMAIN" = "yourdomain.com" ]; then
    log_warning "⚠️  Using default domain 'yourdomain.com'"
    log_warning "To use custom domain, run: bash vps-auto-deploy.sh yourdomain.com"
    echo ""
fi

# ============================================================================
# STEP 1: INITIALIZE VPS
# ============================================================================

log_info "Step 1/8: Initializing VPS and updating system..."

ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" bash << 'EOFVPS'
    set -e
    
    # Update system
    apt-get update -qq
    apt-get upgrade -y -qq
    
    # Install required tools
    apt-get install -y -qq curl wget git build-essential python3 certbot python3-certbot-nginx
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        apt-get install -y -qq nodejs
    fi
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
        pm2 startup
        pm2 save
    fi
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        apt-get install -y -qq nginx
        systemctl enable nginx
        systemctl start nginx
    fi
    
    # Create project directory
    mkdir -p /var/www/crm
    mkdir -p /var/www/crm/backend/uploads
    mkdir -p /var/www/crm/backend/logs
    
    echo "VPS initialized successfully"
EOFVPS

log_success "VPS initialized"
echo ""

# ============================================================================
# STEP 2: CLONE/UPDATE GIT REPOSITORY
# ============================================================================

log_info "Step 2/8: Cloning/updating Git repository..."

ssh "$VPS_USER@$VPS_IP" bash << EOFGIT
    set -e
    cd /var/www/crm
    
    # Check if repo already exists
    if [ -d .git ]; then
        git fetch origin main
        git reset --hard origin/main
        git clean -fd
        echo "Repository updated"
    else
        git clone $REPO_URL .
        echo "Repository cloned"
    fi
EOFGIT

log_success "Repository ready"
echo ""

# ============================================================================
# STEP 3: INSTALL BACKEND DEPENDENCIES
# ============================================================================

log_info "Step 3/8: Installing backend dependencies..."

ssh "$VPS_USER@$VPS_IP" bash << EOFBACKEND
    set -e
    cd /var/www/crm/backend
    
    # Create/update .env file
    cat > .env << 'EOFENV'
MONGODB_URI=$MONGO_URI
JWT_SECRET=$JWT_SECRET
PORT=$BACKEND_PORT
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN
CORS_ORIGIN=https://$DOMAIN
LOG_DIR=/var/www/crm/backend/logs
UPLOAD_DIR=/var/www/crm/backend/uploads
EOFENV
    
    npm install --production
    echo "Backend dependencies installed"
EOFBACKEND

log_success "Backend dependencies installed"
echo ""

# ============================================================================
# STEP 4: INSTALL FRONTEND DEPENDENCIES & BUILD
# ============================================================================

log_info "Step 4/8: Installing and building frontend..."

ssh "$VPS_USER@$VPS_IP" bash << EOFFRONTEND
    set -e
    cd /var/www/crm
    
    # Create .env for frontend
    cat > .env << EOFENV
VITE_BACKEND_URL=https://$DOMAIN/api
VITE_SOCKET_URL=https://$DOMAIN
EOFENV
    
    npm install --production
    npm run build
    echo "Frontend built successfully"
EOFFRONTEND

log_success "Frontend built"
echo ""

# ============================================================================
# STEP 5: SETUP PM2
# ============================================================================

log_info "Step 5/8: Starting application with PM2..."

ssh "$VPS_USER@$VPS_IP" bash << EOFPM2
    set -e
    cd /var/www/crm/backend
    
    # Stop existing PM2 process
    pm2 stop crm-backend 2>/dev/null || true
    pm2 delete crm-backend 2>/dev/null || true
    
    # Start with ecosystem config
    if [ -f ecosystem.config.js ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start server.ts --name crm-backend --interpreter ts-node
    fi
    
    pm2 save
    pm2 startup
    echo "PM2 configured"
EOFPM2

log_success "PM2 started"
echo ""

# ============================================================================
# STEP 6: CONFIGURE NGINX
# ============================================================================

log_info "Step 6/8: Configuring Nginx..."

ssh "$VPS_USER@$VPS_IP" bash << EOFNGINX
    set -e
    
    cat > /etc/nginx/sites-available/crm << 'EOFNGINXCONF'
upstream backend {
    server localhost:5000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL certificates (will be replaced by Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Static files
    root /var/www/crm/dist;
    index index.html;
    
    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;
    }
    
    # API requests
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
    }
    
    # WebSocket for Socket.IO
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    
    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
}
EOFNGINXCONF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx config
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    echo "Nginx configured"
EOFNGINX

log_success "Nginx configured"
echo ""

# ============================================================================
# STEP 7: REQUEST SSL CERTIFICATE
# ============================================================================

log_info "Step 7/8: Requesting SSL certificate from Let's Encrypt..."

ssh "$VPS_USER@$VPS_IP" bash << EOFSSL
    set -e
    
    # Create certbot directory
    mkdir -p /var/www/certbot
    
    # Request certificate
    certbot certonly --non-interactive --agree-tos \
        --email admin@$DOMAIN \
        --webroot --webroot-path /var/www/certbot \
        -d $DOMAIN -d www.$DOMAIN 2>&1 || true
    
    # If certbot fails, try standalone
    if [ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
        certbot certonly --non-interactive --agree-tos \
            --email admin@$DOMAIN \
            --standalone \
            -d $DOMAIN -d www.$DOMAIN
    fi
    
    # Reload Nginx with SSL
    systemctl reload nginx
    
    # Setup auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    echo "SSL certificate installed"
EOFSSL

log_success "SSL certificate installed"
echo ""

# ============================================================================
# STEP 8: VERIFY DEPLOYMENT
# ============================================================================

log_info "Step 8/8: Verifying deployment..."

ssh "$VPS_USER@$VPS_IP" bash << EOFVERIFY
    set -e
    
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "📊 DEPLOYMENT STATUS"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    echo "▶ PM2 Status:"
    pm2 status
    echo ""
    
    echo "▶ Nginx Status:"
    systemctl status nginx | head -3
    echo ""
    
    echo "▶ SSL Certificate:"
    certbot certificates | grep -A 2 "$DOMAIN" || echo "No cert found yet"
    echo ""
    
    echo "▶ Port Listening:"
    ss -tlnp | grep -E ':(80|443|5000)'
    echo ""
    
    echo "═══════════════════════════════════════════════════════"
EOFVERIFY

echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ DEPLOYMENT COMPLETED SUCCESSFULLY! ✅            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "All 8 steps completed!"
echo ""

echo "📋 DEPLOYMENT SUMMARY:"
echo "  • VPS IP: $VPS_IP"
echo "  • Domain: $DOMAIN"
echo "  • Frontend: https://$DOMAIN"
echo "  • Backend API: https://$DOMAIN/api"
echo "  • WebSocket: wss://$DOMAIN/socket.io"
echo ""

echo "📝 NEXT STEPS:"
echo "  1. Update your domain DNS to point to $VPS_IP"
echo "  2. Visit https://$DOMAIN in your browser"
echo "  3. Check logs: ssh root@$VPS_IP 'pm2 logs crm-backend'"
echo "  4. Monitor app: ssh root@$VPS_IP 'pm2 monit'"
echo ""

echo "🔧 USEFUL COMMANDS:"
echo "  • Check status:     ssh root@$VPS_IP 'pm2 status'"
echo "  • View logs:        ssh root@$VPS_IP 'pm2 logs crm-backend'"
echo "  • Restart app:      ssh root@$VPS_IP 'pm2 restart crm-backend'"
echo "  • Check Nginx:      ssh root@$VPS_IP 'systemctl status nginx'"
echo "  • Check SSL:        ssh root@$VPS_IP 'certbot certificates'"
echo ""

log_success "Happy coding! 🎉"
