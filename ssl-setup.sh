#!/bin/bash

# SSL/HTTPS Configuration Script
SERVER="31.97.38.243"
DOMAIN=$1  # Pass domain as argument: ./ssl-setup.sh example.com

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./ssl-setup.sh yourdomain.com"
    exit 1
fi

echo "🔐 Setting up SSL/HTTPS for $DOMAIN..."

ssh root@$SERVER << EOF
echo "=== Step 1: Install Certbot ==="
apt-get update
apt-get install -y certbot python3-certbot-nginx

echo "=== Step 2: Request SSL Certificate ==="
certbot certonly --standalone --agree-tos -m admin@$DOMAIN -d $DOMAIN -d www.$DOMAIN

echo "=== Step 3: Configure Nginx with SSL ==="
cat > /etc/nginx/sites-available/crm << 'NGINX'
upstream backend {
    server localhost:5000;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS header
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Application
    root /var/www/crm/dist;
    index index.html;
    
    # Frontend SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API endpoints
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
    }
    
    # Socket.IO WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
    
    # Static asset caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINX

echo "=== Step 4: Enable Nginx site ==="
ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm
rm -f /etc/nginx/sites-enabled/default

echo "=== Step 5: Test and reload Nginx ==="
nginx -t && systemctl reload nginx

echo "✅ SSL/HTTPS Configuration Complete!"
echo ""
echo "Certificate Details:"
certbot certificates

echo ""
echo "Setup Auto-renewal:"
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✅ Auto-renewal enabled"
EOF

echo "✅ SSL/HTTPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your DNS records to point to $SERVER"
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "3. Access your app at https://$DOMAIN"
echo ""
echo "Commands:"
echo "  - View certificate: ssh root@$SERVER 'certbot certificates'"
echo "  - Renew manually: ssh root@$SERVER 'certbot renew'"
echo "  - Nginx status: ssh root@$SERVER 'systemctl status nginx'"
echo "  - View logs: ssh root@$SERVER 'tail -f /var/log/nginx/error.log'"
