# Deployment Instructions for Hostinger VPS

## Quick Deployment (Automated)

### Option 1: Using PowerShell Script (Windows)

1. Open PowerShell in the project root directory
2. Run the deployment script:
   ```powershell
   .\deploy-from-windows.ps1
   ```
3. Follow the prompts (enter your domain name when asked)

### Option 2: Manual Deployment via SSH

1. **Connect to your VPS:**
   ```bash
   ssh root@31.97.38.243
   # Password: CmtAudit123456-
   ```

2. **Upload files using SCP (from your local machine):**
   ```bash
   # From Windows PowerShell or Git Bash
   scp -r . root@31.97.38.243:/var/www/crm
   ```

   Or use WinSCP/FileZilla:
   - Host: 31.97.38.243
   - User: root
   - Password: CmtAudit123456-
   - Remote directory: /var/www/crm

3. **On the VPS, run setup:**
   ```bash
   cd /var/www/crm
   chmod +x deploy.sh deploy-app.sh
   ./deploy.sh          # Sets up server (Node.js, MongoDB, Nginx, PM2)
   ./deploy-app.sh      # Deploys the application
   ```

## Manual Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install MongoDB
apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Install Nginx
apt-get install -y nginx

# Install PM2
npm install -g pm2

# Install Certbot (for SSL)
apt-get install -y certbot python3-certbot-nginx

# Configure firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### 2. Upload Application Files

Upload all project files to `/var/www/crm` (excluding `node_modules` and `dist`).

### 3. Backend Setup

```bash
cd /var/www/crm/backend

# Install dependencies
npm install --production

# Build backend
npm run build

# Create .env file
nano .env
```

Add to `.env`:
```ini
MONGODB_URI=mongodb://localhost:27017/crm
JWT_SECRET=your_secure_random_string_here
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
```

```bash
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Frontend Setup

```bash
cd /var/www/crm

# Install dependencies
npm install

# Create .env.production
echo "VITE_BACKEND_URL=https://your-domain.com" > .env.production

# Build frontend
npm run build
```

### 5. Configure Nginx

```bash
nano /etc/nginx/sites-available/crm
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/crm/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 6. Setup SSL (Optional but Recommended)

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Troubleshooting

### Check Backend Status
```bash
pm2 status
pm2 logs crm-backend
```

### Restart Services
```bash
pm2 restart crm-backend
systemctl restart nginx
```

### Check Nginx Logs
```bash
tail -f /var/log/nginx/error.log
```

### Check MongoDB
```bash
systemctl status mongod
mongosh
```

### Update Application
```bash
cd /var/www/crm
# Pull new code or upload new files
cd backend && npm install && npm run build
cd .. && npm install && npm run build
pm2 restart crm-backend
systemctl reload nginx
```

## Important Notes

1. **Update .env file** with your actual MongoDB URI, JWT secret, and Stripe keys
2. **Update domain name** in Nginx config and .env.production
3. **Set up SSL** for production (HTTPS)
4. **Configure MongoDB** - either use local MongoDB or MongoDB Atlas (cloud)
5. **Firewall** - ensure ports 80, 443, and 22 are open

## Security Recommendations

1. Change default SSH port (optional)
2. Use SSH keys instead of password authentication
3. Keep system packages updated
4. Use strong JWT secrets
5. Enable MongoDB authentication
6. Use environment variables for sensitive data
7. Set up regular backups

