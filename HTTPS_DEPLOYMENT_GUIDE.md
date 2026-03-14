# CRM System HTTPS & Automated Deployment Guide

## Domain Configuration
- **Domain**: cmtaudit.tn
- **SSL Certificate**: Let's Encrypt (Auto-renewing)
- **VPS IP**: 31.97.38.243
- **Application Port**: 5000 (Backend)
- **Web Port**: 80/443 (Nginx)

## Automated HTTPS Setup & Deployment

### Option 1: Quick Auto-Deploy (Recommended)
Run this single command from your local machine:

```powershell
.\vps-deploy-auto.ps1
```

This script will:
- ✓ Verify SSH connection to VPS
- ✓ Push latest code to GitHub
- ✓ Deploy application to VPS
- ✓ Install and configure Let's Encrypt SSL
- ✓ Setup Nginx with HTTPS
- ✓ Configure PM2 for process management
- ✓ Enable automatic certificate renewal

### Option 2: Manual HTTPS Setup Only
If you already have the application deployed:

```powershell
# On your local machine, copy script to VPS
scp vps-https-setup.ps1 root@31.97.38.243:/tmp/

# SSH into VPS and run
ssh root@31.97.38.243
pwsh /tmp/vps-https-setup.ps1
```

---

## Manual Deployment Steps (If Not Using Auto-Deploy)

### Step 1: SSH into VPS
```bash
ssh root@31.97.38.243
```

### Step 2: Clone or Update Repository
```bash
cd /var/www
git clone https://github.com/achekz/crm.git
cd crm
```

Or if already cloned:
```bash
cd /var/www/crm
git pull origin main
```

### Step 3: Install Dependencies & Build

**Backend:**
```bash
cd backend
npm install
npm run build
```

**Frontend:**
```bash
cd ..
npm install
npm run build
```

### Step 4: Setup Environment Variables
```bash
# Create .env file with your secrets
nano backend/.env
```

Required environment variables:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/crm
JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://cmtaudit.tn
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://cmtaudit.tn/auth/google/callback
```

### Step 5: Install & Start PM2
```bash
npm install -g pm2

# Start backend
cd backend
pm2 start "node dist/server.js" --name "crm-backend" --instances max --exec-mode cluster

# Start frontend
cd ..
pm2 start "npm run preview" --name "crm-frontend"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 6: Setup Let's Encrypt HTTPS
```bash
# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Stop Nginx temporarily
systemctl stop nginx

# Get certificate
certbot certonly --standalone \
  -d cmtaudit.tn \
  -d www.cmtaudit.tn \
  --non-interactive \
  --agree-tos \
  --email admin@cmtaudit.tn
```

### Step 7: Configure Nginx
Create `/etc/nginx/sites-available/cmtaudit.tn`:

```nginx
# HTTP to HTTPS redirect
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

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cmtaudit.tn www.cmtaudit.tn;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/cmtaudit.tn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cmtaudit.tn/privkey.pem;
    
    # SSL Configuration
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

    root /var/www/crm/public;
    index index.html;

    # Frontend Routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
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
    }

    # WebSocket Support
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

    access_log /var/log/nginx/cmtaudit-access.log combined;
    error_log /var/log/nginx/cmtaudit-error.log;
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/cmtaudit.tn /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

### Step 8: Setup Automatic SSL Renewal
```bash
systemctl enable certbot.timer
systemctl start certbot.timer

# Verify renewal is working
systemctl status certbot.timer
```

---

## Verification Checklist

- [ ] Application accessible at https://cmtaudit.tn
- [ ] HTTPS working (no security warnings)
- [ ] API responding at https://cmtaudit.tn/api/
- [ ] WebSocket connection working
- [ ] SSL certificate valid (check in browser)
- [ ] Automatic redirect from HTTP to HTTPS

## Useful Commands

### Check Application Status
```bash
pm2 status
pm2 logs crm-backend
pm2 logs crm-frontend
```

### Restart Application
```bash
pm2 restart all
# or specific service
pm2 restart crm-backend
```

### View SSL Certificate
```bash
certbot certificates
```

### Renew SSL Certificate (Manual)
```bash
certbot renew
```

### Check Nginx Status
```bash
systemctl status nginx
tail -f /var/log/nginx/cmtaudit-error.log
tail -f /var/log/nginx/cmtaudit-access.log
```

### Update Application (Pull from GitHub)
```bash
cd /var/www/crm
git pull origin main
npm run build
cd backend && npm run build && cd ..
pm2 restart all
```

---

## Troubleshooting

### SSL Certificate Fails
```bash
# Check logs
certbot --dry-run renew

# Renew manually
certbot renew --force-renewal
```

### Port 80/443 Already in Use
```bash
# Check what's using the port
lsof -i :80
lsof -i :443

# Kill process if needed
kill -9 <PID>
```

### Nginx Not Starting
```bash
nginx -t  # Test configuration
journalctl -xe  # View system logs
```

### Application Not Responding
```bash
pm2 status
pm2 logs
pm2 restart all
```

---

## Security Notes

✓ HTTPS enforced with 301 redirect
✓ TLS 1.2 and 1.3 only
✓ Strong cipher suite enabled
✓ HSTS header enabled (1 year)
✓ X-Frame-Options set to SAMEORIGIN
✓ Content-Type sniffing protection
✓ Automatic SSL renewal

---

## Support

For issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `tail -f /var/log/nginx/cmtaudit-error.log`
3. Check certificate: `certbot certificates`
4. Restart services: `pm2 restart all && systemctl restart nginx`

