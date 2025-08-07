#!/bin/bash

# WhatsApp Gateway Health Check and Auto-restart Script
# Add to crontab: */5 * * * * /path/to/health-check.sh

SERVICE_NAME="whatsapp-gateway"
LOG_FILE="/var/log/whatsapp-gateway/health-check.log"
MAX_MEMORY_MB=1024  # 1GB memory limit
MAX_CPU_PERCENT=80  # 80% CPU limit

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Function to send notification (customize as needed)
send_notification() {
    # You can implement webhook, email, or other notification methods here
    echo "ALERT: $1" | logger -t whatsapp-gateway-monitor
}

# Check if service is running
if ! systemctl is-active --quiet $SERVICE_NAME; then
    log_message "ERROR: Service $SERVICE_NAME is not running"
    send_notification "WhatsApp Gateway service is down, attempting restart"
    
    # Try to restart the service
    sudo systemctl start $SERVICE_NAME
    sleep 10
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_message "SUCCESS: Service $SERVICE_NAME restarted successfully"
        send_notification "WhatsApp Gateway service restarted successfully"
    else
        log_message "FAILED: Unable to restart service $SERVICE_NAME"
        send_notification "CRITICAL: Failed to restart WhatsApp Gateway service"
        exit 1
    fi
else
    log_message "INFO: Service $SERVICE_NAME is running"
fi

# Get process ID
PID=$(systemctl show --property MainPID --value $SERVICE_NAME)

if [ "$PID" != "0" ] && [ -n "$PID" ]; then
    # Check memory usage
    MEMORY_KB=$(ps -o rss= -p $PID 2>/dev/null)
    if [ -n "$MEMORY_KB" ]; then
        MEMORY_MB=$((MEMORY_KB / 1024))
        
        if [ $MEMORY_MB -gt $MAX_MEMORY_MB ]; then
            log_message "WARNING: High memory usage detected: ${MEMORY_MB}MB (limit: ${MAX_MEMORY_MB}MB)"
            send_notification "WhatsApp Gateway high memory usage: ${MEMORY_MB}MB"
            
            # Optional: restart service if memory usage is too high
            # sudo systemctl restart $SERVICE_NAME
        fi
    fi
    
    # Check CPU usage
    CPU_PERCENT=$(ps -o %cpu= -p $PID 2>/dev/null | awk '{print int($1)}')
    if [ -n "$CPU_PERCENT" ] && [ $CPU_PERCENT -gt $MAX_CPU_PERCENT ]; then
        log_message "WARNING: High CPU usage detected: ${CPU_PERCENT}% (limit: ${MAX_CPU_PERCENT}%)"
        send_notification "WhatsApp Gateway high CPU usage: ${CPU_PERCENT}%"
    fi
fi

# Check if the application is responding
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/sessions || echo "000")

if [ "$RESPONSE" != "200" ]; then
    log_message "WARNING: Application not responding properly (HTTP: $RESPONSE)"
    
    # Wait a bit and try again
    sleep 30
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/sessions || echo "000")
    
    if [ "$RESPONSE" != "200" ]; then
        log_message "ERROR: Application still not responding, restarting service"
        send_notification "WhatsApp Gateway not responding, restarting service"
        sudo systemctl restart $SERVICE_NAME
    fi
fi

# Check disk space
DISK_USAGE=$(df /var/www/whatsapp-gateway | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    log_message "WARNING: High disk usage: ${DISK_USAGE}%"
    send_notification "High disk usage on WhatsApp Gateway server: ${DISK_USAGE}%"
fi

# Clean up old logs (keep last 7 days)
find /var/log/whatsapp-gateway/ -name "*.log" -mtime +7 -delete 2>/dev/null

# Rotate health check log if it gets too large (>10MB)
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
    log_message "INFO: Health check log rotated"
fi
