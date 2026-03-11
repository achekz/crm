#!/bin/bash

# Quick deployment script for CRM
SERVER="31.97.38.243"

echo "🚀 Starting CRM Deployment..."

# 1. Initialize Git repository on server
echo "📦 Initializing git repository on server..."
ssh root@$SERVER << 'EOF'
cd /var/www/crm

# Initialize git if not already done
if [ ! -d .git ]; then
    git init
    git remote add origin https://github.com/achekz/crm.git
fi

# Fetch and checkout main branch
git fetch origin main
git checkout -f origin/main

echo "✅ Git initialized"
EOF

# 2. Install backend
echo "📥 Installing backend dependencies..."
ssh root@$SERVER << 'EOF'
cd /var/www/crm/backend
npm install
echo "✅ Backend dependencies installed"
EOF

# 3. Install frontend
echo "📥 Installing frontend dependencies..."
ssh root@$SERVER << 'EOF'
cd /var/www/crm
npm install
echo "✅ Frontend dependencies installed"
EOF

# 4. Build frontend
echo "🔨 Building frontend..."
ssh root@$SERVER << 'EOF'
cd /var/www/crm
npm run build
echo "✅ Frontend built"
EOF

# 5. Restart PM2
echo "🔄 Restarting PM2..."
ssh root@$SERVER << 'EOF'
cd /var/www/crm/backend
pm2 delete crm-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 list
echo "✅ PM2 restarted"
EOF

# 6. Check status
echo "📊 Checking status..."
ssh root@$SERVER << 'EOF'
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Nginx Status ==="
systemctl status nginx --no-pager

echo ""
echo "=== Recent Logs ==="
pm2 logs crm-backend --lines 5 --nostream
EOF

echo "✅ Deployment complete!"
echo ""
echo "📝 Quick commands:"
echo "  - View logs: ssh root@$SERVER 'pm2 logs crm-backend'"
echo "  - Stop app: ssh root@$SERVER 'pm2 stop crm-backend'"
echo "  - Restart app: ssh root@$SERVER 'pm2 restart crm-backend'"
echo "  - View Nginx: ssh root@$SERVER 'systemctl status nginx'"
