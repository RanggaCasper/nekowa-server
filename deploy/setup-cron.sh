#!/bin/bash

# Setup Cron Jobs for WhatsApp Gateway
# This script sets up automated tasks for monitoring, backup, and maintenance

USER_HOME=$(eval echo ~$USER)
SCRIPT_DIR="$USER_HOME"

echo "🕐 Setting up cron jobs for WhatsApp Gateway..."

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Get existing crontab (if any)
crontab -l 2>/dev/null > $TEMP_CRON

# Add WhatsApp Gateway cron jobs if they don't exist

# Health check every 5 minutes
if ! grep -q "health-check.sh" $TEMP_CRON; then
    echo "*/5 * * * * $SCRIPT_DIR/health-check.sh >/dev/null 2>&1" >> $TEMP_CRON
    echo "✅ Added health check job (every 5 minutes)"
fi

# Daily backup at 2 AM
if ! grep -q "backup.sh" $TEMP_CRON; then
    echo "0 2 * * * $SCRIPT_DIR/backup.sh full >/dev/null 2>&1" >> $TEMP_CRON
    echo "✅ Added daily backup job (2:00 AM)"
fi

# Weekly system cleanup at 3 AM on Sunday
if ! grep -q "apt autoremove" $TEMP_CRON; then
    echo "0 3 * * 0 sudo apt autoremove -y && sudo apt autoclean >/dev/null 2>&1" >> $TEMP_CRON
    echo "✅ Added weekly system cleanup job (Sunday 3:00 AM)"
fi

# Log rotation for application logs every day at 1 AM
if ! grep -q "logrotate" $TEMP_CRON; then
    echo "0 1 * * * find /var/log/whatsapp-gateway -name '*.log' -size +100M -exec gzip {} \; >/dev/null 2>&1" >> $TEMP_CRON
    echo "✅ Added log rotation job (daily 1:00 AM)"
fi

# SSL certificate renewal check (if using Let's Encrypt)
if ! grep -q "certbot renew" $TEMP_CRON; then
    echo "0 12 * * * certbot renew --quiet >/dev/null 2>&1" >> $TEMP_CRON
    echo "✅ Added SSL renewal check job (daily 12:00 PM)"
fi

# Session cleanup - remove disconnected sessions older than 7 days
if ! grep -q "session-cleanup" $TEMP_CRON; then
    echo "0 4 * * * find /var/www/whatsapp-gateway/sessions -type d -mtime +7 -exec rm -rf {} + >/dev/null 2>&1" >> $TEMP_CRON
    echo "✅ Added session cleanup job (daily 4:00 AM)"
fi

# Install the new crontab
crontab $TEMP_CRON

# Clean up
rm $TEMP_CRON

echo ""
echo "📋 Current crontab:"
crontab -l

echo ""
echo "🎉 Cron jobs setup completed!"
echo ""
echo "📝 Scheduled tasks:"
echo "  - Health check: Every 5 minutes"
echo "  - Full backup: Daily at 2:00 AM"
echo "  - System cleanup: Weekly on Sunday at 3:00 AM" 
echo "  - Log rotation: Daily at 1:00 AM"
echo "  - SSL renewal: Daily at 12:00 PM"
echo "  - Session cleanup: Daily at 4:00 AM"
