#!/usr/bin/env bash
# Run on YOUR PC — packages code + database + uploads, serves to VM.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="/tmp/trustbridge-bundle.tar.gz"
PC_IP="$(hostname -I | awk '{print $1}')"
PORT=8888

echo "==> Creating bundle (code + dev.db + uploads + .env)..."
tar czf "$BUNDLE" \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  -C "$(dirname "$REPO_ROOT")" "$(basename "$REPO_ROOT")"

cp "$REPO_ROOT/deploy/vm-bootstrap.sh" /tmp/vm-bootstrap.sh
chmod +x /tmp/vm-bootstrap.sh

echo "==> Bundle size: $(du -h "$BUNDLE" | cut -f1)"
echo "==> Starting HTTP server on http://${PC_IP}:${PORT}"
echo ""
echo "================================================"
echo " NOW paste this ONE command in VM console:"
echo "================================================"
echo ""
echo "curl -fsSL http://${PC_IP}:${PORT}/vm-bootstrap.sh | bash"
echo ""
echo "================================================"
echo " Press Ctrl+C to stop server when VM install finishes"
echo "================================================"

cd /tmp
python3 -m http.server "$PORT" --bind 0.0.0.0
