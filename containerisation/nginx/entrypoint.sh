#!/bin/sh
# Require the host-provided certificate before starting nginx.
set -e

SSL_DIR=/etc/nginx/ssl
if [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
    echo "[entrypoint] Missing $SSL_DIR/fullchain.pem or $SSL_DIR/privkey.pem" >&2
    echo "[entrypoint] Create the pilot certificate on the host before starting nginx." >&2
    exit 1
fi

echo "[entrypoint] Using certificate at $SSL_DIR/fullchain.pem"
exec nginx -g 'daemon off;'
