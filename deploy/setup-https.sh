#!/usr/bin/env bash
# Obtain a free Let's Encrypt certificate and enable HTTPS on port 443.
# Run from the TrustBridge repo root:
#   sudo bash deploy/setup-https.sh
set -euo pipefail

DOMAIN="opbridge.serveftp.com"
EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN}}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/setup-https.sh"
  exit 1
fi

echo "==> Installing certbot (if needed)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx nginx

echo "==> Preparing webroot for ACME challenge..."
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

echo "==> Installing temporary HTTP nginx config..."
cp "$REPO_ROOT/deploy/nginx-opbridge-http.conf" /etc/nginx/sites-available/opbridge
ln -sf /etc/nginx/sites-available/opbridge /etc/nginx/sites-enabled/opbridge
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Requesting SSL certificate for ${DOMAIN}..."
if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive
fi

echo "==> Installing Let's Encrypt nginx TLS snippets (if missing)..."
if [[ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
  curl -fsSL \
    https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o /etc/letsencrypt/options-ssl-nginx.conf
fi
if [[ ! -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

echo "==> Installing HTTPS nginx config (port 443)..."
cp "$REPO_ROOT/deploy/nginx-opbridge.conf" /etc/nginx/sites-available/opbridge
nginx -t
systemctl reload nginx

echo "==> Enabling automatic certificate renewal..."
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

echo ""
echo "Done! Open: https://${DOMAIN}/admin"
echo ""
echo "Router port forwards required:"
echo "  WAN 80  -> this PC port 80"
echo "  WAN 443 -> this PC port 443"
echo ""
echo "Restart the frontend so it picks up HTTPS settings:"
echo "  cd frontend && npm run dev:clean"
