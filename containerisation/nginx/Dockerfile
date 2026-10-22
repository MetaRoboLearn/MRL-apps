# Build context: project root (set via docker-compose)
# ── Stage 1: build the React / Vite frontend ────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /frontend

# Install dependencies first (better layer caching)
COPY gui/package.json gui/package-lock.json ./
RUN npm ci

# The API is always reached through the nginx reverse-proxy at /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY gui/ .
RUN npm run build

# ── Stage 2: nginx serving static files + reverse-proxy ─────────────────────
FROM nginx:alpine

# openssl is needed to auto-generate a self-signed certificate on first start
RUN apk add --no-cache openssl

# Copy compiled frontend assets
COPY --from=frontend-build /frontend/dist /usr/share/nginx/html

# nginx configuration
COPY containerisation/nginx/nginx.conf /etc/nginx/nginx.conf

# Entrypoint: generates the SSL cert when missing, then starts nginx
COPY containerisation/nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
