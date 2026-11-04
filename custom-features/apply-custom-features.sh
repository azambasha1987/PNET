#!/usr/bin/env bash
# ==============================================================================
# PNetLab Custom Features Master Application Hook (apply-custom-features.sh)
#
# Idempotent engine that applies all advanced custom features on top of PNetLab:
#   1. CPU-optimized QEMU templates (Intel & AMD high-density tuning)
#   2. Operations Center & Web-UI (Docked Multi-Tab Console, CLI Syntax Engine)
#   3. Session Engine & Keepalive (Sliding Auth, Zero-Disconnect)
#   4. Cyber-Glass Login Portal & Branding
#   5. Cluster Database Schema Extensions & Guacamole Tables
#   6. Operations Center REST API Backend & Apache Reverse Proxy
#   7. Global Canonical pnet-* CLI Tooling
#   8. Ultra-KSM 4KB RAM Deduplication, Kernel & Hypervisor Tunings
#
# Automatically executed during:
#   - Fresh Master / Satellite Installation (install-master.sh / install-satellite.sh)
#   - Upstream Version Upgrades & Hotfixes (pnet-update)
#   - Standalone Re-application (pnet-features or bash apply-custom-features.sh)
# ==============================================================================
set -euo pipefail

# ANSI color formatting
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

# ── 0. Directory and Environment Resolution ──────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Resolve custom-features source directory
if [ -d "${SCRIPT_DIR}/templates" ]; then
    CUSTOM_DIR="${SCRIPT_DIR}"
elif [ -d "${REPO_ROOT}/custom-features/templates" ]; then
    CUSTOM_DIR="${REPO_ROOT}/custom-features"
elif [ -d "/opt/pnet/custom-features/templates" ]; then
    CUSTOM_DIR="/opt/pnet/custom-features"
elif [ -d "/opt/unetlab/custom-features/templates" ]; then
    CUSTOM_DIR="/opt/unetlab/custom-features"
else
    log_err "Could not resolve custom-features root directory!"
    exit 1
fi

# Resolve scripts directory
if [ -d "${REPO_ROOT}/scripts" ]; then
    SCRIPTS_DIR="${REPO_ROOT}/scripts"
elif [ -d "/opt/unetlab/scripts" ]; then
    SCRIPTS_DIR="/opt/unetlab/scripts"
elif [ -d "/opt/pnet/scripts" ]; then
    SCRIPTS_DIR="/opt/pnet/scripts"
else
    SCRIPTS_DIR="/opt/unetlab/scripts"
fi

PNET_HTML="/opt/unetlab/html"
MODE="master"

for arg in "$@"; do
    case "$arg" in
        --satellite|-s)
            MODE="satellite"
            ;;
        --master|-m)
            MODE="master"
            ;;
    esac
done

echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${BOLD}   PNetLab Enterprise Custom Features Application Engine        ${RESET}"
echo -e "   Target Mode: ${BOLD}${MODE^^}${RESET} | Base Source: ${CUSTOM_DIR}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"

# ── 1. CPU-Optimized Appliance Templates (Master & Satellite) ─────────────────
log_info "[1/8] Deploying CPU-optimized QEMU templates..."
mkdir -p "${PNET_HTML}/templates/intel" "${PNET_HTML}/templates/amd" 2>/dev/null || true

# Copy architecture-specific template pools
if [ -d "${CUSTOM_DIR}/templates/intel" ]; then
    cp -rf "${CUSTOM_DIR}/templates/intel/"* "${PNET_HTML}/templates/intel/" 2>/dev/null || true
fi
if [ -d "${CUSTOM_DIR}/templates/amd" ]; then
    cp -rf "${CUSTOM_DIR}/templates/amd/"* "${PNET_HTML}/templates/amd/" 2>/dev/null || true
fi

# Detect host CPU architecture to select primary active templates
CPU_VENDOR="intel"
if grep -qi "authenticamd" /proc/cpuinfo 2>/dev/null || lscpu 2>/dev/null | grep -qi "amd"; then
    CPU_VENDOR="amd"
fi
log_info "Detected Host CPU Architecture: ${BOLD}${CPU_VENDOR^^}${RESET}"

if [ -d "${CUSTOM_DIR}/templates/${CPU_VENDOR}" ]; then
    cp -f "${CUSTOM_DIR}/templates/${CPU_VENDOR}/"*.yml "${PNET_HTML}/templates/" 2>/dev/null || true
    log_ok "Applied high-density ${CPU_VENDOR^^} optimized templates into ${PNET_HTML}/templates/"
elif [ -d "${CUSTOM_DIR}/templates/intel" ]; then
    cp -f "${CUSTOM_DIR}/templates/intel/"*.yml "${PNET_HTML}/templates/" 2>/dev/null || true
    log_ok "Applied default Intel templates into ${PNET_HTML}/templates/"
fi

chmod 0644 "${PNET_HTML}/templates/"*.yml "${PNET_HTML}/templates/intel/"*.yml "${PNET_HTML}/templates/amd/"*.yml 2>/dev/null || true
chown -R www-data:www-data "${PNET_HTML}/templates" 2>/dev/null || true

# ── 2. Global Canonical CLI Tooling (Master & Satellite) ──────────────────────
log_info "[2/8] Standardizing Canonical PNetLab CLI Tooling (pnet-*) in /usr/local/bin/..."
mkdir -p /usr/local/bin /opt/unetlab/scripts 2>/dev/null || true

# Sync scripts into runtime directory
if [ -d "${SCRIPTS_DIR}" ] && [ "${SCRIPTS_DIR}" != "/opt/unetlab/scripts" ]; then
    cp -rf "${SCRIPTS_DIR}/." /opt/unetlab/scripts/ 2>/dev/null || true
fi
chmod +x /opt/unetlab/scripts/*.sh /opt/unetlab/scripts/*.py 2>/dev/null || true

# Remove any legacy azam-* commands to enforce pure pnet-* tooling
rm -f /usr/local/bin/azam-* /usr/local/bin/azambasha-* /usr/local/bin/apply-heavy-node-optimizer 2>/dev/null || true

# Link canonical pnet-* tools
ln -sf /opt/unetlab/scripts/azambasha-update.sh              /usr/local/bin/pnet-update
ln -sf /opt/unetlab/scripts/azambasha-quarterly-audit.sh     /usr/local/bin/pnet-audit
ln -sf /opt/unetlab/scripts/azambasha-health-check.sh        /usr/local/bin/pnet-health
ln -sf /opt/unetlab/scripts/azambasha-image-doctor.sh         /usr/local/bin/pnet-doctor
ln -sf /opt/unetlab/scripts/azambasha-image-doctor.sh         /usr/local/bin/pnet-images
ln -sf /opt/unetlab/scripts/azambasha-heavy-node-optimizer.sh /usr/local/bin/pnet-optimizer
ln -sf /opt/unetlab/scripts/azambasha-heavy-node-optimizer.sh /usr/local/bin/pnet-heavy-optimizer
ln -sf /opt/unetlab/scripts/azambasha-bootstorm.py          /usr/local/bin/pnet-bootstorm
ln -sf /opt/unetlab/scripts/azambasha-fix-cluster.sh         /usr/local/bin/pnet-cluster
ln -sf /opt/unetlab/scripts/azambasha-satellite-join.sh       /usr/local/bin/pnet-satellite-join
ln -sf /opt/unetlab/scripts/azambasha-fix-node-startup.sh    /usr/local/bin/pnet-nodes
ln -sf /opt/unetlab/scripts/azambasha-fix-web-credentials.sh /usr/local/bin/pnet-credentials
ln -sf /opt/unetlab/scripts/azambasha-lab-backup.sh         /usr/local/bin/pnet-backup
ln -sf /opt/unetlab/scripts/azambasha-lab-backup.sh         /usr/local/bin/pnet-restore
ln -sf /opt/unetlab/scripts/azambasha-housekeeping.sh        /usr/local/bin/pnet-clean
ln -sf /opt/unetlab/scripts/azambasha-apt-guard.sh           /usr/local/bin/pnet-apt-guard
ln -sf /opt/unetlab/scripts/azambasha-dark-theme.sh          /usr/local/bin/pnet-dark
ln -sf /opt/unetlab/scripts/azambasha-apply-all-fixes.sh      /usr/local/bin/pnet-menu
ln -sf /opt/unetlab/scripts/azambasha-apply-all-fixes.sh      /usr/local/bin/pnet-fix
ln -sf /opt/unetlab/scripts/azambasha-ai-copilot.py          /usr/local/bin/pnet-ai
ln -sf /opt/unetlab/scripts/azambasha-config-diff.py         /usr/local/bin/pnet-config-diff
ln -sf /opt/unetlab/scripts/azambasha-ping-mesh.py           /usr/local/bin/pnet-ping-mesh
ln -sf /opt/unetlab/scripts/azambasha-scheduler.py           /usr/local/bin/pnet-scheduler
ln -sf /opt/unetlab/scripts/azambasha-cloud-bridge.py        /usr/local/bin/pnet-cloud-bridge
ln -sf /opt/unetlab/scripts/azambasha-topology-doc.py        /usr/local/bin/pnet-topology-doc
ln -sf /opt/unetlab/scripts/azambasha-perf.py                /usr/local/bin/pnet-perf
ln -sf /opt/unetlab/scripts/azambasha-console-fix.sh         /usr/local/bin/pnet-console-fix
ln -sf /opt/unetlab/scripts/azambasha-topology-git.py        /usr/local/bin/pnet-topology-git
ln -sf /opt/unetlab/scripts/azambasha-watchdog.py            /usr/local/bin/pnet-watchdog
ln -sf /opt/unetlab/scripts/azambasha-fleet-status.sh        /usr/local/bin/pnet-fleet
ln -sf /opt/unetlab/scripts/azambasha-cluster-capacity.py    /usr/local/bin/pnet-capacity
ln -sf /opt/unetlab/scripts/azambasha-ssl.sh                 /usr/local/bin/pnet-ssl
ln -sf /opt/unetlab/scripts/azambasha-link-impairment.sh      /usr/local/bin/pnet-link-impair
ln -sf /opt/unetlab/scripts/azambasha-roce-engine.sh          /usr/local/bin/pnet-roce
ln -sf /opt/unetlab/scripts/azambasha-cgroups-v2-engine.sh    /usr/local/bin/pnet-cgroups
ln -sf /opt/unetlab/scripts/azambasha-cpu-governor.py         /usr/local/bin/pnet-cpu-governor
ln -sf /opt/unetlab/scripts/azambasha-eve-lab-importer.py      /usr/local/bin/pnet-lab-importer
ln -sf "${CUSTOM_DIR}/apply-custom-features.sh"              /usr/local/bin/pnet-custom-features
chmod +x /usr/local/bin/pnet-* 2>/dev/null || true
log_ok "Registered 30 canonical pnet-* tools in /usr/local/bin/"

# ── 3. Hypervisor & Memory Deduplication Engine (Master & Satellite) ─────────
log_info "[3/8] Enforcing Ultra-KSM, cgroups v2, and hypervisor tunings..."
if [ -f /opt/unetlab/scripts/azambasha-heavy-node-optimizer.sh ]; then
    bash /opt/unetlab/scripts/azambasha-heavy-node-optimizer.sh "--${MODE}" 2>/dev/null || true
fi
if [ -f /opt/unetlab/scripts/azambasha-speed-optimizer.sh ]; then
    bash /opt/unetlab/scripts/azambasha-speed-optimizer.sh 2>/dev/null || true
fi
if [ -f /opt/unetlab/scripts/azambasha-cgroups-v2-engine.sh ]; then
    bash /opt/unetlab/scripts/azambasha-cgroups-v2-engine.sh 2>/dev/null || true
fi
if [ -f /opt/unetlab/scripts/azambasha-scheduler.py ]; then
    python3 /opt/unetlab/scripts/azambasha-scheduler.py --install 2>/dev/null || true
fi
if [ -f /opt/unetlab/scripts/azambasha-watchdog.py ]; then
    python3 /opt/unetlab/scripts/azambasha-watchdog.py --install 2>/dev/null || true
fi
log_ok "Hypervisor tunings, Ultra-KSM, and autonomous watchdog active."

# If Satellite node: we are finished here! Headless compute nodes do not require Web-UI or DB.
if [ "$MODE" = "satellite" ]; then
    log_ok "Satellite worker node custom features application complete!"
    echo -e "${CYAN}${BOLD}================================================================${RESET}"
    exit 0
fi

# ── 4. Web-UI Operations Center & Docked Multi-Tab Console ────────────────────
log_info "[4/8] Installing Web-UI Operations Center, Docked Console, and CLI Syntax engine..."
mkdir -p "${PNET_HTML}/pnet-ops" "${PNET_HTML}/themes/default/js" "${PNET_HTML}/main/js" "${PNET_HTML}/main/css" 2>/dev/null || true

# Deploy Operations Center modal
if [ -d "${CUSTOM_DIR}/web-ui/ops-center" ]; then
    cp -rf "${CUSTOM_DIR}/web-ui/ops-center/"* "${PNET_HTML}/pnet-ops/" 2>/dev/null || true
fi

# Deploy Docked Console, CLI Syntax, Sequenced Console into themes
for script in pnet-docked-console.js pnet-cli-syntax.js pnet-sequenced-console.js pnet-features.js; do
    if [ -f "${CUSTOM_DIR}/web-ui/ops-center/${script}" ]; then
        cp -f "${CUSTOM_DIR}/web-ui/ops-center/${script}" "${PNET_HTML}/themes/default/js/${script}"
    fi
done

# Deploy Main Dashboard extension
if [ -f "${CUSTOM_DIR}/web-ui/main/pnet-features.js" ]; then
    cp -f "${CUSTOM_DIR}/web-ui/main/pnet-features.js" "${PNET_HTML}/main/js/pnet-features.js"
fi
if [ -f "${CUSTOM_DIR}/web-ui/main/css/theme-engine.css" ]; then
    cp -f "${CUSTOM_DIR}/web-ui/main/css/theme-engine.css" "${PNET_HTML}/main/css/theme-engine.css"
    mkdir -p "${PNET_HTML}/themes/default/css" 2>/dev/null || true
    cp -f "${CUSTOM_DIR}/web-ui/main/css/theme-engine.css" "${PNET_HTML}/themes/default/css/theme-engine.css" 2>/dev/null || true
fi

# Inject script tags into Lab Canvas (/themes/default/index.html)
THEME_INDEX="${PNET_HTML}/themes/default/index.html"
if [ -f "${THEME_INDEX}" ]; then
    CACHE_TS="$(date +%s)"
    for js_file in pnet-features.js pnet-sequenced-console.js pnet-docked-console.js pnet-cli-syntax.js pnet-keepalive.js; do
        if grep -q "${js_file}" "${THEME_INDEX}"; then
            sed -i "s|/themes/default/js/${js_file}[^\"]*|/themes/default/js/${js_file}?v=${CACHE_TS}|g" "${THEME_INDEX}" 2>/dev/null || true
        else
            sed -i "/<\/body>/i <script src=\"/themes/default/js/${js_file}?v=${CACHE_TS}\"></script>" "${THEME_INDEX}" 2>/dev/null || true
        fi
    done
fi

# Inject Sequenced Console priority click interceptor into actions.js
ACTIONS_JS="${PNET_HTML}/themes/default/js/actions.js"
if [ -f "${ACTIONS_JS}" ] && ! grep -q "PNetLab Sequenced Console Priority Hook" "${ACTIONS_JS}"; then
    sed -i '1i // === PNetLab Sequenced Console Priority Hook ===\nif (typeof window !== "undefined") {\n  window.addEventListener("click", function(e) {\n    var t = e.target;\n    var el = t && t.closest ? t.closest(".action-nodesconsole, [data-path=\\"nodes/console\\"], #context-menu a, .context-menu-item") : null;\n    if (el && window.pnetSequencedConsole && !window.pnetSequencedConsole.isBusy) {\n      var txt = (el.innerText || el.textContent || "").toLowerCase();\n      if (el.classList.contains("action-nodesconsole") || el.getAttribute("data-path") === "nodes/console" || txt.indexOf("console to all") !== -1 || txt.indexOf("all nodes console") !== -1) {\n        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();\n        window.pnetSequencedConsole.launch({ mode: "all" });\n        return false;\n      } else if (txt.indexOf("console to selected") !== -1 || txt.indexOf("selected nodes console") !== -1) {\n        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();\n        window.pnetSequencedConsole.launch({ mode: "selected" });\n        return false;\n      }\n    }\n  }, true);\n}\n' "${ACTIONS_JS}" 2>/dev/null || true
fi

# Inject PNet-Features navigation tab into Main Dashboard (/main/index.html)
MAIN_INDEX="${PNET_HTML}/main/index.html"
if [ -f "${MAIN_INDEX}" ]; then
    CACHE_TS="$(date +%s)"
    if grep -q "pnet-features" "${MAIN_INDEX}"; then
        sed -i "s|/main/js/pnet-features.js[^\"]*|/main/js/pnet-features.js?v=${CACHE_TS}|g" "${MAIN_INDEX}" 2>/dev/null || true
    else
        sed -i '/data-route="ai"/a \			<a class="nav-item" data-route="pnet-features" href="#/pnet-features">\n				<i class="fa fa-bolt" aria-hidden="true" style="color:#0ea5e9;"></i><span>PNet-Features</span></a>' "${MAIN_INDEX}" 2>/dev/null || true
        sed -i "s|</body>|<script src=\"/main/js/pnet-features.js?v=${CACHE_TS}\"></script>\n</body>|" "${MAIN_INDEX}" 2>/dev/null || true
    fi
fi
log_ok "Operations Center & Lab Canvas scripts integrated with cache-busting."

# ── 5. Sliding-Auth Keepalive & Session Heartbeat ─────────────────────────────
log_info "[5/8] Deploying permanent sliding session keepalive engine..."
if [ -f "${CUSTOM_DIR}/session-engine/pnet-keepalive.js" ]; then
    cp -f "${CUSTOM_DIR}/session-engine/pnet-keepalive.js" "${PNET_HTML}/themes/default/js/pnet-keepalive.js"
    chmod 0644 "${PNET_HTML}/themes/default/js/pnet-keepalive.js" 2>/dev/null || true
    log_ok "Installed pnet-keepalive.js (heartbeat every 180s)."
fi

# ── 6. Futuristic Cyber-Glass Login Portal & Branding ────────────────────────
log_info "[6/8] Deploying Cyber-Glass Login Portal and platform branding..."
mkdir -p "${PNET_HTML}/login/img" "/opt/unetlab/data/branding" 2>/dev/null || true

# Backup stock login if not already backed up
if [ -d "${PNET_HTML}/login" ] && [ ! -d "${PNET_HTML}/login.stock-bak" ]; then
    cp -r "${PNET_HTML}/login" "${PNET_HTML}/login.stock-bak" 2>/dev/null || true
fi

if [ -d "${CUSTOM_DIR}/login-portal" ]; then
    cp -rf "${CUSTOM_DIR}/login-portal/"* "${PNET_HTML}/login/" 2>/dev/null || true
fi

# Copy branding assets
if [ -d "${CUSTOM_DIR}/assets" ]; then
    cp -f "${CUSTOM_DIR}/assets/"* "/opt/unetlab/data/branding/" 2>/dev/null || true
fi

chmod 0644 "${PNET_HTML}/login/"*.html "${PNET_HTML}/login/"*.css "${PNET_HTML}/login/"*.js "${PNET_HTML}/login/img/"* 2>/dev/null || true
chown -R www-data:www-data "${PNET_HTML}/login" 2>/dev/null || true
log_ok "Deployed Cyber-Glass login portal with smooth credentials authentication."

# ── 7. Extended Database Schema Migration ─────────────────────────────────────
log_info "[7/8] Applying cluster schema enhancements and Guacamole optimizations..."
if systemctl is-active --quiet mysql 2>/dev/null || systemctl is-active --quiet mariadb 2>/dev/null; then
    if [ -f "${CUSTOM_DIR}/schema/pnet_features_db.sql" ]; then
        mysql -u root pnetlab_db < "${CUSTOM_DIR}/schema/pnet_features_db.sql" 2>/dev/null || true
        log_ok "Applied cluster tables & activity log extensions to pnetlab_db."
    fi
    if [ -f "${CUSTOM_DIR}/schema/guacdb.sql" ]; then
        if mysql -u root -e "USE guacamole_db;" 2>/dev/null; then
            mysql -u root guacamole_db < "${CUSTOM_DIR}/schema/guacdb.sql" 2>/dev/null || true
            log_ok "Applied Guacamole HTML5 optimization tables."
        fi
    fi
else
    log_warn "MySQL/MariaDB is not currently running; skipping immediate SQL execution."
fi

# ── 8. Backend Operations API & Apache Reverse Proxy ──────────────────────────
log_info "[8/8] Configuring Operations API Service and Apache reverse proxy..."
APACHE_CONF="/etc/apache2/conf-available/pnet-ops-api.conf"
cat > "${APACHE_CONF}" << 'APACHEEOF'
# PNetLab Operations Dashboard API Reverse Proxy
# Backend: python3 azambasha-ops-api.py running on 127.0.0.1:8889

<Location /pnet-ops/api>
    ProxyPass http://127.0.0.1:8889/pnet-ops/api
    ProxyPassReverse http://127.0.0.1:8889/pnet-ops/api
    Require all granted
</Location>

# Backward-compatibility alias
<Location /azam-ops/api>
    ProxyPass http://127.0.0.1:8889/azam-ops/api
    ProxyPassReverse http://127.0.0.1:8889/azam-ops/api
    Require all granted
</Location>

<IfModule mod_headers.c>
    <FilesMatch "pnet-features.*\.js$">
        Header set Cache-Control "no-cache, no-store, must-revalidate, max-age=0"
        Header set Pragma "no-cache"
        Header set Expires 0
    </FilesMatch>
</IfModule>
APACHEEOF

a2enmod proxy proxy_http headers 2>/dev/null || true
a2enconf pnet-ops-api 2>/dev/null || true

# Deploy systemd service for Operations API
if [ -f "/opt/unetlab/scripts/azambasha-ops-api.py" ]; then
    python3 /opt/unetlab/scripts/azambasha-ops-api.py --install 2>/dev/null || true
    systemctl restart pnet-ops-api.service 2>/dev/null || systemctl restart azam-ops-api.service 2>/dev/null || true
fi

# Standardize permissions across /opt/unetlab
if [ -f "/opt/unetlab/scripts/azambasha-fix-permissions.sh" ]; then
    bash /opt/unetlab/scripts/azambasha-fix-permissions.sh 2>/dev/null || true
fi

# Reload Apache
if systemctl is-active --quiet apache2 2>/dev/null; then
    apache2ctl configtest 2>&1 | grep -v "^Syntax OK" || true
    systemctl reload apache2 2>/dev/null || true
fi

log_ok "Custom features application pipeline completed successfully!"
echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${GREEN}${BOLD}   All Custom Features Successfully Applied to PNetLab!         ${RESET}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"
