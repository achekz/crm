#!/bin/bash

# Application Deployment Script
# Run this after uploading files to /var/www/crm

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/var/www/crm"
DOMAIN="cmtaudit.cloud"
BACKEND_PORT=5000

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${YELLOW}→${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "=========================================="
echo "Deploying CRM Application"
echo "=========================================="

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "Application directory not found: $APP_DIR"
    exit 1
fi

cd $APP_DIR

# 1. Backend Setup
print_info "Setting up backend..."
cd backend

# Install backend dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    npm install --production
    print_success "Backend dependencies installed"
else
    print_info "Backend dependencies already installed"
fi

# Build backend
print_info "Building backend..."
npm run build
print_success "Backend built"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cat > .env << EOF
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/crm

# JWT Configuration
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://$DOMAIN
CORS_ORIGIN=https://$DOMAIN

# Stripe Configuration (UPDATE THESE)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
STRIPE_CURRENCY=usd

# Google Calendar Configuration (OPTIONAL)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://$DOMAIN/api/calendar/callback
EOF
    print_success ".env file created"
    print_info "Please update .env file with your actual configuration"
else
    print_info ".env file already exists"
fi

# Start backend with PM2
print_info "Starting backend with PM2..."
pm2 delete crm-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
print_success "Backend started with PM2"

cd ..

# 2. Frontend Setup
print_info "Setting up frontend..."

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"
else
    print_info "Frontend dependencies already installed"
fi

# Create .env.production if it doesn't exist
if [ ! -f ".env.production" ]; then
    print_info "Creating .env.production file..."
    echo "VITE_BACKEND_URL=https://$DOMAIN" > .env.production
    print_success ".env.production created"
fi

# Build frontend
print_info "Building frontend..."
npm run build
print_success "Frontend built"

# 3. Configure Nginx
print_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/crm << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    # Frontend Static Files
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Socket.IO Proxy
    location /socket.io/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl reload nginx
print_success "Nginx configured and reloaded"

# 4. Setup SSL (optional - uncomment if you have a domain)
# print_info "Setting up SSL certificate..."
# certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email your-email@example.com
# print_success "SSL certificate installed"

echo ""
echo "=========================================="
print_success "Deployment completed!"
echo "=========================================="
echo ""
echo "Application is running at: http://$DOMAIN"
echo ""
echo "To set up SSL, run:"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "Backend logs: pm2 logs crm-backend"
echo "Restart backend: pm2 restart crm-backend"
echo ""

