#!/usr/bin/env bash
# Start the OpBridge VM via Proxmox API (when VM is stopped).
# Do NOT put passwords in this file — pass them as environment variables only.
#
#   export PROXMOX_HOST=192.168.18.9
#   export PROXMOX_USER=azhar@pam
#   export PROXMOX_PASS='your-proxmox-password'
#   export PROXMOX_VMID=100          # optional — auto-detected if omitted
#   bash deploy/proxmox-start-vm.sh
set -euo pipefail

PROXMOX_HOST="${PROXMOX_HOST:-192.168.18.9}"
PROXMOX_PORT="${PROXMOX_PORT:-8006}"
PROXMOX_USER="${PROXMOX_USER:?Set PROXMOX_USER e.g. azhar@pam}"
PROXMOX_PASS="${PROXMOX_PASS:?Set PROXMOX_PASS}"
PROXMOX_VMID="${PROXMOX_VMID:-}"
VM_IP="${VM_IP:-192.168.18.141}"
BASE="https://${PROXMOX_HOST}:${PROXMOX_PORT}/api2/json"

echo "==> Logging in to Proxmox ${PROXMOX_HOST}..."
AUTH_JSON="$(curl -sk --max-time 15 \
  -d "username=${PROXMOX_USER}&password=${PROXMOX_PASS}" \
  "${BASE}/access/ticket")"

TICKET="$(echo "$AUTH_JSON" | jq -r '.data.ticket // empty')"
CSRF="$(echo "$AUTH_JSON" | jq -r '.data.CSRFPreventionToken // empty')"

if [[ -z "$TICKET" || "$TICKET" == "null" ]]; then
  echo "Proxmox login failed. Check host, username, password, and network."
  echo "$AUTH_JSON" | jq -r '.data // .errors // .' 2>/dev/null || echo "$AUTH_JSON"
  exit 1
fi

HDR=(-H "Cookie: PVEAuthCookie=${TICKET}" -H "CSRFPreventionToken: ${CSRF}")

pick_vmid() {
  if [[ -n "$PROXMOX_VMID" ]]; then
    echo "$PROXMOX_VMID"
    return
  fi
  echo "==> Looking for VM (name contains opbridge/trustbridge or IP ${VM_IP})..."
  NODES="$(curl -sk "${HDR[@]}" "${BASE}/nodes" | jq -r '.data[].node')"
  for NODE in $NODES; do
    VMS="$(curl -sk "${HDR[@]}" "${BASE}/nodes/${NODE}/qemu" | jq -r '.data[] | "\(.vmid)\t\(.name)\t\(.status)"')"
    while IFS=$'\t' read -r VMID NAME STATUS; do
      [[ -z "$VMID" ]] && continue
      LNAME="$(echo "$NAME" | tr '[:upper:]' '[:lower:]')"
      if [[ "$LNAME" == *opbridge* || "$LNAME" == *trustbridge* ]]; then
        echo "$VMID"
        return
      fi
    done <<< "$VMS"
  done
  echo "Set PROXMOX_VMID manually (Proxmox UI → VM → ID in summary)." >&2
  exit 1
}

VMID="$(pick_vmid)"
NODE="$(curl -sk "${HDR[@]}" "${BASE}/nodes" | jq -r '.data[0].node')"
STATUS="$(curl -sk "${HDR[@]}" "${BASE}/nodes/${NODE}/qemu/${VMID}/status/current" | jq -r '.data.status')"

echo "==> VM ${VMID} on node ${NODE}: status=${STATUS}"

if [[ "$STATUS" == "running" ]]; then
  echo "VM already running."
else
  echo "==> Starting VM ${VMID}..."
  curl -sk -X POST "${HDR[@]}" "${BASE}/nodes/${NODE}/qemu/${VMID}/status/start" >/dev/null
  echo "Waiting for VM to boot..."
  for i in $(seq 1 30); do
    sleep 5
    STATUS="$(curl -sk "${HDR[@]}" "${BASE}/nodes/${NODE}/qemu/${VMID}/status/current" | jq -r '.data.status')"
    [[ "$STATUS" == "running" ]] && break
  done
fi

echo ""
echo "VM should be up. Wait ~1 min, then on the VM run:"
echo "  ssh admin@${VM_IP}"
echo "  cd /opt/TrustBridge && bash deploy/server-deploy.sh"
echo ""
echo "Start GitHub runner (for CI/CD queue):"
echo "  cd ~/actions-runner && sudo ./svc.sh start"
