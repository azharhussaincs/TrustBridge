#!/usr/bin/env bash
# Production deploy — used by GitHub Actions and manual re-deploys.
#   bash deploy/ci-deploy.sh
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="${APP_DIR:-/opt/TrustBridge}"
VM_IP="${VM_IP:-192.168.18.141}"

echo "==> Syncing code to ${APP_DIR}..."
mkdir -p "$APP_DIR"
SOURCE_REAL="$(cd "${SOURCE_DIR}" && pwd)"
APP_REAL="$(cd "${APP_DIR}" && pwd)"
if [[ "${SOURCE_REAL}" != "${APP_REAL}" ]]; then
  rsync -a --delete \
    --exclude node_modules \
    --exclude .next \
    --exclude backend/uploads \
    --exclude backend/.env \
    --exclude backend/prisma/dev.db \
    --exclude frontend/.env.local \
    --exclude .git \
    "${SOURCE_REAL}/" "${APP_REAL}/"
else
  echo "    (already in ${APP_DIR}, skipping sync)"
fi

echo "==> Backend..."
cd "${APP_DIR}/backend"
npm ci
npx prisma generate
npx prisma migrate deploy

if [[ ! -f .env ]]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  ENC_KEY="$(openssl rand -hex 16)"
  cat > .env <<EOF
PORT=5000
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
  npm run seed || true
fi

echo "==> Frontend..."
cd "${APP_DIR}/frontend"
npm ci
[[ -f .env.local ]] || echo "NEXT_PUBLIC_BACKEND_PORT=5000" > .env.local
npm run build

echo "==> Restarting PM2..."
cd "${APP_DIR}/backend"
if pm2 describe opbridge-api >/dev/null 2>&1; then
  pm2 restart opbridge-api
else
  pm2 start npm --name opbridge-api -- run start
fi

cd "${APP_DIR}/frontend"
if pm2 describe opbridge-web >/dev/null 2>&1; then
  pm2 restart opbridge-web
else
  pm2 start npm --name opbridge-web -- run start
fi

pm2 save

echo ""
echo "Deploy complete: http://${VM_IP}:3000/admin"
