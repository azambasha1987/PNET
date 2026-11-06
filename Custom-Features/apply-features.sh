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

# Copy scripts to runtime location
if [ -d "${SCRIPT_DIR}/scripts" ]; then
    cp -rf "${SCRIPT_DIR}/scripts/"* /opt/unetlab/scripts/ 2>/dev/null || true
fi
chmod +x /opt/unetlab/scripts/*.sh /opt/unetlab/scripts/*.py 2>/dev/null || true

ln -sf /opt/unetlab/scripts/pnet-bootstorm.py           /usr/local/bin/pnet-bootstorm
ln -sf /opt/unetlab/scripts/pnet-config-diff.py         /usr/local/bin/pnet-config-diff
ln -sf /opt/unetlab/scripts/pnet-ping-mesh.py           /usr/local/bin/pnet-ping-mesh
ln -sf /opt/unetlab/scripts/pnet-scheduler.py           /usr/local/bin/pnet-scheduler
ln -sf /opt/unetlab/scripts/pnet-cloud-bridge.py        /usr/local/bin/pnet-cloud-bridge
ln -sf /opt/unetlab/scripts/pnet-topology-git.py        /usr/local/bin/pnet-topology-git
ln -sf /opt/unetlab/scripts/pnet-upload-and-docker-fix.sh /usr/local/bin/pnet-upload-fix
ln -sf /opt/unetlab/scripts/pnet-upload-and-docker-fix.sh /usr/local/bin/pnet-docker-fix
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

if [ -d "${SCRIPT_DIR}/web-ui/main/js" ]; then
    cp -rf "${SCRIPT_DIR}/web-ui/main/js/"* "${PNET_HTML}/main/js/" 2>/dev/null || true
fi
if [ -f "${SCRIPT_DIR}/web-ui/main/pnet-features.js" ]; then
    cp -f "${SCRIPT_DIR}/web-ui/main/pnet-features.js" "${PNET_HTML}/main/js/pnet-features.js"
fi

# ── Ensure Svelte Islands canonical symlinks & registration ───────────────────
ISLANDS_DIR="${PNET_HTML}/themes/default/islands/js"
if [ -d "$ISLANDS_DIR" ]; then
    LABS_WS="$(ls -1 "$ISLANDS_DIR"/labs-workspace.*.js 2>/dev/null | grep -v 'labs-workspace\.js$' | head -n1)"
    ICONS_MGR="$(ls -1 "$ISLANDS_DIR"/icons-manager.*.js 2>/dev/null | grep -v 'icons-manager\.js$' | head -n1)"
    if [ -n "$LABS_WS" ] && [ -f "$LABS_WS" ]; then
        ln -sf "$(basename "$LABS_WS")" "$ISLANDS_DIR/labs-workspace.js" 2>/dev/null || true
        cp -f "$LABS_WS" "$ISLANDS_DIR/labs-workspace.js" 2>/dev/null || true
    fi
    if [ -n "$ICONS_MGR" ] && [ -f "$ICONS_MGR" ]; then
        ln -sf "$(basename "$ICONS_MGR")" "$ISLANDS_DIR/icons-manager.js" 2>/dev/null || true
        cp -f "$ICONS_MGR" "$ISLANDS_DIR/icons-manager.js" 2>/dev/null || true
    fi
    chmod 644 "$ISLANDS_DIR"/*.js 2>/dev/null || true
    chown www-data:www-data "$ISLANDS_DIR"/*.js 2>/dev/null || true
fi

# Ensure labs and branding storage directories exist and have correct permissions
mkdir -p /opt/unetlab/labs /opt/unetlab/data/Exports /opt/unetlab/data/Logs /opt/unetlab/data/branding /opt/ovf 2>/dev/null || true
chmod 775 /opt/unetlab/labs /opt/unetlab/data/branding 2>/dev/null || true
chown -R www-data:www-data /opt/unetlab/labs /opt/unetlab/html /opt/unetlab/data 2>/dev/null || true

# Ensure cloud bridges helper script and systemd service exist and are active
if [ -f "${SCRIPT_DIR}/scripts/pnet-bridges.sh" ]; then
    cp -f "${SCRIPT_DIR}/scripts/pnet-bridges.sh" /opt/ovf/pnet-bridges.sh 2>/dev/null || true
elif [ -f "/opt/PNET/scripts/pnet-bridges.sh" ]; then
    cp -f "/opt/PNET/scripts/pnet-bridges.sh" /opt/ovf/pnet-bridges.sh 2>/dev/null || true
fi
chmod 755 /opt/ovf/pnet-bridges.sh 2>/dev/null || true
[ -x /opt/ovf/pnet-bridges.sh ] && /bin/bash /opt/ovf/pnet-bridges.sh 2>/dev/null || true
systemctl unmask pnetlab-pnet-bridges.service 2>/dev/null || true
systemctl enable --now pnetlab-pnet-bridges.service 2>/dev/null || true

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
if [ -f "${SCRIPT_DIR}/web-ui/main/index.html" ]; then
    cp -f "${SCRIPT_DIR}/web-ui/main/index.html" "${MAIN_INDEX}" 2>/dev/null || true
fi
if [ -f "${MAIN_INDEX}" ]; then
    # Ensure Svelte Island module tags and Theme Engine exist in main/index.html
    if ! grep -q "pnq-theme.js" "${MAIN_INDEX}"; then
        sed -i 's|<script src="/main/js/dashboard.js|<script src="/assets-common/js/pnq-theme.js"></script>\n\t<script src="/main/js/dashboard.js|' "${MAIN_INDEX}" 2>/dev/null || true
    fi
    if ! grep -q "labs-workspace" "${MAIN_INDEX}"; then
        sed -i 's|<script src="/main/js/labs.js|<script type="module" src="/themes/default/islands/js/labs-workspace.js"></script>\n\t<script type="module" src="/themes/default/islands/js/icons-manager.js"></script>\n\t<script src="/main/js/labs.js|' "${MAIN_INDEX}" 2>/dev/null || true
    fi
    CACHE_TS="$(date +%s)"
    python3 -c "
import re
p = '${MAIN_INDEX}'
try:
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    if 'data-route=\"pnet-features\"' not in c:
        c = re.sub(r'(<a class=\"nav-item\" data-route=\"ai\"[^\n]*</a>)', r'\1\n\t\t\t\t<a class=\"nav-item\" data-route=\"pnet-features\" href=\"#/pnet-features\"><i class=\"fa fa-bolt\" aria-hidden=\"true\" style=\"color:#0ea5e9;\"></i><span>Azam Features</span></a>', c)
    if 'pnet-features.js' not in c:
        c = c.replace('</body>', f'<script src=\"/main/js/pnet-features.js?v=${CACHE_TS}\"></script>\n</body>')
    else:
        c = re.sub(r'/main/js/pnet-features\.js(?:\?v=[^\"]*)?', f'/main/js/pnet-features.js?v=${CACHE_TS}', c)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
except Exception as e:
    print('Failed to update index.html:', e)
"

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

    # Authoritatively assert admin / pnet user and control settings in pnetlab_db
    mysql -u root pnetlab_db -e "
    UPDATE users SET password = SHA2('pnet', 256), role = '0', user_status = 1, offline = 1, session = UNIX_TIMESTAMP() + 315360000 WHERE username = 'admin';
    INSERT IGNORE INTO users (pod, username, email, name, password, role, user_status, offline, session, folder, ip) VALUES (0, 'admin', 'root@localhost', 'Administrator', SHA2('pnet', 256), '0', 1, 1, UNIX_TIMESTAMP() + 315360000, '/', '127.0.0.1');
    INSERT INTO control (control_name, control_value) VALUES ('ctrl_offline_mode', '1'), ('ctrl_version', '6.8.93'), ('ctrl_captcha', '0') ON DUPLICATE KEY UPDATE control_value = VALUES(control_value);
    " 2>/dev/null || true
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

# 5. Large File Uploads (512MB) & Docker Container Subsystem
log_info "[5/5] Provisioning 512MB Large Upload Limits & Docker Subsystem..."
UPLOAD_SCRIPT="${SCRIPT_DIR}/scripts/pnet-upload-and-docker-fix.sh"
[ -f "$UPLOAD_SCRIPT" ] || UPLOAD_SCRIPT="/opt/unetlab/scripts/pnet-upload-and-docker-fix.sh"
if [ -f "$UPLOAD_SCRIPT" ]; then
    bash "$UPLOAD_SCRIPT" || true
    log_ok "512MB Upload Limits and Docker Subsystem applied."
else
    log_warn "pnet-upload-and-docker-fix.sh not found; skipping upload limit tuning."
fi

log_ok "Pillar 1: Custom-Features applied successfully!"
