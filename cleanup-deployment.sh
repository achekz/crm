#!/bin/bash
# Cleanup script to remove existing deployment

set -e

APP_DIR="/var/www/crm"
DOMAIN="cmtaudit.cloud"

echo "=========================================="
echo "Cleaning up existing deployment"
echo "=========================================="
echo ""

# Stop PM2 process
echo "→ Stopping backend..."
pm2 delete crm-backend 2>/dev/null || true
pm2 save 2>/dev/null || true
echo "✓ Backend stopped"

# Remove application directory
if [ -d "$APP_DIR" ]; then
    echo "→ Removing application directory..."
    rm -rf $APP_DIR
    echo "✓ Application directory removed"
fi

# Remove Nginx configuration
if [ -f "/etc/nginx/sites-available/crm" ]; then
    echo "→ Removing Nginx configuration..."
    rm -f /etc/nginx/sites-available/crm
    rm -f /etc/nginx/sites-enabled/crm
    systemctl reload nginx 2>/dev/null || true
    echo "✓ Nginx configuration removed"
fi

# Remove SSL certificates if they exist
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "→ Removing SSL certificates..."
    certbot delete --cert-name $DOMAIN --non-interactive 2>/dev/null || true
    echo "✓ SSL certificates removed"
fi

echo ""
echo "=========================================="
echo "✓ Cleanup complete!"
echo "=========================================="
echo ""
echo "You can now deploy fresh:"
echo "  cd /var/www && mkdir -p crm"
echo "  # Upload files to /var/www/crm"
echo "  cd /var/www/crm && chmod +x quick-deploy.sh"
echo "  ./quick-deploy.sh $DOMAIN"
echo ""

