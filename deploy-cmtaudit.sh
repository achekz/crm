#!/bin/bash

# CRM Deployment Script for cmtaudit.cloud
set -e

DOMAIN="cmtaudit.cloud"
PROJECT_DIR="/var/www/crm"
BACKEND_PORT="5000"

echo "=================================="
echo "🚀 CRM DEPLOYMENT - $DOMAIN"
echo "=================================="
echo ""

# Step 1: Backend .env
echo "📝 Creating backend .env..."
cat > $PROJECT_DIR/backend/.env << 'EOF'
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/crm
JWT_SECRET=crm-production-secret-key-2026-cmtaudit
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://cmtaudit.cloud
CORS_ORIGIN=https://cmtaudit.cloud
LOG_DIR=/var/www/crm/backend/logs
UPLOAD_DIR=/var/www/crm/backend/uploads
EOF
echo "✓ Backend .env created"
echo ""

# Step 2: Frontend .env
echo "📝 Creating frontend .env..."
cat > $PROJECT_DIR/.env << 'EOF'
VITE_BACKEND_URL=https://cmtaudit.cloud/api
VITE_SOCKET_URL=https://cmtaudit.cloud
EOF
echo "✓ Frontend .env created"
echo ""

# Step 3: Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd $PROJECT_DIR
npm install --production 2>&1 | tail -5
echo "✓ Frontend dependencies installed"
echo ""

# Step 4: Build frontend
echo "🔨 Building frontend with Vite..."
npm run build 2>&1 | tail -10
echo "✓ Frontend built successfully"
echo ""

# Step 5: Start backend with PM2
echo "🚀 Starting backend with PM2..."
cd $PROJECT_DIR/backend
pm2 stop crm-backend 2>/dev/null || true
pm2 delete crm-backend 2>/dev/null || true
pm2 start ecosystem.config.js --name crm-backend
pm2 save
pm2 startup
echo "✓ Backend started with PM2"
echo ""

# Step 6: Configure Nginx
echo "⚙️  Configuring Nginx..."
cat > /etc/nginx/sites-available/crm << 'EOFNGINX'
upstream backend {
    server localhost:5000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name cmtaudit.cloud www.cmtaudit.cloud;
    
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
    server_name cmtaudit.cloud www.cmtaudit.cloud;
    
    ssl_certificate /etc/letsencrypt/live/cmtaudit.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cmtaudit.cloud/privkey.pem;
    
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
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;
    }
    
    # API proxy
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
    
    # WebSocket for Socket.IO
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
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOFNGINX

ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "✓ Nginx configured"
echo ""

# Step 7: SSL Certificate
echo "🔐 Requesting SSL certificate from Let's Encrypt..."
mkdir -p /var/www/certbot

certbot certonly --standalone \
    -d cmtaudit.cloud -d www.cmtaudit.cloud \
    --agree-tos \
    -m admin@cmtaudit.cloud \
    --non-interactive 2>&1 || echo "⚠️  Certificate already exists or error occurred"

systemctl enable certbot.timer
systemctl start certbot.timer
systemctl reload nginx
echo "✓ SSL certificate configured"
echo ""

# Step 8: Verify deployment
echo "=================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================="
echo ""
echo "📊 Status Check:"
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Nginx Status:"
systemctl status nginx | head -3
echo ""
echo "SSL Certificates:"
certbot certificates 2>/dev/null | grep -A 2 "cmtaudit.cloud" || echo "Certificate pending..."
echo ""
echo "Listening Ports:"
ss -tlnp | grep -E ':(80|443|5000)' || echo "Ports not yet active"
echo ""
echo "=================================="
echo "🌐 Access your app at: https://cmtaudit.cloud"
echo "📝 Check logs: pm2 logs crm-backend"
echo "🔧 Restart: pm2 restart crm-backend"
echo "=================================="
