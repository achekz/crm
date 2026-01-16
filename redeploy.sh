#!/bin/bash
# Complete redeployment script - cleans up and deploys fresh

set -e

APP_DIR="/var/www/crm"
DOMAIN="cmtaudit.cloud"
BACKEND_PORT=5000

echo "=========================================="
echo "Complete Redeployment"
echo "Domain: $DOMAIN"
echo "=========================================="
echo ""

# Step 1: Cleanup
echo "Step 1: Cleaning up existing deployment..."
if [ -d "$APP_DIR" ]; then
    # Stop PM2
    pm2 delete crm-backend 2>/dev/null || true
    pm2 save 2>/dev/null || true
    
    # Remove directory
    rm -rf $APP_DIR
    echo "✓ Old deployment removed"
fi

# Remove Nginx config
if [ -f "/etc/nginx/sites-available/crm" ]; then
    rm -f /etc/nginx/sites-available/crm
    rm -f /etc/nginx/sites-enabled/crm
    systemctl reload nginx 2>/dev/null || true
fi

echo ""
echo "Step 2: Creating application directory..."
mkdir -p $APP_DIR
chown -R $SUDO_USER:$SUDO_USER $APP_DIR 2>/dev/null || chown -R root:root $APP_DIR
echo "✓ Directory created: $APP_DIR"
echo ""
echo "=========================================="
echo "✓ Cleanup complete!"
echo "=========================================="
echo ""
echo "Now upload your files to: $APP_DIR"
echo ""
echo "After uploading files, run:"
echo "  cd $APP_DIR"
echo "  chmod +x quick-deploy.sh"
echo "  ./quick-deploy.sh $DOMAIN"
echo ""
echo "Or if files are already uploaded, continuing with deployment..."
echo ""

# Check if files exist
if [ -f "$APP_DIR/package.json" ]; then
    echo "Files detected. Continuing with deployment..."
    echo ""
    cd $APP_DIR
    chmod +x quick-deploy.sh 2>/dev/null || true
    ./quick-deploy.sh $DOMAIN
else
    echo "⚠️  Files not found in $APP_DIR"
    echo "Please upload your project files first, then run:"
    echo "  cd $APP_DIR && ./quick-deploy.sh $DOMAIN"
    exit 1
fi

