#!/usr/bin/env bash
# ==============================================================================
# Custom-Features Pillar Deployment Hook (apply-features.sh)
# Deploys:
#   1. Web-UI Operations Center & In-Canvas Docked Multi-Tab Console
#   2. Line-Speed CLI Syntax Highlighter & Sequenced Console Launcher
#   3. Extended Cluster Database Schema & Guacamole Tables
#   4. Operations Center REST API Backend & Apache Reverse Proxy
#   5. Feature Automation Tools (AI, Topology Git, Config-Diff, Cloud Bridge)
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
echo -e "${BOLD}   PNetLab Pillar 1: Custom-Features Application Engine         ${RESET}"
echo -e "   Target Mode: ${BOLD}${MODE^^}${RESET} | Base: ${SCRIPT_DIR}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"

# 1. Feature CLI Tooling Registration
log_info "[1/4] Registering Feature CLI Tools in /usr/local/bin/..."
mkdir -p /usr/local/bin /opt/unetlab/scripts 2>/dev/null || true

# Copy scripts and mcp tools to runtime location
if [ -d "${SCRIPT_DIR}/scripts" ]; then
    cp -rf "${SCRIPT_DIR}/scripts/"* /opt/unetlab/scripts/ 2>/dev/null || true
fi
if [ -d "${SCRIPT_DIR}/mcp" ]; then
    mkdir -p /opt/unetlab/scripts/mcp 2>/dev/null || true
    cp -rf "${SCRIPT_DIR}/mcp/"* /opt/unetlab/scripts/mcp/ 2>/dev/null || true
fi
chmod +x /opt/unetlab/scripts/*.sh /opt/unetlab/scripts/*.py /opt/unetlab/scripts/mcp/*.py 2>/dev/null || true

ln -sf /opt/unetlab/scripts/pnet-ai-copilot.py          /usr/local/bin/pnet-ai
ln -sf /opt/unetlab/scripts/pnet-config-diff.py         /usr/local/bin/pnet-config-diff
ln -sf /opt/unetlab/scripts/pnet-ping-mesh.py           /usr/local/bin/pnet-ping-mesh
ln -sf /opt/unetlab/scripts/pnet-scheduler.py           /usr/local/bin/pnet-scheduler
ln -sf /opt/unetlab/scripts/pnet-cloud-bridge.py        /usr/local/bin/pnet-cloud-bridge
ln -sf /opt/unetlab/scripts/pnet-topology-doc.py        /usr/local/bin/pnet-topology-doc
ln -sf /opt/unetlab/scripts/pnet-topology-git.py        /usr/local/bin/pnet-topology-git
ln -sf /opt/unetlab/scripts/pnet-eve-lab-importer.py    /usr/local/bin/pnet-lab-importer
ln -sf "${SCRIPT_DIR}/apply-features.sh"                 /usr/local/bin/pnet-apply-features
chmod +x /usr/local/bin/pnet-* 2>/dev/null || true
log_ok "Registered feature CLI commands."

if [ "$MODE" = "satellite" ]; then
    log_ok "Satellite worker node: Custom-Features CLI tools deployed (skipping Web-UI/DB)."
    exit 0
fi

# 2. Web-UI Operations Center & In-Canvas Consoles
log_info "[2/4] Deploying Web-UI Operations Center, Docked Console, and Syntax Highlighter..."
mkdir -p "${PNET_HTML}/pnet-ops" "${PNET_HTML}/themes/default/js" "${PNET_HTML}/main/js" 2>/dev/null || true

if [ -d "${SCRIPT_DIR}/web-ui/ops-center" ]; then
    cp -rf "${SCRIPT_DIR}/web-ui/ops-center/"* "${PNET_HTML}/pnet-ops/" 2>/dev/null || true
    for js_file in pnet-docked-console.js pnet-cli-syntax.js pnet-sequenced-console.js pnet-features.js; do
        if [ -f "${SCRIPT_DIR}/web-ui/ops-center/${js_file}" ]; then
            cp -f "${SCRIPT_DIR}/web-ui/ops-center/${js_file}" "${PNET_HTML}/themes/default/js/${js_file}"
        fi
    done
fi

if [ -f "${SCRIPT_DIR}/web-ui/main/pnet-features.js" ]; then
    cp -f "${SCRIPT_DIR}/web-ui/main/pnet-features.js" "${PNET_HTML}/main/js/pnet-features.js"
fi

THEME_INDEX="${PNET_HTML}/themes/default/index.html"
if [ -f "${THEME_INDEX}" ]; then
    CACHE_TS="$(date +%s)"
    for js_file in pnet-features.js pnet-sequenced-console.js pnet-docked-console.js pnet-cli-syntax.js; do
        if grep -q "${js_file}" "${THEME_INDEX}"; then
            sed -i "s|/themes/default/js/${js_file}[^\"]*|/themes/default/js/${js_file}?v=${CACHE_TS}|g" "${THEME_INDEX}" 2>/dev/null || true
        else
            sed -i "/<\/body>/i <script src=\"/themes/default/js/${js_file}?v=${CACHE_TS}\"></script>" "${THEME_INDEX}" 2>/dev/null || true
        fi
    done
fi

ACTIONS_JS="${PNET_HTML}/themes/default/js/actions.js"
if [ -f "${ACTIONS_JS}" ] && ! grep -q "PNetLab Sequenced Console Priority Hook" "${ACTIONS_JS}"; then
    sed -i '1i // === PNetLab Sequenced Console Priority Hook ===\nif (typeof window !== "undefined") {\n  window.addEventListener("click", function(e) {\n    var t = e.target;\n    var el = t && t.closest ? t.closest(".action-nodesconsole, [data-path=\\"nodes/console\\"], #context-menu a, .context-menu-item") : null;\n    if (el && window.pnetSequencedConsole && !window.pnetSequencedConsole.isBusy) {\n      var txt = (el.innerText || el.textContent || "").toLowerCase();\n      if (el.classList.contains("action-nodesconsole") || el.getAttribute("data-path") === "nodes/console" || txt.indexOf("console to all") !== -1 || txt.indexOf("all nodes console") !== -1) {\n        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();\n        window.pnetSequencedConsole.launch({ mode: "all" });\n        return false;\n      } else if (txt.indexOf("console to selected") !== -1 || txt.indexOf("selected nodes console") !== -1) {\n        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();\n        window.pnetSequencedConsole.launch({ mode: "selected" });\n        return false;\n      }\n    }\n  }, true);\n}\n' "${ACTIONS_JS}" 2>/dev/null || true
fi

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
log_ok "Web-UI components deployed with real-time cache busters."

# 3. Database Schema Extensions
log_info "[3/4] Migrating cluster schema extensions and Guacamole optimizations..."
if systemctl is-active --quiet mysql 2>/dev/null || systemctl is-active --quiet mariadb 2>/dev/null; then
    if [ -f "${SCRIPT_DIR}/schema/pnet_features_db.sql" ]; then
        mysql -u root pnetlab_db < "${SCRIPT_DIR}/schema/pnet_features_db.sql" 2>/dev/null || true
        log_ok "Applied cluster tables & activity log extensions to pnetlab_db."
    fi
    if [ -f "${SCRIPT_DIR}/schema/guacdb.sql" ]; then
        if mysql -u root -e "USE guacamole_db;" 2>/dev/null; then
            mysql -u root guacamole_db < "${SCRIPT_DIR}/schema/guacdb.sql" 2>/dev/null || true
            log_ok "Applied Guacamole HTML5 optimization tables."
        fi
    fi
fi

# 4. Backend Operations API & Apache Reverse Proxy
log_info "[4/4] Deploying Operations API backend and Apache reverse proxy..."
APACHE_CONF="/etc/apache2/conf-available/pnet-ops-api.conf"
cat > "${APACHE_CONF}" << 'APACHEEOF'
# PNetLab Operations Dashboard API Reverse Proxy
# Backend: python3 azambasha-ops-api.py running on 127.0.0.1:8889

<Location /pnet-ops/api>
    ProxyPass http://127.0.0.1:8889/pnet-ops/api
    ProxyPassReverse http://127.0.0.1:8889/pnet-ops/api
    Require all granted
</Location>

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

if [ -f "/opt/unetlab/scripts/pnet-ops-api.py" ]; then
    python3 /opt/unetlab/scripts/pnet-ops-api.py --install 2>/dev/null || true
    systemctl restart pnet-ops-api.service 2>/dev/null || true
elif [ -f "/opt/unetlab/scripts/azambasha-ops-api.py" ]; then
    python3 /opt/unetlab/scripts/azambasha-ops-api.py --install 2>/dev/null || true
    systemctl restart pnet-ops-api.service 2>/dev/null || systemctl restart azam-ops-api.service 2>/dev/null || true
fi

log_ok "Pillar 1: Custom-Features applied successfully!"
