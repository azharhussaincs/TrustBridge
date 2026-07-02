#!/usr/bin/env bash
# Fix VM static IP + DNS (Ubuntu 24.04 netplan) — run: sudo bash fix-netplan.sh
set -euo pipefail
VM_IP="${VM_IP:-192.168.18.141}"
IFACE="$(ip route show default | awk '{print $5}' | head -1)"
[[ -z "$IFACE" ]] && IFACE="$(ip -o link show | awk -F': ' '{print $2}' | grep -v lo | head -1)"
echo "Using interface: $IFACE, static IP: $VM_IP"
rm -f /etc/netplan/99-opbridge-dns.yaml
tee /etc/netplan/99-opbridge-static.yaml >/dev/null <<EOF
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
chmod 600 /etc/netplan/99-opbridge-static.yaml
netplan apply
sleep 2
ip -br a
echo "Test DNS:"
ping -c 2 archive.ubuntu.com && echo "DNS OK" || echo "DNS still broken — ask IT to fix VM network in Proxmox"
