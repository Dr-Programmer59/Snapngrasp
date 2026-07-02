# Fix for 413 Request Entity Too Large Error

## Problem
NGINX is rejecting file uploads with "413 Request Entity Too Large" error.

## Solution

### 1. Update NGINX Configuration

Add or update the following in your NGINX configuration file (typically `/etc/nginx/nginx.conf` or `/etc/nginx/sites-available/your-site`):

```nginx
http {
    # Allow larger file uploads (50MB)
    client_max_body_size 50M;
    
    # Increase buffer sizes
    client_body_buffer_size 16M;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
}

server {
    # Or add it per-location for specific endpoints
    location /api/uploads {
        client_max_body_size 50M;
        client_body_buffer_size 16M;
    }
}
```

### 2. Restart NGINX

```bash
sudo nginx -t  # Test configuration
sudo systemctl restart nginx  # Restart NGINX
```

### 3. Update Express Backend (if needed)

In your Express app configuration:

```typescript
import express from 'express';

const app = express();

// Increase JSON payload limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

### 4. If using Multer for file uploads

```typescript
const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  }
});
```

## Quick Fix Command

Run this on your server:

```bash
# Edit NGINX config
sudo nano /etc/nginx/nginx.conf

# Add this line in the http block:
# client_max_body_size 50M;

# Test and restart
sudo nginx -t && sudo systemctl restart nginx
```
