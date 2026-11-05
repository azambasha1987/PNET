#!/usr/bin/env bash
# ==============================================================================
# Custom-Customization Pillar Deployment Hook (apply-customization.sh)
# Deploys:
#   1. CPU-Optimized Appliance Templates (500+ Intel AVX-512 & AMD Zen definitions)
#   2. Futuristic Cyber-Glass Login Portal & Console Mode Selector
#   3. Platform Branding, Avatars, and Vector Favicons
#   4. Pure Black OLED Dark Theme Engine
#   5. Sliding Session Keepalive Heartbeat Engine (10-Year Resilience)
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
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PNET_HTML="/opt/unetlab/html"

MODE="master"
for arg in "$@"; do
    case "$arg" in
        --satellite|-s) MODE="satellite" ;;
        --master|-m)    MODE="master" ;;
    esac
done

echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${BOLD}   PNetLab Pillar 2: Custom-Customization Application Engine    ${RESET}"
echo -e "   Target Mode: ${BOLD}${MODE^^}${RESET} | Base: ${SCRIPT_DIR}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"

# 1. Customization CLI Tooling Registration
log_info "[1/4] Registering Customization CLI Tools in /usr/local/bin/..."
mkdir -p /usr/local/bin /opt/unetlab/scripts 2>/dev/null || true

# Copy scripts and mcp tools to runtime location
if [ -d "${SCRIPT_DIR}/scripts" ]; then
    cp -rf "${SCRIPT_DIR}/scripts/"* /opt/unetlab/scripts/ 2>/dev/null || true
fi
if [ -d "${SCRIPT_DIR}/mcp" ]; then
    mkdir -p /opt/unetlab/scripts/mcp 2>/dev/null || true
    cp -rf "${SCRIPT_DIR}/mcp/"* /opt/unetlab/scripts/mcp/ 2>/dev/null || true
    ln -sf pnet-mcp.py /opt/unetlab/scripts/mcp/pnetlab-mcp.py 2>/dev/null || true
    ln -sf pnet-mcp.py /opt/unetlab/scripts/mcp/azamlabs-mcp.py 2>/dev/null || true
    ln -sf pnet-mcp.service /opt/unetlab/scripts/mcp/pnetlab-mcp.service 2>/dev/null || true
    ln -sf pnet-mcp.service /opt/unetlab/scripts/mcp/azamlabs-mcp.service 2>/dev/null || true
fi
chmod +x /opt/unetlab/scripts/*.sh /opt/unetlab/scripts/*.py /opt/unetlab/scripts/mcp/*.py 2>/dev/null || true

ln -sf /opt/unetlab/scripts/pnet-dark-theme.sh          /usr/local/bin/pnet-dark
ln -sf /opt/unetlab/scripts/pnet-fix-web-credentials.sh /usr/local/bin/pnet-credentials
ln -sf /opt/unetlab/scripts/pnet-ssl.sh                 /usr/local/bin/pnet-ssl
ln -sf /opt/unetlab/scripts/pnet-ai-copilot.py          /usr/local/bin/pnet-ai
ln -sf /opt/unetlab/scripts/pnet-setup-ollama.sh        /usr/local/bin/pnet-ollama
ln -sf "${SCRIPT_DIR}/apply-customization.sh"           /usr/local/bin/pnet-apply-customization
chmod +x /usr/local/bin/pnet-* 2>/dev/null || true
log_ok "Registered customization CLI commands."

# 2. CPU-Optimized Appliance Templates (Master & Satellite)
log_info "[2/4] Deploying CPU-optimized QEMU appliance templates..."
mkdir -p "${PNET_HTML}/templates/intel" "${PNET_HTML}/templates/amd" 2>/dev/null || true

if [ -d "${SCRIPT_DIR}/templates/intel" ]; then
    cp -rf "${SCRIPT_DIR}/templates/intel/"* "${PNET_HTML}/templates/intel/" 2>/dev/null || true
fi
if [ -d "${SCRIPT_DIR}/templates/amd" ]; then
    cp -rf "${SCRIPT_DIR}/templates/amd/"* "${PNET_HTML}/templates/amd/" 2>/dev/null || true
fi

# Detect host CPU architecture
CPU_VENDOR="intel"
if grep -qi "authenticamd" /proc/cpuinfo 2>/dev/null || lscpu 2>/dev/null | grep -qi "amd"; then
    CPU_VENDOR="amd"
fi
log_info "Detected Host CPU Architecture: ${BOLD}${CPU_VENDOR^^}${RESET}"

if [ -d "${SCRIPT_DIR}/templates/${CPU_VENDOR}" ]; then
    cp -f "${SCRIPT_DIR}/templates/${CPU_VENDOR}/"*.yml "${PNET_HTML}/templates/" 2>/dev/null || true
    log_ok "Applied ${CPU_VENDOR^^} optimized templates into ${PNET_HTML}/templates/"
elif [ -d "${SCRIPT_DIR}/templates/intel" ]; then
    cp -f "${SCRIPT_DIR}/templates/intel/"*.yml "${PNET_HTML}/templates/" 2>/dev/null || true
    log_ok "Applied default Intel templates into ${PNET_HTML}/templates/"
fi

chmod 0644 "${PNET_HTML}/templates/"*.yml "${PNET_HTML}/templates/intel/"*.yml "${PNET_HTML}/templates/amd/"*.yml 2>/dev/null || true
chown -R www-data:www-data "${PNET_HTML}/templates" 2>/dev/null || true

if [ "$MODE" = "satellite" ]; then
    log_ok "Satellite worker node: Appliance templates & customization CLI deployed."
    exit 0
fi

# 3. Futuristic Cyber-Glass Login Portal & Branding
log_info "[3/4] Deploying Cyber-Glass Login Portal and vector branding..."
mkdir -p "${PNET_HTML}/login/img" "/opt/unetlab/data/branding" 2>/dev/null || true

if [ -d "${PNET_HTML}/login" ] && [ ! -d "${PNET_HTML}/login.stock-bak" ]; then
    cp -r "${PNET_HTML}/login" "${PNET_HTML}/login.stock-bak" 2>/dev/null || true
fi

if [ -d "${SCRIPT_DIR}/login-portal" ]; then
    cp -rf "${SCRIPT_DIR}/login-portal/"* "${PNET_HTML}/login/" 2>/dev/null || true
fi

if [ -d "${SCRIPT_DIR}/assets" ]; then
    cp -f "${SCRIPT_DIR}/assets/"* "/opt/unetlab/data/branding/" 2>/dev/null || true
fi

chmod 0644 "${PNET_HTML}/login/"*.html "${PNET_HTML}/login/"*.css "${PNET_HTML}/login/"*.js "${PNET_HTML}/login/img/"* 2>/dev/null || true
chown -R www-data:www-data "${PNET_HTML}/login" 2>/dev/null || true
log_ok "Cyber-Glass login portal deployed with credentials authentication."

# Synchronize default credentials to database (admin / pnet)
if [ "$MODE" = "master" ] && [ -f "${SCRIPT_DIR}/scripts/pnet-fix-web-credentials.sh" ]; then
    log_info "Synchronizing default Web-GUI and database credentials (admin / pnet)..."
    bash "${SCRIPT_DIR}/scripts/pnet-fix-web-credentials.sh" --silent || true
fi

# 4. Session Engine & Keepalive Heartbeat
log_info "[4/4] Deploying sliding session keepalive heartbeat engine..."
mkdir -p "${PNET_HTML}/themes/default/js" 2>/dev/null || true
if [ -f "${SCRIPT_DIR}/session-engine/pnet-keepalive.js" ]; then
    cp -f "${SCRIPT_DIR}/session-engine/pnet-keepalive.js" "${PNET_HTML}/themes/default/js/pnet-keepalive.js"
    chmod 0644 "${PNET_HTML}/themes/default/js/pnet-keepalive.js" 2>/dev/null || true
    
    THEME_INDEX="${PNET_HTML}/themes/default/index.html"
    if [ -f "${THEME_INDEX}" ] && ! grep -q "pnet-keepalive.js" "${THEME_INDEX}"; then
        sed -i "/<\/body>/i <script src=\"/themes/default/js/pnet-keepalive.js\"></script>" "${THEME_INDEX}" 2>/dev/null || true
    fi
    log_ok "Sliding-auth keepalive heartbeat active."
fi

log_ok "Pillar 2: Custom-Customization applied successfully!"
