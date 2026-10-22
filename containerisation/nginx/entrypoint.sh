#!/bin/sh
# Generates a self-signed certificate the first time the container starts,
# then hands control to nginx.
#
# To use your own certificate instead, mount a Docker volume or bind-mount
# containing server.crt and server.key at /etc/nginx/ssl before starting.
#
# For Let's Encrypt certificates, mount /etc/letsencrypt to /etc/letsencrypt.
set -e

SSL_DIR=/etc/nginx/ssl
LETSENCRYPT_DIR=/etc/letsencrypt/live

# Check for Let's Encrypt certificates (DuckDNS) in subdirectories
if [ -d "$LETSENCRYPT_DIR" ] && [ -n "$(ls -A $LETSENCRYPT_DIR 2>/dev/null)" ]; then
    # Find the first domain directory (skip README file)
    DOMAIN_DIR=$(ls -1 $LETSENCRYPT_DIR | grep -v "README" | head -1)
    if [ -n "$DOMAIN_DIR" ] && [ -f "$LETSENCRYPT_DIR/$DOMAIN_DIR/fullchain.pem" ] && [ -f "$LETSENCRYPT_DIR/$DOMAIN_DIR/privkey.pem" ]; then
        echo "[entrypoint] Using Let's Encrypt certificate at $LETSENCRYPT_DIR/$DOMAIN_DIR/"
        exec nginx -g 'daemon off;'
    fi
fi

# Check for Let's Encrypt certificates in /etc/nginx/ssl
if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
    echo "[entrypoint] Using existing SSL certificate at $SSL_DIR/fullchain.pem"
# Then check for Cloudflare Origin certificates
elif [ -f "$SSL_DIR/cloudflare-origin.crt" ] && [ -f "$SSL_DIR/cloudflare-origin.key" ]; then
    echo "[entrypoint] Using existing SSL certificate at $SSL_DIR/cloudflare-origin.crt"
# Finally check for custom certificates
elif [ -f "$SSL_DIR/server.crt" ] && [ -f "$SSL_DIR/server.key" ]; then
    echo "[entrypoint] Using existing SSL certificate at $SSL_DIR/server.crt"
# If none found, generate self-signed certificate
else
    echo "[entrypoint] Generating self-signed SSL certificate..."
    mkdir -p "$SSL_DIR"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/server.key" \
        -out    "$SSL_DIR/server.crt" \
        -subj   "/CN=localhost/O=MRL/C=US" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
    echo "[entrypoint] Certificate written to $SSL_DIR/server.crt"
fi

exec nginx -g 'daemon off;'
