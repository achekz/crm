# Redeployment Instructions for cmtaudit.cloud

## Quick Redeploy (Recommended)

### Option 1: Automated via SSH

1. **Connect to your VPS:**
   ```bash
   ssh root@31.97.38.243
   # Password: CmtAudit123456-
   ```

2. **Run the cleanup and redeploy script:**
   ```bash
   # First, upload the redeploy.sh script (or create it on the server)
   cd /var/www
   
   # Cleanup old deployment
   pm2 delete crm-backend 2>/dev/null || true
   rm -rf crm
   
   # Create directory and upload files
   mkdir -p crm
   # (Upload your files here using WinSCP/FileZilla or SCP)
   ```

3. **After uploading files, run:**
   ```bash
   cd /var/www/crm
   chmod +x quick-deploy.sh
   ./quick-deploy.sh cmtaudit.cloud
   ```

### Option 2: Using the Redeploy Script

If you've already uploaded the `redeploy.sh` script:

```bash
ssh root@31.97.38.243
cd /var/www/crm
chmod +x redeploy.sh
./redeploy.sh
```

## Manual Step-by-Step Redeploy

### Step 1: Cleanup Existing Deployment

```bash
ssh root@31.97.38.243

# Stop backend
pm2 delete crm-backend
pm2 save

# Remove application
rm -rf /var/www/crm

# Remove Nginx config
rm -f /etc/nginx/sites-available/crm
rm -f /etc/nginx/sites-enabled/crm
systemctl reload nginx

# Remove SSL (if exists)
certbot delete --cert-name cmtaudit.cloud --non-interactive 2>/dev/null || true
```

### Step 2: Upload Files

**Using WinSCP/FileZilla:**
- Host: `31.97.38.243`
- User: `root`
- Password: `CmtAudit123456-`
- Upload to: `/var/www/crm`
- **Exclude:** `node_modules`, `dist`, `.git`

**Or using SCP from command line:**
```bash
# From your local machine
scp -r --exclude node_modules --exclude dist --exclude .git . root@31.97.38.243:/var/www/crm
```

### Step 3: Deploy

```bash
ssh root@31.97.38.243
cd /var/www/crm
chmod +x quick-deploy.sh
./quick-deploy.sh cmtaudit.cloud
```

### Step 4: Configure Environment

```bash
# Edit backend .env file
nano /var/www/crm/backend/.env
```

Update with your actual values:
- `MONGODB_URI` - Your MongoDB connection string
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

### Step 5: Setup SSL

```bash
certbot --nginx -d cmtaudit.cloud -d www.cmtaudit.cloud
```

### Step 6: Update Frontend for HTTPS

```bash
cd /var/www/crm
echo "VITE_BACKEND_URL=https://cmtaudit.cloud" > .env.production
npm run build
pm2 restart crm-backend
systemctl reload nginx
```

## Verification

After deployment, verify:

1. **Backend is running:**
   ```bash
   pm2 status
   pm2 logs crm-backend
   ```

2. **Nginx is configured:**
   ```bash
   nginx -t
   systemctl status nginx
   ```

3. **Application is accessible:**
   - Visit: `http://cmtaudit.cloud` (or `https://cmtaudit.cloud` after SSL)
   - Check API: `http://cmtaudit.cloud/api/auth/me` (should return error if not authenticated, but not 404)

## Troubleshooting

### Backend not starting
```bash
pm2 logs crm-backend
cd /var/www/crm/backend
npm run build
pm2 restart crm-backend
```

### Nginx errors
```bash
nginx -t
tail -f /var/log/nginx/error.log
```

### MongoDB connection issues
```bash
# Check MongoDB status
systemctl status mongod

# Or if using MongoDB Atlas, verify connection string in .env
```

### Frontend not loading
```bash
cd /var/www/crm
npm run build
# Check if dist folder exists and has files
ls -la dist/
```

## Important Notes

- **Domain:** All scripts are configured for `cmtaudit.cloud`
- **Port:** Backend runs on port 5000 (internal)
- **SSL:** Set up SSL certificate after initial deployment
- **Environment:** Update `.env` file with actual API keys and database connection
- **MongoDB:** Can use local MongoDB or MongoDB Atlas (cloud)

