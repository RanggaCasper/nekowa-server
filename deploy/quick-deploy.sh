#!/bin/bash

# Quick Deployment Script for WhatsApp Gateway
# Usage: ./quick-deploy.sh [branch_name]

set -e

# Configuration
APP_DIR="/var/www/whatsapp-gateway"
SERVICE_NAME="whatsapp-gateway"
REPO_URL="https://github.com/RanggaCasper/nekowa-server.git"
BRANCH=${1:-main}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if service exists
if ! systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
    print_error "Service $SERVICE_NAME not found. Please run setup-vps.sh first."
    exit 1
fi

print_status "🚀 Starting quick deployment for branch: $BRANCH"

# Stop the service
print_status "⏹️ Stopping $SERVICE_NAME service..."
sudo systemctl stop $SERVICE_NAME

# Backup current sessions (important!)
if [ -d "$APP_DIR/sessions" ]; then
    print_status "💾 Backing up sessions..."
    cp -r $APP_DIR/sessions /tmp/sessions-backup-$(date +%Y%m%d_%H%M%S)
fi

# Backup current .env file
if [ -f "$APP_DIR/.env" ]; then
    print_status "📝 Backing up environment file..."
    cp $APP_DIR/.env /tmp/.env-backup-$(date +%Y%m%d_%H%M%S)
fi

# Navigate to app directory
cd $APP_DIR

# Pull latest changes
print_status "📥 Pulling latest changes from $BRANCH branch..."
git fetch origin
git reset --hard origin/$BRANCH

# Install/update dependencies
print_status "📦 Installing dependencies..."
npm install --production

# Restore sessions if backed up
if [ -d "/tmp/sessions-backup-$(date +%Y%m%d_%H%M%S)" ]; then
    print_status "📁 Restoring sessions..."
    cp -r /tmp/sessions-backup-$(date +%Y%m%d_%H%M%S)/* $APP_DIR/sessions/ 2>/dev/null || true
fi

# Restore .env if backed up
if [ -f "/tmp/.env-backup-$(date +%Y%m%d_%H%M%S)" ]; then
    print_status "⚙️ Restoring environment configuration..."
    cp /tmp/.env-backup-$(date +%Y%m%d_%H%M%S) $APP_DIR/.env
fi

# Set proper permissions
sudo chown -R $USER:$USER $APP_DIR
chmod +x $APP_DIR/server.js

# Start the service
print_status "🚀 Starting $SERVICE_NAME service..."
sudo systemctl start $SERVICE_NAME

# Wait a moment and check if service started successfully
sleep 3

if sudo systemctl is-active --quiet $SERVICE_NAME; then
    print_status "✅ Deployment successful!"
    print_status "🌐 Gateway is running at: http://$(curl -s ifconfig.me):3000"
    
    # Show recent logs
    echo ""
    print_status "📋 Recent logs:"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 10
else
    print_error "❌ Deployment failed!"
    print_error "Service failed to start. Check logs with:"
    echo "sudo journalctl -u $SERVICE_NAME -f"
    exit 1
fi

# Cleanup old backups (keep last 5)
print_status "🧹 Cleaning up old backups..."
find /tmp -name "sessions-backup-*" -type d | sort | head -n -5 | xargs rm -rf 2>/dev/null || true
find /tmp -name ".env-backup-*" -type f | sort | head -n -5 | xargs rm -f 2>/dev/null || true

print_status "🎉 Quick deployment completed!"
