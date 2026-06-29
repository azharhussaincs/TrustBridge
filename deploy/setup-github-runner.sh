#!/usr/bin/env bash
# One-time: register this VM as a GitHub Actions runner for auto-deploy on push.
#
# 1. On GitHub: Repo → Settings → Actions → Runners → New self-hosted runner → Linux
# 2. Copy the registration token from that page
# 3. On VM 192.168.18.141 run:
#      export GITHUB_RUNNER_TOKEN="paste-token-here"
#      bash deploy/setup-github-runner.sh
set -euo pipefail

REPO_URL="${GITHUB_REPO_URL:-https://github.com/azharhussaincs/TrustBridge}"
RUNNER_NAME="${RUNNER_NAME:-opbridge-vm}"
RUNNER_LABELS="${RUNNER_LABELS:-opbridge,self-hosted}"
RUNNER_USER="${RUNNER_USER:-$(whoami)}"
RUNNER_DIR="${RUNNER_DIR:-/home/${RUNNER_USER}/actions-runner}"
RUNNER_VERSION="${RUNNER_VERSION:-2.321.0}"

if [[ -z "${GITHUB_RUNNER_TOKEN:-}" ]]; then
  echo "Set GITHUB_RUNNER_TOKEN from GitHub → Settings → Actions → Runners → New runner"
  exit 1
fi

echo "==> Installing runner for ${REPO_URL} as user ${RUNNER_USER}..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl jq libicu70 2>/dev/null || sudo apt-get install -y -qq curl jq libicu-dev

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [[ ! -f ./config.sh ]]; then
  curl -fsSL -o actions-runner.tar.gz \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf actions-runner.tar.gz
  rm -f actions-runner.tar.gz
fi

./config.sh \
  --url "$REPO_URL" \
  --token "$GITHUB_RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --work "_work" \
  --unattended \
  --replace

sudo ./svc.sh install "$RUNNER_USER"
sudo ./svc.sh start

# Runner must write to /opt/TrustBridge
sudo mkdir -p /opt/TrustBridge
sudo chown -R "${RUNNER_USER}:${RUNNER_USER}" /opt/TrustBridge

echo ""
echo "Runner installed. Push to main branch → auto deploy."
echo "Check: GitHub → Actions tab"
