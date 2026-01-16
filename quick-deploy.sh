#!/bin/bash
# Complete deployment script - run this on the VPS after uploading files

set -e

APP_DIR="/var/www/crm"
DOMAIN="${1:-cmtaudit.cloud}"  # Default domain
BACKEND_PORT=5000

echo "=========================================="
echo "CRM Quick Deployment"
echo "=========================================="
echo "Domain/IP: $DOMAIN"
echo ""

cd $APP_DIR || { echo "Error: $APP_DIR not found. Please upload files first."; exit 1; }

# 1. Install dependencies
echo "→ Installing system dependencies..."
apt-get update -y > /dev/null 2>&1

# Node.js
if ! command -v node &> /dev/null; then
    echo "  Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
fi

# MongoDB
if ! command -v mongod &> /dev/null; then
    echo "  Installing MongoDB..."
    apt-get install -y gnupg curl > /dev/null 2>&1
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor > /dev/null 2>&1
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
    apt-get update > /dev/null 2>&1
    apt-get install -y mongodb-org > /dev/null 2>&1
    systemctl start mongod
    systemctl enable mongod > /dev/null 2>&1
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    echo "  Installing Nginx..."
    apt-get install -y nginx > /dev/null 2>&1
    systemctl start nginx
    systemctl enable nginx > /dev/null 2>&1
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    echo "  Installing PM2..."
    npm install -g pm2 > /dev/null 2>&1
fi

echo "✓ System dependencies installed"
echo ""

# 2. Backend setup
echo "→ Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "  Installing backend dependencies..."
    npm install --production > /dev/null 2>&1
fi

echo "  Building backend..."
npm run build > /dev/null 2>&1

# Create .env if doesn't exist
if [ ! -f ".env" ]; then
    echo "  Creating .env file..."
    JWT_SECRET=$(openssl rand -hex 32)
    cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/crm
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
PORT=$BACKEND_PORT
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN
CORS_ORIGIN=https://$DOMAIN
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
STRIPE_CURRENCY=usd
EOF
    echo "  ⚠️  Please update .env with your actual Stripe keys and MongoDB URI"
fi

# Start with PM2
pm2 delete crm-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save > /dev/null 2>&1
echo "✓ Backend running on PM2"
echo ""

# 3. Frontend setup
echo "→ Setting up frontend..."
cd ..

if [ ! -d "node_modules" ]; then
    echo "  Installing frontend dependencies..."
    npm install > /dev/null 2>&1
fi

echo "  Creating .env.production..."
echo "VITE_BACKEND_URL=https://$DOMAIN" > .env.production

echo "  Building frontend..."
npm run build > /dev/null 2>&1
echo "✓ Frontend built"
echo ""

# 4. Nginx configuration
echo "→ Configuring Nginx..."
cat > /etc/nginx/sites-available/crm << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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

    location /socket.io/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl reload nginx
echo "✓ Nginx configured"
echo ""

# 5. Firewall
echo "→ Configuring firewall..."
ufw allow OpenSSH > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
echo "✓ Firewall configured"
echo ""

echo "=========================================="
echo "✓ Deployment Complete!"
echo "=========================================="
echo ""
echo "Application URL: http://$DOMAIN"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your actual configuration"
echo "2. Set up SSL: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "3. Check logs: pm2 logs crm-backend"
echo ""
echo "After SSL setup, update .env.production:"
echo "  echo 'VITE_BACKEND_URL=https://$DOMAIN' > .env.production"
echo "  npm run build"
echo "  pm2 restart crm-backend"
echo ""

