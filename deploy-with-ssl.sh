#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="31.97.38.243"
APP_DIR="/var/www/crm"
DOMAIN="31.97.38.243"  # Change this to your actual domain for SSL
GIT_REPO="https://github.com/achekz/crm.git"  # Change to your repo

echo -e "${YELLOW}=== CRM Deployment Script ===${NC}"

# Step 1: Clone/Pull repository
echo -e "\n${YELLOW}Step 1: Cloning/Updating repository...${NC}"
ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'EOF'
if [ -d /var/www/crm/.git ]; then
    echo "Repository exists, pulling latest changes..."
    cd /var/www/crm
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/achekz/crm.git /var/www/crm
fi
cd /var/www/crm
echo "Latest commit:"
git log -1 --oneline
EOF

# Step 2: Install backend dependencies
echo -e "\n${YELLOW}Step 2: Installing backend dependencies...${NC}"
ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'EOF'
cd /var/www/crm/backend
npm install
EOF

# Step 3: Install frontend dependencies
echo -e "\n${YELLOW}Step 3: Installing frontend dependencies...${NC}"
ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'EOF'
cd /var/www/crm
npm install
EOF

# Step 4: Build frontend
echo -e "\n${YELLOW}Step 4: Building frontend...${NC}"
ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'EOF'
cd /var/www/crm
npm run build
EOF

# Step 5: Setup PM2 ecosystem
echo -e "\n${YELLOW}Step 5: Setting up PM2 ecosystem...${NC}"
ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'EOF'
cd /var/www/crm/backend
pm2 delete crm-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
echo "PM2 status:"
pm2 list
EOF

# Step 6: Configure SSL/HTTPS with Let's Encrypt
echo -e "\n${YELLOW}Step 6: Configuring SSL/HTTPS with Let's Encrypt...${NC}"
ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'EOF'
# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Request SSL certificate (replace DOMAIN with your actual domain)
certbot certonly --non-interactive --agree-tos -m admin@example.com --nginx -d DOMAIN || true

echo "SSL certificate configured"
certbot certificates
EOF

# Step 7: Configure Nginx with SSL
echo -e "\n${YELLOW}Step 7: Configuring Nginx with SSL...${NC}"
ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'NGINX_EOF'
cat > /etc/nginx/sites-available/crm << 'EOF'
upstream backend {
    server localhost:5000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name _;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Root directory
    root /var/www/crm/dist;
    index index.html;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.IO
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx
echo "Nginx configured with SSL"
NGINX_EOF

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Update DOMAIN in this script to your actual domain"
echo "2. Request SSL certificate: certbot certonly --standalone -d yourdomain.com"
echo "3. Configure environment variables on server"
echo "4. Check logs: pm2 logs crm-backend"
echo "5. View Nginx status: systemctl status nginx"
