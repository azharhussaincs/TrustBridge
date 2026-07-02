#!/usr/bin/env bash
# Run on VM 192.168.18.141 — downloads code + DB from your PC and installs everything.
# PC must be running: bash deploy/serve-bundle.sh
set -euo pipefail

PC_IP="${PC_IP:-192.168.18.139}"
BUNDLE_URL="http://${PC_IP}:8888/trustbridge-bundle.tar.gz"
APP_DIR="/opt/TrustBridge"
VM_IP="${VM_IP:-192.168.18.141}"

fix_dns() {
  echo "==> Setting static IP ${VM_IP} + DNS..."
  IFACE="$(ip route show default | awk '{print $5}' | head -1)"
  [[ -z "$IFACE" ]] && IFACE="$(ip -o link show | awk -F': ' '{print $2}' | grep -v lo | head -1)"
  sudo rm -f /etc/netplan/99-opbridge-dns.yaml
  sudo tee /etc/netplan/99-opbridge-static.yaml >/dev/null <<EOF
network:
  version: 2
  ethernets:
    ${IFACE}:
      dhcp4: false
      addresses:
        - ${VM_IP}/24
      routes:
        - to: default
          via: 192.168.18.1
      nameservers:
        addresses:
          - 192.168.18.1
          - 8.8.8.8
EOF
  sudo chmod 600 /etc/netplan/99-opbridge-static.yaml
  sudo netplan apply
  echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf >/dev/null
  sleep 2
  ping -c 1 archive.ubuntu.com || echo "WARN: DNS may still be broken — ask IT to fix VM network"
}

fix_dns

download_file() {
  local url="$1" dest="$2"
  if command -v curl >/dev/null; then
    curl -fsSL "$url" -o "$dest"
  elif python3 -c "import urllib.request" 2>/dev/null; then
    python3 -c "import urllib.request; urllib.request.urlretrieve('$url', '$dest')"
  else
    echo "Need curl or python3 to download. Run: sudo apt install -y curl"
    exit 1
  fi
}

echo "==> Downloading bundle from ${BUNDLE_URL}..."
sudo mkdir -p /opt
download_file "$BUNDLE_URL" /tmp/trustbridge-bundle.tar.gz
sudo tar xzf /tmp/trustbridge-bundle.tar.gz -C /opt

echo "==> Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq curl git openssh-server build-essential nginx

sudo systemctl enable --now ssh nginx

if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "==> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null; then
  sudo npm install -g pm2
fi

cd "$APP_DIR"
sudo chown -R "$(whoami):$(whoami)" "$APP_DIR"

echo "==> Backend install..."
cd "$APP_DIR/backend"
npm install
npx prisma generate
npx prisma migrate deploy

if [[ ! -f .env ]]; then
  cat > .env <<EOF
PORT=5000
NODE_ENV=production
JWT_SECRET=TrustBridge_Super_Secret_Key_2026_Change_This
JWT_EXPIRE=7d
ENCRYPTION_KEY=TrustBridge_AES256_Key_32Bytes_12345
DATABASE_URL="sqlite:./dev.db"
CLIENT_URL=http://${VM_IP}
UPLOAD_DIR=./uploads
SESSION_TIMEOUT=3600
EOF
fi

echo "==> Frontend install..."
cd "$APP_DIR/frontend"
npm install
echo "NEXT_PUBLIC_BACKEND_PORT=5000" > .env.local
npm run build

echo "==> Nginx on port 80..."
sudo cp "$APP_DIR/deploy/nginx-vm.conf" /etc/nginx/sites-available/opbridge
sudo ln -sf /etc/nginx/sites-available/opbridge /etc/nginx/sites-enabled/opbridge
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> Starting PM2..."
cd "$APP_DIR/backend"
pm2 delete opbridge-api 2>/dev/null || true
pm2 start npm --name opbridge-api -- run start

cd "$APP_DIR/frontend"
pm2 delete opbridge-web 2>/dev/null || true
pm2 start npm --name opbridge-web -- run start

pm2 save
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null || true

echo ""
echo "============================================"
echo " DONE — OpBridge is running"
echo " http://${VM_IP}/admin"
echo " (port 80 — no :3000 needed)"
echo "============================================"
pm2 status
