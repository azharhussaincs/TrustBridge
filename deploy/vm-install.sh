#!/usr/bin/env bash
# Install OpBridge / TrustBridge on VM — no nginx, direct ports 3000 + 5000
# Run on the VM: sudo bash deploy/vm-install.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/TrustBridge}"
VM_IP="${VM_IP:-192.168.18.141}"
NODE_MAJOR="${NODE_MAJOR:-20}"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/vm-install.sh"
  exit 1
fi

echo "==> Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git openssh-server build-essential

systemctl enable --now ssh

if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]]; then
  echo "==> Installing Node.js ${NODE_MAJOR}..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null; then
  echo "==> Installing PM2..."
  npm install -g pm2
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "==> Cloning TrustBridge to ${APP_DIR}..."
  git clone https://github.com/azharhussaincs/TrustBridge.git "$APP_DIR"
fi

cd "$APP_DIR"

echo "==> Installing backend dependencies..."
cd "$APP_DIR/backend"
npm install
npx prisma generate
npx prisma migrate deploy

if [[ ! -f .env ]]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  ENC_KEY="$(openssl rand -hex 16)"
  cat > .env <<EOF
PORT=5000
HOST=127.0.0.1
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=7d
ENCRYPTION_KEY=${ENC_KEY}
DATABASE_URL="sqlite:./dev.db"
CLIENT_URL=http://${VM_IP}:3000
MAX_FILE_SIZE=10737418240
UPLOAD_DIR=./uploads
SESSION_TIMEOUT=3600
EOF
  echo "==> Created backend/.env with new secrets"
fi

if [[ ! -f prisma/dev.db ]] || [[ "$(sqlite3 prisma/dev.db 'SELECT COUNT(*) FROM User;' 2>/dev/null || echo 0)" == "0" ]]; then
  echo "==> Seeding demo users (password: admin123)..."
  npm run seed || true
fi

echo "==> Installing frontend dependencies..."
cd "$APP_DIR/frontend"
npm install
cat > .env.local <<EOF
NEXT_PUBLIC_BACKEND_PORT=5000
EOF

echo "==> Building frontend..."
npm run build

echo "==> Starting services with PM2..."
cd "$APP_DIR/backend"
pm2 delete opbridge-api 2>/dev/null || true
pm2 start npm --name opbridge-api -- run start

cd "$APP_DIR/frontend"
pm2 delete opbridge-web 2>/dev/null || true
pm2 start npm --name opbridge-web -- run start

pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "${SUDO_USER:-root}" --hp "/home/${SUDO_USER:-root}" 2>/dev/null || pm2 startup

echo ""
echo "============================================"
echo " OpBridge deployed (no nginx)"
echo "============================================"
echo "  Share this URL with everyone on the LAN:"
echo "  App:   http://${VM_IP}:3000/admin"
echo "  Login: admin / admin123"
echo ""
echo "  pm2 status | pm2 logs opbridge-api | pm2 logs opbridge-web"
echo ""
echo "  CI/CD: set up GitHub runner once, then push to main auto-deploys:"
echo "    export GITHUB_RUNNER_TOKEN=<from GitHub repo Settings → Actions → Runners>"
echo "    bash deploy/setup-github-runner.sh"
echo "============================================"
