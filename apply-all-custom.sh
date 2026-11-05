#!/usr/bin/env bash
# ==============================================================================
# PNetLab Unified Tri-Pillar Master Application Engine (apply-all-custom.sh)
#
# Automatically orchestrates all three enterprise pillars in dependency order:
#   1. Pillar 3: Custom-Performance   (Ultra-KSM, cgroups v2, CPU governor, dataplane)
#   2. Pillar 2: Custom-Customization (500+ templates, Cyber-Glass login, branding)
#   3. Pillar 1: Custom-Features      (Web-UI docked console, syntax engine, API daemon)
#
# Automatically executed on:
#   - Master Installation (install-master.sh)
#   - Satellite Installation (install-satellite.sh)
#   - Every Upstream Version Upgrade (pnet-update)
#   - Standalone Re-Application (sudo pnet-apply-all or sudo bash apply-all-custom.sh)
# ==============================================================================
set -euo pipefail

GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
CYAN='\033[1;36m'
RESET='\033[0m'
BOLD='\033[1m'

log_info() { echo -e "${CYAN}[*]${RESET} $*"; }
log_ok()   { echo -e "${GREEN}[✔]${RESET} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${RESET} $*"; }
log_err()  { echo -e "${RED}[✘]${RESET} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="master"

for arg in "$@"; do
    case "$arg" in
        --satellite|-s) MODE="satellite" ;;
        --master|-m)    MODE="master" ;;
    esac
done

echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${BOLD}   PNetLab Unified Master Application Engine (Tri-Pillar)       ${RESET}"
echo -e "   Target Mode: ${BOLD}${MODE^^}${RESET} | Base Repository: ${SCRIPT_DIR}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"

# ── 0. Core Permissions and Symlinks Standardization ─────────────────────────
mkdir -p /usr/local/bin /opt/unetlab/scripts 2>/dev/null || true

# Copy all scripts from scripts/ to /opt/unetlab/scripts/
if [ -d "${SCRIPT_DIR}/scripts" ]; then
    cp -rf "${SCRIPT_DIR}/scripts/"* /opt/unetlab/scripts/ 2>/dev/null || true
fi

# Remove legacy dual commands
rm -f /usr/local/bin/azam-* /usr/local/bin/azambasha-* /usr/local/bin/apply-heavy-node-optimizer 2>/dev/null || true

# Link core cluster management commands
ln -sf /opt/unetlab/scripts/pnet-update.sh              /usr/local/bin/pnet-update
ln -sf /opt/unetlab/scripts/pnet-quarterly-audit.sh     /usr/local/bin/pnet-audit
ln -sf /opt/unetlab/scripts/pnet-health-check.sh        /usr/local/bin/pnet-health
ln -sf /opt/unetlab/scripts/pnet-lab-backup.sh         /usr/local/bin/pnet-backup
ln -sf /opt/unetlab/scripts/pnet-lab-backup.sh         /usr/local/bin/pnet-restore
ln -sf /opt/unetlab/scripts/pnet-housekeeping.sh        /usr/local/bin/pnet-clean
ln -sf /opt/unetlab/scripts/pnet-apt-guard.sh           /usr/local/bin/pnet-apt-guard
ln -sf /opt/unetlab/scripts/pnet-apply-all-fixes.sh     /usr/local/bin/pnet-menu
ln -sf /opt/unetlab/scripts/pnet-apply-all-fixes.sh     /usr/local/bin/pnet-fix
ln -sf /opt/unetlab/scripts/pnet-fix-cluster.sh         /usr/local/bin/pnet-cluster
ln -sf /opt/unetlab/scripts/pnet-satellite-join.sh      /usr/local/bin/pnet-satellite-join
ln -sf /opt/unetlab/scripts/pnet-mod.sh                 /usr/local/bin/pnet-mod
ln -sf /opt/unetlab/scripts/pnet-ai-copilot.py          /usr/local/bin/pnet-ai
ln -sf /opt/unetlab/scripts/pnet-setup-ollama.sh        /usr/local/bin/pnet-ollama
ln -sf /opt/unetlab/scripts/pnet-release-ingestion-engine.py /usr/local/bin/pnet-release-engine
ln -sf /opt/unetlab/scripts/pnet-ingest-release.sh     /usr/local/bin/pnet-ingest-release
ln -sf "${SCRIPT_DIR}/apply-all-custom.sh"              /usr/local/bin/pnet-apply-all
chmod +x /usr/local/bin/pnet-* /opt/unetlab/scripts/*.sh /opt/unetlab/scripts/*.py 2>/dev/null || true

# Provide backward compatibility for any external scripts expecting legacy azambasha-* or azamlabs-* names
for pnet_tool in /opt/unetlab/scripts/pnet-*.sh /opt/unetlab/scripts/pnet-*.py; do
    [ -f "$pnet_tool" ] || continue
    t_base="$(basename "$pnet_tool")"
    suffix="${t_base#pnet-}"
    for legacy_prefix in "azambasha-" "azamlabs-" "azam-"; do
        old_name="/opt/unetlab/scripts/${legacy_prefix}${suffix}"
        [ ! -e "$old_name" ] && ln -sf "$pnet_tool" "$old_name" 2>/dev/null || true
    done
done

# ── 1. Execute Pillar 3: Custom-Performance ──────────────────────────────────
PERF_HOOK="${SCRIPT_DIR}/Custom-Performance/apply-performance.sh"
[ -f "$PERF_HOOK" ] || PERF_HOOK="/opt/pnet/Custom-Performance/apply-performance.sh"
if [ -f "$PERF_HOOK" ]; then
    log_info "Step 1/3: Applying Pillar 3 (Custom-Performance)..."
    bash "$PERF_HOOK" "--${MODE}" || true
else
    log_warn "Custom-Performance hook not found at $PERF_HOOK"
fi

# ── 2. Execute Pillar 2: Custom-Customization ────────────────────────────────
CUST_HOOK="${SCRIPT_DIR}/Custom-Customization/apply-customization.sh"
[ -f "$CUST_HOOK" ] || CUST_HOOK="/opt/pnet/Custom-Customization/apply-customization.sh"
if [ -f "$CUST_HOOK" ]; then
    log_info "Step 2/3: Applying Pillar 2 (Custom-Customization)..."
    bash "$CUST_HOOK" "--${MODE}" || true
else
    log_warn "Custom-Customization hook not found at $CUST_HOOK"
fi

# ── 3. Execute Pillar 1: Custom-Features ─────────────────────────────────────
FEAT_HOOK="${SCRIPT_DIR}/Custom-Features/apply-features.sh"
[ -f "$FEAT_HOOK" ] || FEAT_HOOK="/opt/pnet/Custom-Features/apply-features.sh"
if [ -f "$FEAT_HOOK" ]; then
    log_info "Step 3/3: Applying Pillar 1 (Custom-Features)..."
    bash "$FEAT_HOOK" "--${MODE}" || true
else
    log_warn "Custom-Features hook not found at $FEAT_HOOK"
fi

# ── 4. Final System Permissions & Daemon Reload ──────────────────────────────
if [ -f "/opt/unetlab/scripts/pnet-fix-permissions.sh" ]; then
    bash /opt/unetlab/scripts/pnet-fix-permissions.sh 2>/dev/null || true
elif [ -f "/opt/unetlab/scripts/azambasha-fix-permissions.sh" ]; then
    bash /opt/unetlab/scripts/azambasha-fix-permissions.sh 2>/dev/null || true
fi

systemctl daemon-reload 2>/dev/null || true
if [ "$MODE" = "master" ] && systemctl is-active --quiet apache2 2>/dev/null; then
    apache2ctl configtest 2>&1 | grep -v "^Syntax OK" || true
    systemctl reload apache2 2>/dev/null || true
fi

echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${GREEN}${BOLD}   All Three Pillars Successfully Applied & Synchronized!       ${RESET}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"
