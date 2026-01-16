#!/bin/bash
# Script to import users from users_tunisia.csv to the database
# Run this on the VPS server

set -e

APP_DIR="/var/www/crm"
CSV_FILE="$APP_DIR/backend/users_tunisia.csv"

echo "=========================================="
echo "Import Users to Database"
echo "=========================================="
echo ""

# Check if CSV file exists
if [ ! -f "$CSV_FILE" ]; then
    echo "[ERROR] CSV file not found: $CSV_FILE"
    exit 1
fi

echo "[OK] CSV file found: $CSV_FILE"
echo ""

# Check if backend is running
echo "Step 1: Checking backend status..."
if pm2 list | grep -q "crm-backend"; then
    echo "[OK] Backend is running"
else
    echo "[WARNING] Backend is not running. Starting it..."
    cd $APP_DIR/backend
    pm2 start ecosystem.config.js
    sleep 2
fi
echo ""

# Check MongoDB
echo "Step 2: Checking MongoDB..."
if systemctl is-active --quiet mongod; then
    echo "[OK] MongoDB is running"
else
    echo "[WARNING] MongoDB is not running. Starting it..."
    systemctl start mongod
    sleep 2
fi
echo ""

# Run import
echo "Step 3: Running import script..."
echo "  This will import users from users_tunisia.csv"
echo ""

cd $APP_DIR/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "[ERROR] .env file not found. Please configure the backend first."
    exit 1
fi

# Run the import (try npm script first, fallback to compiled version)
echo "Running import script..."
if [ -f "node_modules/.bin/ts-node" ] || command -v ts-node &> /dev/null; then
    npm run import-users
elif [ -f "dist/scripts/importUsers.js" ]; then
    echo "Using compiled version..."
    node dist/scripts/importUsers.js
else
    echo "[ERROR] Cannot find import script. Please build the backend first: npm run build"
    exit 1
fi

echo ""
echo "=========================================="
echo "Import Complete"
echo "=========================================="
echo ""
echo "You can now login with:"
echo "  Admin: admin.tunisia@email.com / admin123"
echo "  Client: ahmed.benali@email.com / azerty123"
echo ""

