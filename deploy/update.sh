#!/bin/bash

# WhatsApp Gateway Update Script
# Updates the application to the latest version

set -e

APP_DIR="/var/www/whatsapp-gateway"
SERVICE_NAME="whatsapp-gateway"
BACKUP_DIR="/var/backups/whatsapp-gateway"

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

# Check if running as correct user
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_status "🔄 Starting WhatsApp Gateway update process..."

# Check if application directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "Application directory not found: $APP_DIR"
    print_error "Please run setup-vps.sh first"
    exit 1
fi

# Check if service exists
if ! systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
    print_error "Service $SERVICE_NAME not found"
    exit 1
fi

# Create backup before update
print_status "📦 Creating backup before update..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre-update-backup-$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_FILE" -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)" 2>/dev/null

if [ -f "$BACKUP_FILE" ]; then
    print_status "✅ Backup created: $BACKUP_FILE"
else
    print_warning "⚠️ Backup creation failed, continuing anyway..."
fi

# Stop the service
print_status "⏹️ Stopping $SERVICE_NAME service..."
sudo systemctl stop $SERVICE_NAME

# Update system packages
print_status "📦 Updating system packages..."
sudo apt update

# Check for Node.js updates
CURRENT_NODE=$(node --version)
print_status "Current Node.js version: $CURRENT_NODE"

# Update Node.js if newer version available (optional)
read -p "Do you want to update Node.js to latest LTS? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "🟢 Updating Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs
    
    NEW_NODE=$(node --version)
    print_status "Updated Node.js version: $NEW_NODE"
fi

# Navigate to application directory
cd $APP_DIR

# Stash any local changes
print_status "💾 Stashing local changes..."
git stash

# Fetch latest changes
print_status "📥 Fetching latest updates..."
git fetch origin

# Show available updates
print_status "📋 Available updates:"
git log --oneline HEAD..origin/main | head -10

# Confirm update
echo
read -p "Do you want to continue with the update? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Update cancelled by user"
    sudo systemctl start $SERVICE_NAME
    exit 0
fi

# Pull latest changes
print_status "⬇️ Pulling latest changes..."
git pull origin main

# Update dependencies
print_status "📦 Updating dependencies..."
npm ci --production

# Run any migration scripts if they exist
if [ -f "scripts/migrate.js" ]; then
    print_status "🔄 Running migration scripts..."
    node scripts/migrate.js
fi

# Update file permissions
print_status "🔐 Updating file permissions..."
sudo chown -R www-data:www-data $APP_DIR
chmod +x $APP_DIR/server.js

# Update systemd service if changed
if [ -f "deploy/whatsapp-gateway.service" ]; then
    print_status "🔧 Updating systemd service..."
    sudo cp deploy/whatsapp-gateway.service /etc/systemd/system/
    sudo systemctl daemon-reload
fi

# Update Nginx configuration if changed
if [ -f "deploy/nginx.conf" ]; then
    print_status "🌐 Updating Nginx configuration..."
    sudo cp deploy/nginx.conf /etc/nginx/sites-available/whatsapp-gateway
    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        print_status "✅ Nginx configuration updated"
    else
        print_error "❌ Nginx configuration test failed"
        print_warning "Keeping old configuration"
    fi
fi

# Start the service
print_status "🚀 Starting $SERVICE_NAME service..."
sudo systemctl start $SERVICE_NAME

# Wait and check if service started successfully
sleep 5

if sudo systemctl is-active --quiet $SERVICE_NAME; then
    print_status "✅ Update completed successfully!"
    
    # Show service status
    echo ""
    print_status "📊 Service status:"
    sudo systemctl status $SERVICE_NAME --no-pager -l
    
    # Show recent logs
    echo ""
    print_status "📋 Recent logs:"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 10
    
    # Test application response
    sleep 5
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/sessions || echo "000")
    
    if [ "$RESPONSE" = "200" ]; then
        print_status "✅ Application is responding correctly"
    else
        print_warning "⚠️ Application may not be responding correctly (HTTP: $RESPONSE)"
    fi
    
else
    print_error "❌ Update failed!"
    print_error "Service failed to start. Check logs with:"
    echo "sudo journalctl -u $SERVICE_NAME -f"
    
    # Offer to restore backup
    echo ""
    read -p "Do you want to restore from backup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "🔄 Restoring from backup..."
        sudo systemctl stop $SERVICE_NAME
        
        # Remove current directory
        sudo rm -rf $APP_DIR
        
        # Extract backup
        sudo tar -xzf "$BACKUP_FILE" -C "$(dirname $APP_DIR)"
        
        # Set permissions
        sudo chown -R www-data:www-data $APP_DIR
        
        # Start service
        sudo systemctl start $SERVICE_NAME
        
        if sudo systemctl is-active --quiet $SERVICE_NAME; then
            print_status "✅ Backup restored successfully"
        else
            print_error "❌ Failed to restore backup"
        fi
    fi
    
    exit 1
fi

# Clean up old backups (keep last 5)
print_status "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "pre-update-backup-*.tar.gz" | sort | head -n -5 | xargs rm -f 2>/dev/null || true

print_status "🎉 Update process completed!"

# Show version info
echo ""
print_status "📋 Version Information:"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "Git commit: $(git rev-parse --short HEAD)"
echo "Update time: $(date)"

# Show next steps
echo ""
print_status "📝 Recommended next steps:"
echo "1. Monitor application logs: sudo journalctl -u $SERVICE_NAME -f"
echo "2. Test all functionality through web interface"
echo "3. Check system resources: free -h && df -h"
echo "4. Verify all sessions are working properly"
