#!/usr/bin/env bash
# Copy TrustBridge from this PC to VM and install. Run on your desktop.
# Usage: bash deploy/deploy-to-vm.sh [vm-user]
set -euo pipefail

VM_IP="192.168.18.141"
VM_USER="${1:-admin}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Copying project to ${VM_USER}@${VM_IP}..."
ssh "${VM_USER}@${VM_IP}" "sudo mkdir -p /opt && sudo chown ${VM_USER}:${VM_USER} /opt"
rsync -avz --exclude node_modules --exclude .next --exclude backend/uploads \
  "${REPO_ROOT}/" "${VM_USER}@${VM_IP}:/opt/TrustBridge/"

echo "==> Running install on VM..."
ssh -t "${VM_USER}@${VM_IP}" "sudo bash /opt/TrustBridge/deploy/vm-install.sh"

echo ""
echo "Everyone on the LAN can open:"
echo "  http://${VM_IP}:3000/admin"
