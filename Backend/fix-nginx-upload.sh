#!/bin/bash

# Quick fix script for 413 Request Entity Too Large error
# Run this on your server: bash fix-nginx-upload.sh

echo "🔧 Fixing NGINX upload size limit..."

# Backup the current config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# Check if client_max_body_size already exists
if grep -q "client_max_body_size" /etc/nginx/nginx.conf; then
    echo "⚠️  client_max_body_size already exists, updating..."
    sudo sed -i 's/client_max_body_size [0-9]*[mMgG];/client_max_body_size 50M;/g' /etc/nginx/nginx.conf
else
    echo "➕ Adding client_max_body_size..."
    # Add after http {
    sudo sed -i '/^http {/a \    client_max_body_size 50M;' /etc/nginx/nginx.conf
fi

# Test NGINX configuration
echo "🧪 Testing NGINX configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration valid, restarting NGINX..."
    sudo systemctl restart nginx
    echo "🎉 NGINX restarted successfully! Upload limit now set to 50MB."
else
    echo "❌ Configuration test failed. Restoring backup..."
    sudo cp /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/nginx.conf
    exit 1
fi
