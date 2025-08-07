#!/bin/bash

# Backup Script for WhatsApp Gateway
# Usage: ./backup.sh [full|sessions|logs]

BACKUP_TYPE=${1:-full}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/whatsapp-gateway"
APP_DIR="/var/www/whatsapp-gateway"
LOG_DIR="/var/log/whatsapp-gateway"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to compress and create backup
create_backup() {
    local source_dir=$1
    local backup_name=$2
    local backup_file="${BACKUP_DIR}/${backup_name}_${TIMESTAMP}.tar.gz"
    
    log_message "Creating backup: $backup_file"
    tar -czf "$backup_file" -C "$(dirname $source_dir)" "$(basename $source_dir)"
    
    if [ $? -eq 0 ]; then
        log_message "Backup created successfully: $backup_file"
        echo "$backup_file"
    else
        log_message "ERROR: Failed to create backup: $backup_file"
        return 1
    fi
}

case $BACKUP_TYPE in
    "full")
        log_message "Starting full backup..."
        
        # Backup application directory
        create_backup "$APP_DIR" "whatsapp-gateway-full"
        
        # Backup logs
        create_backup "$LOG_DIR" "whatsapp-gateway-logs"
        ;;
        
    "sessions")
        log_message "Starting sessions backup..."
        
        if [ -d "$APP_DIR/sessions" ]; then
            create_backup "$APP_DIR/sessions" "whatsapp-gateway-sessions"
        else
            log_message "WARNING: Sessions directory not found"
        fi
        ;;
        
    "logs")
        log_message "Starting logs backup..."
        
        if [ -d "$LOG_DIR" ]; then
            create_backup "$LOG_DIR" "whatsapp-gateway-logs"
        else
            log_message "WARNING: Logs directory not found"
        fi
        ;;
        
    *)
        echo "Usage: $0 [full|sessions|logs]"
        echo "  full     - Backup entire application and logs"
        echo "  sessions - Backup only WhatsApp sessions"
        echo "  logs     - Backup only log files"
        exit 1
        ;;
esac

# Clean up old backups (keep last 7 days)
log_message "Cleaning up old backups..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

log_message "Backup completed!"

# Display backup directory contents
echo ""
echo "Available backups:"
ls -lh $BACKUP_DIR/*.tar.gz 2>/dev/null | tail -10
