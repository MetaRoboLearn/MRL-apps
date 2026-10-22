# DuckDNS + Let's Encrypt SSL Setup Guide

This guide shows you how to set up your MRL-apps deployment with:
- **Free subdomain** from DuckDNS (e.g., `mrl-apps.duckdns.org`)
- **Free trusted SSL certificate** from Let's Encrypt
- **No cost** - completely free!

---

## What You'll Get

- ✅ Free domain name (subdomain): `yourname.duckdns.org`
- ✅ Trusted HTTPS certificate (no browser warnings)
- ✅ Automatic certificate renewal
- ✅ No need to buy a domain or use Cloudflare

---

## Prerequisites

- Static IP address or dynamic IP with internet access
- Ubuntu/Debian Linux server (your current setup)
- Docker and Docker Compose installed
- Ports 80 and 443 accessible from the internet

---

## Step 1: Register DuckDNS Subdomain

1. **Go to**: https://www.duckdns.org/
2. **Sign in** using Google, GitHub, or other providers
3. **Create a subdomain**:
   - Enter your desired subdomain (e.g., `mrl-apps`)
   - You'll get: `mrl-apps.duckdns.org`
   - Enter your server's **static IP address**
   - Click **"Add domain"**
4. **Copy your DuckDNS token** (you'll need this later)

---

## Step 2: Keep DuckDNS Updated (Optional - for Dynamic IPs)

If your IP address changes, you need to keep DuckDNS updated:

```bash
# Install DuckDNS updater (runs every 5 minutes)
mkdir -p ~/duckdns
cd ~/duckdns

# Create update script
cat > duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=YOUR_SUBDOMAIN&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

# Make it executable
chmod +x duck.sh

# Add to crontab (updates every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -

# Test it
./duck.sh
cat duck.log  # Should show "OK"
```

**Note**: Replace `YOUR_SUBDOMAIN` with your subdomain (e.g., `mrl-apps`) and `YOUR_TOKEN` with your DuckDNS token.

If you have a **static IP**, you can skip this step since your IP won't change.

---

## Step 3: Install Certbot (Let's Encrypt Client)

```bash
# Update package list
sudo apt update

# Install Certbot and nginx plugin
sudo apt install -y certbot

# Verify installation
certbot --version
```

---

## Step 4: Obtain Let's Encrypt Certificate

**Important**: Before running this, ensure:
- Your DuckDNS domain is pointing to your server's IP
- Ports 80 and 443 are open in your firewall
- No other services are using port 80 (stop nginx container temporarily)

```bash
# Stop nginx container temporarily
cd /home/isaacsim/MRL-apps
docker compose -f containerisation/docker-compose.yml stop nginx

# Obtain certificate
sudo certbot certonly --standalone \
  --preferred-challenges http \
  -d mrl-apps.duckdns.org \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# If successful, certificates are saved to:
# /etc/letsencrypt/live/mrl-apps.duckdns.org/fullchain.pem
# /etc/letsencrypt/live/mrl-apps.duckdns.org/privkey.pem
```

**Replace**:
- `mrl-apps.duckdns.org` with your actual DuckDNS subdomain
- `your-email@example.com` with your email (for renewal notifications)

---

## Step 5: Update Nginx Configuration

Edit `containerisation/nginx/nginx.conf`:

```bash
nano /home/isaacsim/MRL-apps/containerisation/nginx/nginx.conf
```

Update the SSL certificate paths and server name:

```nginx
server {
    listen 80;
    server_name mrl-apps.duckdns.org;  # << YOUR DUCKDNS DOMAIN
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name mrl-apps.duckdns.org;  # << YOUR DUCKDNS DOMAIN
    http2 on;

    # Let's Encrypt SSL Certificates
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # ... rest of configuration stays the same
}
```

---

## Step 6: Update Docker Compose

Edit `containerisation/docker-compose.yml` to mount Let's Encrypt certificates:

```yaml
  nginx:
    build:
      context: ..
      dockerfile: containerisation/nginx/Dockerfile
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Mount Let's Encrypt certificates
      - /etc/letsencrypt/live/mrl-apps.duckdns.org:/etc/nginx/ssl:ro
      # Note: Replace 'mrl-apps.duckdns.org' with your subdomain
    depends_on:
      - backend
```

**Important**: Replace `mrl-apps.duckdns.org` with your actual DuckDNS subdomain!

---

## Step 7: Deploy and Test

```bash
cd /home/isaacsim/MRL-apps

# Rebuild and restart
docker compose -f containerisation/docker-compose.yml down
docker compose -f containerisation/docker-compose.yml up --build -d

# Check nginx logs
docker logs containerisation-nginx-1

# Verify certificate is loaded
docker exec containerisation-nginx-1 ls -la /etc/nginx/ssl
```

**Test your domain**:
```bash
# Should return HTTP 200 and show HTML
curl -I https://mrl-apps.duckdns.org

# Open in browser
https://mrl-apps.duckdns.org
```

You should see a **green padlock** with no warnings!

---

## Step 8: Set Up Automatic Certificate Renewal

Let's Encrypt certificates expire every 90 days. You have two options for automatic renewal:

### Option A: Zero-Downtime Webroot Renewal (Recommended)

This method allows certificates to renew without stopping nginx (zero downtime):

```bash
# Test webroot renewal first
sudo certbot renew --dry-run --webroot --webroot-path /var/www/certbot

# If successful, set up automatic renewal
sudo tee /etc/cron.d/certbot-renew << 'EOF'
# Renew Let's Encrypt certificates twice daily (zero-downtime webroot)
0 0,12 * * * root certbot renew --quiet --webroot --webroot-path /var/www/certbot --post-hook "docker exec containerisation-nginx-1 nginx -s reload"
EOF
```

**Benefits**:
- ✅ Zero service downtime during renewals
- ✅ Just reloads nginx configuration (no container restart)
- ✅ Faster renewal process
- ✅ Lower risk of service interruption

### Option B: Restart Method (Fallback)

If webroot renewal fails, use this reliable restart method:

```bash
# Test restart renewal
sudo certbot renew --dry-run

# Set up automatic renewal with restart
sudo tee /etc/cron.d/certbot-renew << 'EOF'
# Renew Let's Encrypt certificates twice daily (restart method)
0 0,12 * * * root certbot renew --quiet --pre-hook "docker compose -f /home/isaacsim/MRL-apps/containerisation/docker-compose.yml stop nginx" --post-hook "docker compose -f /home/isaacsim/MRL-apps/containerisation/docker-compose.yml start nginx"
EOF
```

**Trade-offs**:
- ⚠️ Brief downtime (30-60 seconds) during renewals
- ✅ Very reliable and works in all scenarios
- ⚠️ Container restart required every 90 days

### Verify Automatic Renewal

```bash
# Check cron job was created
sudo cat /etc/cron.d/certbot-renew

# Check systemd timer status (built-in renewal)
sudo systemctl status certbot.timer

# Test renewal manually (doesn't actually renew unless due)
sudo certbot renew --dry-run
```

**Manual renewal** (if needed):
```bash
# Webroot method
sudo certbot renew --webroot --webroot-path /var/www/certbot

# Or restart method
sudo certbot renew --pre-hook "docker compose -f /home/isaacsim/MRL-apps/containerisation/docker-compose.yml stop nginx" \
                   --post-hook "docker compose -f /home/isaacsim/MRL-apps/containerisation/docker-compose.yml start nginx"
```

---

## Troubleshooting

### Issue: "Certificate not found"
```bash
# Check if certificate was issued
sudo ls -la /etc/letsencrypt/live/

# If missing, re-run certbot
sudo certbot certonly --standalone -d your-subdomain.duckdns.org
```

### Issue: "Port 80 already in use"
```bash
# Stop nginx container
docker compose -f containerisation/docker-compose.yml stop nginx

# Try certbot again
sudo certbot certonly --standalone -d your-subdomain.duckdns.org
```

### Issue: "DNS resolution failed"
```bash
# Check if DuckDNS domain resolves to your IP
nslookup your-subdomain.duckdns.org

# Update DuckDNS IP if needed
curl "https://www.duckdns.org/update?domains=YOUR_SUBDOMAIN&token=YOUR_TOKEN&ip="
```

### Issue: "SSL certificate has wrong name"
- Make sure the domain in nginx.conf matches your DuckDNS subdomain exactly
- Check docker-compose.yml mounts the correct directory

### Issue: "Permission denied" accessing certificates
```bash
# Let's Encrypt certs need specific permissions
sudo chmod 755 /etc/letsencrypt/live/
sudo chmod 755 /etc/letsencrypt/archive/

# Or run nginx container with proper permissions
```

---

## Certificate Renewal Reminders

- Let's Encrypt certificates are valid for **90 days**
- Auto-renewal runs twice daily via cron job (zero downtime webroot method)
- Certbot systemd timer provides additional backup renewal
- You'll get email reminders 20 days before expiration
- Manual renewal: `sudo certbot renew --webroot --webroot-path /var/www/certbot`

---

## Security Notes

✅ **Advantages**:
- Trusted SSL certificates (no browser warnings)
- Free and open-source
- Industry-standard Let's Encrypt

⚠️ **Limitations**:
- Your actual IP is exposed (no DDoS protection)
- No CDN caching
- Certificate valid for only 90 days (but auto-renews)