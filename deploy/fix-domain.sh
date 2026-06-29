#!/usr/bin/env bash
# Fix opbridge.serveftp.com — run: sudo bash deploy/fix-domain.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="opbridge.serveftp.com"
PUBLIC_IP="$(curl -4 -s --max-time 5 ifconfig.me || true)"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/fix-domain.sh"
  exit 1
fi

echo "==> Your public IPv4: ${PUBLIC_IP:-unknown}"
echo "    DDNS ${DOMAIN} must point to this IP (NOT 192.168.x.x)"
echo ""

echo "==> Installing HTTP nginx config for ${DOMAIN}..."
cp "$REPO_ROOT/deploy/nginx-opbridge-http.conf" /etc/nginx/sites-available/opbridge
ln -sf /etc/nginx/sites-available/opbridge /etc/nginx/sites-enabled/opbridge
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Testing local nginx..."
curl -sI -H "Host: ${DOMAIN}" http://127.0.0.1/ | head -3

if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  echo "==> SSL cert found — enabling HTTPS on port 443..."
  cp "$REPO_ROOT/deploy/nginx-opbridge.conf" /etc/nginx/sites-available/opbridge
  nginx -t
  systemctl reload nginx
else
  echo ""
  echo "No SSL certificate yet. For HTTPS run:"
  echo "  sudo bash deploy/setup-https.sh"
  echo ""
  echo "Until then use: http://${DOMAIN}/admin"
fi

echo ""
echo "Done. Checklist:"
echo "  1. DDNS panel: set ${DOMAIN} -> ${PUBLIC_IP:-YOUR_PUBLIC_IP}"
echo "  2. Router: forward WAN 80  -> 192.168.18.139:80"
echo "  3. Router: forward WAN 443 -> 192.168.18.139:443  (after SSL setup)"
echo "  4. Restart frontend: cd frontend && npm run dev:clean"
