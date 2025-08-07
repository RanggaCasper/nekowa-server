#!/bin/bash

# WhatsApp Gateway VPS Setup Script
# For Ubuntu/Debian servers

set -e

echo "🚀 Starting WhatsApp Gateway VPS Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_warning "Running as root. Proceeding anyway (not recommended for production)."
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js (using NodeSource repository)
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js version: $NODE_VERSION"
print_status "NPM version: $NPM_VERSION"

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install UFW firewall
print_status "Installing and configuring UFW firewall..."
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000  # For direct access if needed
sudo ufw --force enable

# Create application directory
APP_DIR="/var/www/whatsapp-gateway"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Create logs directory
sudo mkdir -p /var/log/whatsapp-gateway
sudo chown $USER:$USER /var/log/whatsapp-gateway

# Create systemd service file
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/whatsapp-gateway.service > /dev/null <<EOF
[Unit]
Description=WhatsApp Gateway Multi-Device
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=5
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
StandardOutput=append:/var/log/whatsapp-gateway/output.log
StandardError=append:/var/log/whatsapp-gateway/error.log
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Create Nginx configuration
print_status "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/whatsapp-gateway > /dev/null <<EOF
server {
    listen 80;
    server_name YOUR_DOMAIN_HERE;  # Replace with your domain
    
    # Increase client max body size for media uploads
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/whatsapp-gateway /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload systemd and start services
print_status "Reloading systemd and starting services..."
sudo systemctl daemon-reload
sudo systemctl enable nginx
sudo systemctl restart nginx

# Create deployment script
print_status "Creating deployment helper script..."
tee $HOME/deploy-gateway.sh > /dev/null <<EOF
#!/bin/bash

# WhatsApp Gateway Deployment Script

APP_DIR="/var/www/whatsapp-gateway"
REPO_URL="https://github.com/RanggaCasper/nekowa-server.git"  # Replace with your repo

echo "🚀 Deploying WhatsApp Gateway..."

# Stop the service
sudo systemctl stop whatsapp-gateway

# Backup current deployment (if exists)
if [ -d "\$APP_DIR" ]; then
    echo "📦 Backing up current deployment..."
    sudo mv \$APP_DIR \$APP_DIR.backup.\$(date +%Y%m%d_%H%M%S)
fi

# Clone repository
echo "📥 Cloning repository..."
git clone \$REPO_URL \$APP_DIR
cd \$APP_DIR

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Copy environment file template
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

# Set proper permissions
sudo chown -R \$USER:\$USER \$APP_DIR
chmod +x \$APP_DIR/server.js

# Start the service
echo "🚀 Starting WhatsApp Gateway service..."
sudo systemctl start whatsapp-gateway
sudo systemctl enable whatsapp-gateway

# Check service status
sleep 3
if sudo systemctl is-active --quiet whatsapp-gateway; then
    echo "✅ WhatsApp Gateway deployed successfully!"
    echo "🌐 Access your gateway at: http://YOUR_SERVER_IP"
else
    echo "❌ Deployment failed. Check logs with: sudo journalctl -u whatsapp-gateway -f"
fi
EOF

chmod +x $HOME/deploy-gateway.sh

# Create SSL setup script (Let's Encrypt)
print_status "Creating SSL setup script..."
tee $HOME/setup-ssl.sh > /dev/null <<EOF
#!/bin/bash

# SSL Setup with Let's Encrypt

if [ -z "\$1" ]; then
    echo "Usage: ./setup-ssl.sh YOUR_DOMAIN.com"
    exit 1
fi

DOMAIN=\$1

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Update Nginx configuration with domain
sudo sed -i "s/YOUR_DOMAIN_HERE/\$DOMAIN/g" /etc/nginx/sites-available/whatsapp-gateway

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d \$DOMAIN

# Auto-renewal setup
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

echo "✅ SSL setup completed for \$DOMAIN"
EOF

chmod +x $HOME/setup-ssl.sh

# Create monitoring script
print_status "Creating monitoring script..."
tee $HOME/monitor-gateway.sh > /dev/null <<EOF
#!/bin/bash

# WhatsApp Gateway Monitoring Script

echo "📊 WhatsApp Gateway System Status"
echo "=================================="

# Service status
echo "🔧 Service Status:"
sudo systemctl status whatsapp-gateway --no-pager -l

echo ""
echo "📋 Recent Logs:"
sudo journalctl -u whatsapp-gateway --no-pager -n 20

echo ""
echo "💾 Disk Usage:"
df -h | grep -E "(Filesystem|/dev/)"

echo ""
echo "🧠 Memory Usage:"
free -h

echo ""
echo "🔥 CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print \$2 \$3 \$4}'

echo ""
echo "🌐 Network Connections:"
netstat -tlnp | grep :3000

echo ""
echo "📁 Application Directory:"
ls -la /var/www/whatsapp-gateway/
EOF

chmod +x $HOME/monitor-gateway.sh

# Create environment template
print_status "Creating environment template..."
tee $APP_DIR/.env.example > /dev/null <<EOF
# WhatsApp Gateway Configuration

# Server Configuration
PORT=3000
NODE_ENV=production

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here

# Security (generate with: openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Session Configuration
MAX_SESSIONS=10
SESSION_TIMEOUT=3600000

# Webhook Configuration (optional)
WEBHOOK_URL=
WEBHOOK_SECRET=

# Database (if using)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=whatsapp_gateway
# DB_USER=gateway_user
# DB_PASS=gateway_password

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/whatsapp-gateway/app.log
EOF

print_status "VPS setup completed! 🎉"
echo ""
echo "📋 Next Steps:"
echo "1. Run: $HOME/deploy-gateway.sh (to deploy your application)"
echo "2. Edit: $APP_DIR/.env (configure your environment variables)"
echo "3. Run: $HOME/setup-ssl.sh YOUR_DOMAIN.com (to setup SSL)"
echo "4. Use: $HOME/monitor-gateway.sh (to monitor the application)"
echo ""
echo "🔧 Useful Commands:"
echo "- Check status: sudo systemctl status whatsapp-gateway"
echo "- View logs: sudo journalctl -u whatsapp-gateway -f"
echo "- Restart service: sudo systemctl restart whatsapp-gateway"
echo "- Test Nginx: sudo nginx -t"
echo ""
echo "🌐 Access your gateway at: http://YOUR_SERVER_IP"
echo "📝 Don't forget to configure your domain in Nginx and setup SSL!"
