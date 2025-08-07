# WhatsApp Gateway VPS Deployment Guide

## 📋 Requirements

- Ubuntu 18.04 LTS atau lebih baru
- Minimal 1GB RAM, 2GB recommended
- Minimal 10GB disk space
- User dengan sudo privileges
- Domain name (optional, untuk SSL)

## 🚀 Installation

### 1. Setup VPS

```bash
# Upload setup script ke VPS
scp deploy/setup-vps.sh user@your-server-ip:~/

# SSH ke VPS
ssh user@your-server-ip

# Run setup script
chmod +x setup-vps.sh
./setup-vps.sh
```

### 2. Deploy Application

```bash
# Deploy aplikasi
./deploy-gateway.sh

# Edit environment variables
nano /var/www/whatsapp-gateway/.env
```

### 3. Setup SSL (Optional)

```bash
# Setup SSL dengan Let's Encrypt
./setup-ssl.sh your-domain.com
```

## ⚙️ Configuration

### Environment Variables

Edit file `/var/www/whatsapp-gateway/.env`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
```

### Nginx Configuration

File: `/etc/nginx/sites-available/whatsapp-gateway`

- Ganti `YOUR_DOMAIN_HERE` dengan domain anda
- Konfigurasi rate limiting sesuai kebutuhan
- Setup SSL setelah domain terkonfigurasi

## 🔧 Management Commands

### Service Management

```bash
# Start service
sudo systemctl start whatsapp-gateway

# Stop service
sudo systemctl stop whatsapp-gateway

# Restart service
sudo systemctl restart whatsapp-gateway

# Check status
sudo systemctl status whatsapp-gateway

# Enable auto-start
sudo systemctl enable whatsapp-gateway
```

### Logs

```bash
# View real-time logs
sudo journalctl -u whatsapp-gateway -f

# View application logs
tail -f /var/log/whatsapp-gateway/output.log

# View error logs
tail -f /var/log/whatsapp-gateway/error.log
```

### Quick Deployment

```bash
# Deploy latest changes
./quick-deploy.sh

# Deploy specific branch
./quick-deploy.sh develop
```

## 📊 Monitoring

### Health Check

```bash
# Run manual health check
./monitor-gateway.sh

# Setup automated health check (crontab)
crontab -e
# Add line: */5 * * * * /home/user/health-check.sh
```

### System Monitoring

```bash
# Check system resources
htop

# Check network connections
netstat -tlnp | grep :3000

# Check disk usage
df -h

# Check memory usage
free -h
```

## 💾 Backup & Restore

### Create Backup

```bash
# Full backup
./backup.sh full

# Sessions only
./backup.sh sessions

# Logs only
./backup.sh logs
```

### Restore Backup

```bash
# Stop service
sudo systemctl stop whatsapp-gateway

# Extract backup
cd /var/www/whatsapp-gateway
sudo tar -xzf /var/backups/whatsapp-gateway/backup-file.tar.gz

# Set permissions
sudo chown -R www-data:www-data /var/www/whatsapp-gateway

# Start service
sudo systemctl start whatsapp-gateway
```

## 🔒 Security

### Firewall (UFW)

```bash
# Check firewall status
sudo ufw status

# Allow specific IP
sudo ufw allow from YOUR_IP_ADDRESS to any port 3000

# Block IP
sudo ufw deny from BLOCKED_IP_ADDRESS
```

### SSL Certificate

```bash
# Check SSL status
sudo certbot certificates

# Renew SSL manually
sudo certbot renew

# Test SSL renewal
sudo certbot renew --dry-run
```

## 🔄 Updates

### Update Application

```bash
# Quick update
./quick-deploy.sh

# Manual update
cd /var/www/whatsapp-gateway
git pull origin main
npm install --production
sudo systemctl restart whatsapp-gateway
```

### Update System

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Update Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

## 🐛 Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check logs
   sudo journalctl -u whatsapp-gateway -n 50
   
   # Check configuration
   sudo nginx -t
   
   # Check permissions
   sudo chown -R www-data:www-data /var/www/whatsapp-gateway
   ```

2. **High memory usage**
   ```bash
   # Check memory
   free -h
   
   # Restart service
   sudo systemctl restart whatsapp-gateway
   ```

3. **Connection issues**
   ```bash
   # Check port
   netstat -tlnp | grep :3000
   
   # Check firewall
   sudo ufw status
   
   # Check nginx
   sudo nginx -t && sudo systemctl reload nginx
   ```

### Performance Tuning

```bash
# Increase file limits
echo "www-data soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "www-data hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize Node.js
export NODE_OPTIONS="--max-old-space-size=1024"
```

## 📞 API Endpoints

Setelah deployment, akses gateway di:

- **HTTP**: `http://your-server-ip:3000`
- **HTTPS**: `https://your-domain.com` (setelah SSL setup)

### Main Endpoints

- `GET /` - Web interface
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `POST /api/sessions/create-with-mode` - Create with pairing/QR mode
- `POST /api/sessions/:id/request-pairing` - Request pairing code
- `POST /api/send` - Send message

## 📈 Scaling

### Multiple Instances

Untuk load tinggi, gunakan PM2:

```bash
# Install PM2
npm install -g pm2

# Start multiple instances
pm2 start server.js -i max --name whatsapp-gateway

# Load balancer dengan Nginx
# Edit /etc/nginx/sites-available/whatsapp-gateway
upstream whatsapp_gateway {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}
```

### Database Integration

Untuk session persistence, integrasikan dengan database:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createdb whatsapp_gateway
sudo -u postgres createuser gateway_user
```

## 📝 Notes

- Sessions tersimpan di `/var/www/whatsapp-gateway/sessions`
- Logs tersimpan di `/var/log/whatsapp-gateway/`
- Backup otomatis tersimpan di `/var/backups/whatsapp-gateway/`
- Health check berjalan setiap 5 menit via cron
- SSL certificate auto-renewal via certbot cron

## 🆘 Support

Jika mengalami masalah:

1. Cek logs dengan `./monitor-gateway.sh`
2. Restart service dengan `sudo systemctl restart whatsapp-gateway`
3. Backup sessions sebelum troubleshooting
4. Gunakan script health check untuk diagnosis otomatis
