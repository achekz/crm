#!/bin/bash

# Exit on error
set -e

echo "Starting VPS Setup..."

# 1. Update System
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install Node.js (v20 LTS)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Nginx
echo "Installing Nginx..."
sudo apt-get install -y nginx

# 4. Install MongoDB
echo "Installing MongoDB..."
sudo apt-get install gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# 5. Install Global Tools (PM2)
echo "Installing PM2..."
sudo npm install -g pm2

# 6. Configure Firewall
echo "Configuring Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# Note: Interactive confirmation might be needed for 'ufw enable', so we skip forcing it or use --force
echo "y" | sudo ufw enable

# 7. Create App Directory
echo "Creating application directory at /var/www/crm..."
sudo mkdir -p /var/www/crm
# Change ownership to current user so we can upload files without sudo
sudo chown -R $USER:$USER /var/www/crm

echo "============================================"
echo "Setup Complete!"
echo "You can now upload your files to /var/www/crm"
echo "============================================"
