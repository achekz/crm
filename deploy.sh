#!/bin/bash

# CRM Application Deployment Script for Hostinger VPS
# Run this script on your VPS as root

set -e  # Exit on error

echo "=========================================="
echo "CRM Application Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/crm"
DOMAIN="your-domain.com"  # Update this with your actual domain
BACKEND_PORT=5000

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root"
    exit 1
fi

# 1. Update system packages
print_info "Updating system packages..."
apt-get update -y
apt-get upgrade -y
print_success "System updated"

# 2. Install Node.js (v20 LTS)
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

# 3. Install Nginx
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx installed and started"
else
    print_success "Nginx already installed"
fi

# 4. Install MongoDB (or use MongoDB Atlas)
print_info "Checking MongoDB..."
if ! command -v mongod &> /dev/null; then
    print_info "Installing MongoDB..."
    apt-get install -y gnupg curl
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update
    apt-get install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
    print_success "MongoDB installed and started"
else
    print_success "MongoDB already installed"
fi

# 5. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# 6. Create application directory
print_info "Creating application directory..."
mkdir -p $APP_DIR
chown -R $SUDO_USER:$SUDO_USER $APP_DIR
print_success "Application directory created: $APP_DIR"

# 7. Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# 8. Configure firewall
print_info "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
print_success "Firewall configured"

echo ""
echo "=========================================="
print_success "Server setup completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload your application files to: $APP_DIR"
echo "2. Update the domain in this script: $DOMAIN"
echo "3. Run the deployment script: ./deploy-app.sh"
echo ""
echo "Or continue with automatic deployment if files are already uploaded."

