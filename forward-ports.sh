#!/bin/bash

echo "🔧 Setting up port forwarding for multi-subnet..."

# Get server IP
SERVER_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | grep -v docker | head -1 | awk '{print $2}' | cut -d/ -f1)

echo "🌐 Server IP: $SERVER_IP"

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Add iptables rules to forward traffic between subnets
sudo iptables -t nat -A POSTROUTING -o enp1s0 -j MASQUERADE
sudo iptables -A FORWARD -i enp1s0 -o enp1s0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i enp1s0 -o enp1s0 -j ACCEPT

echo "✅ Port forwarding enabled"
echo "📡 All devices on the network can now access the server"
echo ""
echo "🌐 Access TrustBridge at: http://$SERVER_IP:3000"
