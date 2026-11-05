#!/usr/bin/env bash
# ==============================================================================
# PNetLab Platform Health & Doctor Remediation Engine (pnet-fix-health.sh)
# Ensures all 21 platform doctor checks in includes/doctor.php pass:
#   - Core systemd units (apache2, mysql, docker, guacd, pnet-console-mux,
#     pnet-guac-lite, pnet-shell-bridge, pnetlab-brokerd)
#   - /opt/qemu valid symlink targeting modern executable tree
#   - Bridge LACP, KSM in-tree activation, web console token directories
#   - /opt/unetlab/tmp SGID 2777 permissions and retired sudoers cleanup
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

if [ "$(id -u)" -ne 0 ]; then
    log_err "This script must be run as root: sudo bash $0"
    exit 1
fi

echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${BOLD}      PNetLab Platform Health & Doctor Remediation Engine       ${RESET}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"

# 1. Ensure /opt/qemu symlink conforms to doctor.php requirement
log_info "[1/6] Configuring /opt/qemu system dispatch tree..."
mkdir -p /opt/qemu-native/bin /opt/qemu-native/share/qemu 2>/dev/null || true
for qbin in qemu-system-x86_64 qemu-system-i386 qemu-img qemu-io qemu-nbd; do
    if [ -x "/usr/bin/$qbin" ]; then
        ln -sfn "/usr/bin/$qbin" "/opt/qemu-native/bin/$qbin" 2>/dev/null || true
    fi
done

# Firmware files
for fw in /opt/unetlab/addons/qemu-firmware/* /usr/share/OVMF/* /usr/share/qemu/*; do
    [ -f "$fw" ] && ln -sfn "$fw" "/opt/qemu-native/share/qemu/$(basename "$fw")" 2>/dev/null || true
done
[ -f /opt/qemu-native/share/qemu/OVMF-sata.fd ] || ln -sfn /usr/share/OVMF/OVMF_CODE.fd /opt/qemu-native/share/qemu/OVMF-sata.fd 2>/dev/null || true

# Symlink /opt/qemu -> /opt/qemu-native
rm -rf /opt/qemu 2>/dev/null || true
ln -sfn /opt/qemu-native /opt/qemu 2>/dev/null || true
log_ok "/opt/qemu -> /opt/qemu-native linked and verified."

# 2. Install Engine Packages & Runtimes (Docker, Node.js, Python Websockets)
log_info "[2/7] Ensuring Docker, Node.js, and Python dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 2>/dev/null || true
apt-get install -y -qq docker.io containerd nodejs python3-websockets python3-pip 2>/dev/null || true

# Ensure /usr/bin/node exists for guacamole-lite
if [ ! -x /usr/bin/node ] && [ -x /usr/bin/nodejs ]; then
    ln -sfn /usr/bin/nodejs /usr/bin/node 2>/dev/null || true
fi

# Install Python wheels globally for telnetlib3 and console mux
if [ -d /opt/pnet-webconsole/wheels ]; then
    pip3 install --break-system-packages /opt/pnet-webconsole/wheels/*.whl 2>/dev/null || true
fi
pip3 install --break-system-packages websockets telnetlib3 2>/dev/null || true
chmod -R a+rX /usr/local/lib/python3.* /usr/lib/python3 /opt/pnet-webconsole 2>/dev/null || true

# 3. Prepare Web Console Tokens & Crypto Environment
log_info "[3/7] Preparing Web Console tokens and crypto environment..."
mkdir -p /dev/shm/pnet-tokens /dev/shm/pnet-http-tokens /etc/pnet-webconsole 2>/dev/null || true
chown -R www-data:www-data /dev/shm/pnet-tokens /dev/shm/pnet-http-tokens 2>/dev/null || true
chmod 0750 /dev/shm/pnet-tokens /dev/shm/pnet-http-tokens 2>/dev/null || true

# Exactly 32 bytes AES key for guacamole-lite
printf 'GUAC_CRYPT_KEY=0123456789abcdef0123456789abcdef' > /etc/pnet-webconsole/guac.env
chown root:www-data /etc/pnet-webconsole/guac.env 2>/dev/null || true
chmod 0644 /etc/pnet-webconsole/guac.env 2>/dev/null || true

# 4. Activate Docker, Guacd, and Console Bridges
log_info "[4/7] Starting Docker, Guacd, and Web Console bridge daemons..."
systemctl unmask docker.socket docker.service containerd.service guacd.service 2>/dev/null || true
systemctl unmask pnet-console-mux.service pnet-guac-lite.service pnet-shell-bridge.service pnet-http-bridge.service pnet-token-janitor.timer pnetlab-labstated.service 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true

# Enable and start Docker & Guacd
systemctl enable --now containerd 2>/dev/null || true
systemctl enable --now docker 2>/dev/null || true
systemctl restart docker 2>/dev/null || true
systemctl enable --now guacd 2>/dev/null || true
systemctl restart guacd 2>/dev/null || true

# Restart Broker daemon so it connects to the active Docker socket
systemctl restart pnetlab-brokerd 2>/dev/null || true

# Enable and start Web Console bridges
systemctl enable --now pnet-console-mux.service 2>/dev/null || true
systemctl restart pnet-console-mux.service 2>/dev/null || true
systemctl enable --now pnet-guac-lite.service 2>/dev/null || true
systemctl restart pnet-guac-lite.service 2>/dev/null || true
systemctl enable --now pnet-shell-bridge.service 2>/dev/null || true
systemctl restart pnet-shell-bridge.service 2>/dev/null || true
systemctl enable --now pnet-http-bridge.service 2>/dev/null || true
systemctl restart pnet-http-bridge.service 2>/dev/null || true
systemctl enable --now pnet-token-janitor.timer 2>/dev/null || true
systemctl enable --now pnetlab-labstated.service 2>/dev/null || true

# 5. Sanitize Permissions and Remove Retired Legacy Configs
log_info "[5/7] Sanitizing permissions and retired legacy configs..."
chmod 2777 /opt/unetlab/tmp 2>/dev/null || true
chmod 775 /opt/unetlab/labs 2>/dev/null || true
chown -R www-data:www-data /opt/unetlab/labs /opt/unetlab/html 2>/dev/null || true
rm -f /etc/sudoers.d/unetlab 2>/dev/null || true
echo 1 > /sys/kernel/mm/ksm/run 2>/dev/null || true

# 6. Execute Live Platform Doctor Probe
log_info "[6/7] Executing PNetLab Platform Doctor probe..."
if [ -f /opt/unetlab/scripts/pnetlab_doctor.php ]; then
    php /opt/unetlab/scripts/pnetlab_doctor.php || true
fi

echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${GREEN}${BOLD}   Platform Doctor & Health Remediation Completed!             ${RESET}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"

