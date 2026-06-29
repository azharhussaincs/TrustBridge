#!/usr/bin/env bash
# Run on VM 192.168.18.141 — downloads code + DB from your PC and installs everything.
# PC must be running: bash deploy/serve-bundle.sh
set -euo pipefail

PC_IP="${PC_IP:-192.168.18.139}"
BUNDLE_URL="http://${PC_IP}:8888/trustbridge-bundle.tar.gz"
APP_DIR="/opt/TrustBridge"
VM_IP="${VM_IP:-192.168.18.141}"

echo "==> Downloading bundle from ${BUNDLE_URL}..."
sudo mkdir -p /opt
curl -fsSL "$BUNDLE_URL" | sudo tar xzf - -C /opt

echo "==> Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq curl git openssh-server build-essential

sudo systemctl enable --now ssh

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
CLIENT_URL=http://${VM_IP}:3000
MAX_FILE_SIZE=10737418240
UPLOAD_DIR=./uploads
SESSION_TIMEOUT=3600
EOF
fi

echo "==> Frontend install..."
cd "$APP_DIR/frontend"
npm install
echo "NEXT_PUBLIC_BACKEND_PORT=5000" > .env.local
npm run build

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
echo " http://${VM_IP}:3000/admin"
echo "============================================"
pm2 status
