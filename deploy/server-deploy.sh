#!/usr/bin/env bash
# Run ON the server VM (192.168.18.141) — not on your dev PC.
# Pulls latest code from GitHub and deploys with PM2.
#
#   bash deploy/server-deploy.sh
#
# First-time on a fresh VM:
#   sudo mkdir -p /opt && sudo chown $USER:$USER /opt
#   git clone https://github.com/azharhussaincs/TrustBridge.git /opt/TrustBridge
#   cd /opt/TrustBridge && bash deploy/server-deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/TrustBridge}"
VM_IP="${VM_IP:-192.168.18.141}"
REPO_URL="${REPO_URL:-https://github.com/azharhussaincs/TrustBridge.git}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "==> Cloning into ${APP_DIR}..."
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"
echo "==> Pulling latest from main..."
git fetch origin main
git reset --hard origin/main

echo "==> Deploying..."
APP_DIR="${APP_DIR}" VM_IP="${VM_IP}" bash deploy/ci-deploy.sh

echo ""
echo "Server ready: http://${VM_IP}:3000/login"
