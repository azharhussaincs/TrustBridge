#!/usr/bin/env bash
# Fix DNS on Ubuntu VM — run once: sudo bash fix-dns.sh
set -euo pipefail

IFACE="$(ip route show default | awk '{print $5}' | head -1)"
[[ -z "$IFACE" ]] && IFACE="$(ip -o link show | awk -F': ' '{print $2}' | grep -v lo | head -1)"

cat > /etc/netplan/99-opbridge-dns.yaml <<EOF
network:
  version: 2
  ethernets:
    ${IFACE}:
      dhcp4: true
      nameservers:
        addresses:
          - 192.168.18.1
          - 8.8.8.8
EOF

chmod 600 /etc/netplan/99-opbridge-dns.yaml
netplan apply

echo "DNS fixed on ${IFACE}. Test: ping -c 2 archive.ubuntu.com"
