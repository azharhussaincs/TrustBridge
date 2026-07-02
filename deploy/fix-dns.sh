#!/usr/bin/env bash
# Fix static IP + DNS on Ubuntu VM — run once: sudo bash fix-dns.sh
set -euo pipefail

VM_IP="${VM_IP:-192.168.18.141}"
IFACE="$(ip route show default | awk '{print $5}' | head -1)"
[[ -z "$IFACE" ]] && IFACE="$(ip -o link show | awk -F': ' '{print $2}' | grep -v lo | head -1)"

rm -f /etc/netplan/99-opbridge-dns.yaml
cat > /etc/netplan/99-opbridge-static.yaml <<EOF
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

echo "Static IP ${VM_IP} set on ${IFACE}. Test: ping -c 2 archive.ubuntu.com"
