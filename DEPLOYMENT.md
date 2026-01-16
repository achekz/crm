# Deployment Guide for Hostinger VPS

This guide outlines the steps to deploy your CRM application to a Hostinger VPS.

## Prerequisites

- Hostinger VPS with Ubuntu 20.04 or 22.04 (recommended).
- SSH access to your VPS.
- A domain name pointing to your VPS IP address (A record).

## 1. Environment Setup (On VPS)

Connect to your VPS via SSH:
```bash
ssh root@your_vps_ip
```

### Install Node.js (v18 or v20)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install MongoDB
Follow the official MongoDB installation guide for Ubuntu.
Alternatively, use MongoDB Atlas (Cloud) and just use the connection string.
If installing locally:
```bash
sudo apt-get install gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Install Nginx and PM2
```bash
sudo apt-get install -y nginx
sudo npm install -g pm2
```

## 2. Application Deployment

### Clone or Upload Code
You can use Git to clone your repository or upload the files via SFTP/SCP.
Assume the code is in `/var/www/crm`.

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd /var/www/crm/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the backend:
   ```bash
   npm run build
   ```
4. Configure Environment Variables:
   Create a `.env` file:
   ```bash
   nano .env
   ```
   Paste your configuration:
   ```ini
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/crm
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   FRONTEND_URL=https://your-domain.com
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_CURRENCY=usd
   ```
5. Start with PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Frontend Setup
1. Navigate to root directory:
   ```bash
   cd /var/www/crm
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Create a `.env.production` file:
   ```bash
   nano .env.production
   ```
   Content:
   ```ini
   VITE_BACKEND_URL=https://your-domain.com
   ```
4. Build the frontend:
   ```bash
   npm run build
   ```
   This will create a `dist` folder.

## 3. Nginx Configuration

Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/crm
```

Paste the following configuration (replace `your-domain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/crm/dist;
    index index.html;

    # Frontend Static Files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO Proxy
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

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 4. SSL Configuration (HTTPS)

Install Certbot:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Obtain SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts. Certbot will automatically update your Nginx config to serve over HTTPS.

## 5. Maintenance

- **View Backend Logs**: `pm2 logs crm-backend`
- **Restart Backend**: `pm2 restart crm-backend`
- **Update Application**:
  1. Pull new code.
  2. Rebuild frontend (`npm run build`).
  3. Rebuild backend (`cd backend && npm run build`).
  4. Restart PM2 (`pm2 restart all`).
