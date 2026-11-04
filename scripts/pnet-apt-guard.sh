#!/usr/bin/env bash
# ==============================================================================
# AzamLabs Safe APT Guard & Command Interceptor Utility
# Ubuntu 24.04 / 26.04+ Native Architecture
#
# Prevents accidental destruction of AzamLabs virtualization environment:
# 1. Diverts /usr/bin/apt and /usr/bin/apt-get via dpkg-divert to *.real.
# 2. Intercepts 'apt upgrade', 'dist-upgrade', and 'full-upgrade' (prevents kernel/PHP break).
# 3. Intercepts 'apt autoremove' (prevents purging 32-bit IOL libraries & DKMS headers).
# 4. Permits all safe operations: 'apt update', 'apt install', 'apt search', 'apt show'.
# 5. Supports emergency override: --force-azam-override
#
# Usage:
#   sudo bash scripts/azambasha-apt-guard.sh --enable   # Install & engage guard (default)
#   sudo bash scripts/azambasha-apt-guard.sh --check    # Check guard status
#   sudo bash scripts/azambasha-apt-guard.sh --disable  # Remove guard & restore native APT
# ==============================================================================
set -euo pipefail

APT_SYS_BIN="/usr/bin/apt"
APT_GET_SYS_BIN="/usr/bin/apt-get"
APT_LOCAL_BIN="/usr/local/bin/apt"
APT_GET_LOCAL_BIN="/usr/local/bin/apt-get"
APT_CONF_HOOK="/etc/apt/apt.conf.d/99azamlabs-apt-guard"
PROFILE_HOOK="/etc/profile.d/azamlabs-apt-guard.sh"

# Color tokens
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

log_info() { echo -e "${CYAN}[*]${RESET} $*"; }
log_ok()   { echo -e "${GREEN}[✔]${RESET} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${RESET} $*"; }
log_err()  { echo -e "${RED}[✘]${RESET} $*"; }

# --- Check Mode ---
if [[ "${1:-}" =~ ^(--check|--status|-c)$ ]]; then
    echo "============================================================"
    echo "         AzamLabs APT Guard Status Diagnostic Probe         "
    echo "============================================================"
    
    echo -n "[*] Binary Diversion (/usr/bin/apt)  : "
    if dpkg-divert --list /usr/bin/apt 2>/dev/null | grep -q "apt.real"; then
        echo -e "${GREEN}DIVERTED (dpkg-divert active -> apt.real)${RESET}"
    else
        echo -e "${YELLOW}STANDARD (No diversion)${RESET}"
    fi

    echo -n "[*] /usr/bin/apt protective wrapper  : "
    if [ -f "$APT_SYS_BIN" ] && grep -q "BREAK AzamLabs" "$APT_SYS_BIN" 2>/dev/null; then
        echo -e "${GREEN}ACTIVE (Intercepting upgrade & autoremove)${RESET}"
    else
        echo -e "${RED}DISABLED (Native binary)${RESET}"
    fi

    echo -n "[*] /usr/local/bin/apt wrapper       : "
    if [ -e "$APT_LOCAL_BIN" ]; then
        echo -e "${GREEN}ENGAGED ($APT_LOCAL_BIN)${RESET}"
    else
        echo -e "${YELLOW}NOT PRESENT${RESET}"
    fi

    echo -n "[*] APT Configuration Hook           : "
    if [ -f "$APT_CONF_HOOK" ]; then
        echo -e "${GREEN}ENGAGED ($APT_CONF_HOOK)${RESET}"
    else
        echo -e "${RED}DISABLED${RESET}"
    fi

    echo -n "[*] Shell Cache Invalidation Hook    : "
    if [ -f "$PROFILE_HOOK" ]; then
        echo -e "${GREEN}ENGAGED ($PROFILE_HOOK)${RESET}"
    else
        echo -e "${RED}DISABLED${RESET}"
    fi
    echo "============================================================"
    exit 0
fi

# Require root for mutations
if [ "$(id -u)" -ne 0 ]; then
    log_err "Please run this script as root (sudo bash $0)"
    exit 1
fi

# --- Disable / Unblock Mode ---
if [[ "${1:-}" =~ ^(--disable|--unblock|--restore|-d)$ ]]; then
    echo "============================================================"
    echo "           Disabling AzamLabs APT Guard Subsystem           "
    echo "============================================================"
    
    log_info "Removing protective wrappers..."
    rm -f "$APT_LOCAL_BIN" "$APT_GET_LOCAL_BIN" "$PROFILE_HOOK" "$APT_CONF_HOOK"
    
    # Remove wrappers if diverted
    if dpkg-divert --list /usr/bin/apt 2>/dev/null | grep -q "apt.real"; then
        log_info "Reverting /usr/bin/apt diversion..."
        rm -f "$APT_SYS_BIN"
        dpkg-divert --rename --remove "$APT_SYS_BIN" 2>/dev/null || true
    fi

    if dpkg-divert --list /usr/bin/apt-get 2>/dev/null | grep -q "apt-get.real"; then
        log_info "Reverting /usr/bin/apt-get diversion..."
        rm -f "$APT_GET_SYS_BIN"
        dpkg-divert --rename --remove "$APT_GET_SYS_BIN" 2>/dev/null || true
    fi
    
    hash -d apt apt-get 2>/dev/null || true
    log_ok "AzamLabs APT Guard has been disabled. Native APT restored."
    exit 0
fi

# --- Enable / Engage Mode (Default) ---
echo "============================================================"
echo "          Engaging AzamLabs Safe APT Guard Subsystem         "
echo "============================================================"

mkdir -p /usr/local/bin /usr/bin /etc/apt/apt.conf.d /etc/profile.d

# 1. Divert native binaries so it is impossible to bypass even in existing shells
if ! dpkg-divert --list /usr/bin/apt 2>/dev/null | grep -q "apt.real"; then
    log_info "Diverting /usr/bin/apt -> /usr/bin/apt.real..."
    dpkg-divert --add --rename --divert /usr/bin/apt.real /usr/bin/apt
fi

if ! dpkg-divert --list /usr/bin/apt-get 2>/dev/null | grep -q "apt-get.real"; then
    log_info "Diverting /usr/bin/apt-get -> /usr/bin/apt-get.real..."
    dpkg-divert --add --rename --divert /usr/bin/apt-get.real /usr/bin/apt-get
fi

log_info "Deploying universal protective wrapper to /usr/bin/apt..."
cat > "$APT_SYS_BIN" << 'WRAPPER_EOF'
#!/usr/bin/env bash
# ==============================================================================
# AzamLabs Protective APT Interceptor Wrapper
# Protects system from destructive upgrades and autoremove operations
# ==============================================================================
BIN_NAME="$(basename "$0")"
if [ "$BIN_NAME" = "apt-get" ]; then
    REAL_BIN="/usr/bin/apt-get.real"
else
    REAL_BIN="/usr/bin/apt.real"
fi
[ -x "$REAL_BIN" ] || REAL_BIN="/usr/bin/apt.real"

FORCE_OVERRIDE=0

# Parse arguments to detect emergency override flag
ARGS=()
for arg in "$@"; do
    if [ "$arg" = "--force-azam-override" ]; then
        FORCE_OVERRIDE=1
    else
        ARGS+=("$arg")
    fi
done

# First positional verb
CMD="${ARGS[0]:-}"

if [ "$FORCE_OVERRIDE" -eq 0 ]; then
    case "$CMD" in
        upgrade|dist-upgrade|full-upgrade)
            echo -e "\033[1;31m====================================================================\033[0m"
            echo -e "\033[1;31m [BLOCKED] Do Not Try to UPGRADE, this will BREAK AzamLabs.\033[0m"
            echo -e "\033[1;31m====================================================================\033[0m"
            echo -e " Running direct system upgrades overwrites custom PHP 8.5 tuning,"
            echo -e " breaks Cisco L2 DKMS bridge modules, and causes QEMU node failures."
            echo -e ""
            echo -e " \033[1;32mCanonical Update Procedure:\033[0m"
            echo -e "   Please use the hardened AzamLabs one-step update command:"
            echo -e "       \033[1;33msudo azam-update\033[0m"
            echo -e ""
            echo -e " \033[1;30m(Emergency override: add --force-azam-override to force execution)\033[0m"
            echo -e "\033[1;31m====================================================================\033[0m"
            exit 1
            ;;
        autoremove)
            echo -e "\033[1;31m====================================================================\033[0m"
            echo -e "\033[1;31m [BLOCKED] Do Not Try to AUTOREMOVE, this will BREAK AzamLabs.\033[0m"
            echo -e "\033[1;31m====================================================================\033[0m"
            echo -e " This command will purge 32-bit libraries (libc6-i386) and kernel"
            echo -e " headers essential for Cisco IOL/IOU emulation and DKMS drivers."
            echo -e ""
            echo -e " \033[1;30m(Emergency override: add --force-azam-override to force execution)\033[0m"
            echo -e "\033[1;31m====================================================================\033[0m"
            exit 1
            ;;
    esac
fi

# Pass through all safe commands (update, install, search, show, etc.)
exec "$REAL_BIN" "${ARGS[@]}"
WRAPPER_EOF

chmod 0755 "$APT_SYS_BIN"
ln -sf "$APT_SYS_BIN" "$APT_GET_SYS_BIN"
ln -sf "$APT_SYS_BIN" "$APT_LOCAL_BIN"
ln -sf "$APT_SYS_BIN" "$APT_GET_LOCAL_BIN"
log_ok "Protective wrappers engaged across /usr/bin and /usr/local/bin."

# Shell profile cache invalidator
cat > "$PROFILE_HOOK" << 'EOF_PROF'
hash -d apt apt-get 2>/dev/null || true
EOF_PROF
chmod 0644 "$PROFILE_HOOK"

# APT periodic update suppressions
cat > "$APT_CONF_HOOK" << 'CONF_EOF'
// AzamLabs Protective Configuration Hook
// Prevents non-interactive direct invocation of upgrade/autoremove
APT::Periodic::Update-Package-Lists "0";
APT::Periodic::Unattended-Upgrade "0";
APT::Periodic::Download-Upgradeable-Packages "0";
APT::Periodic::AutocleanInterval "0";
CONF_EOF
chmod 0644 "$APT_CONF_HOOK"
log_ok "APT configuration hooks and periodic upgrade suppressions applied."

# Mask unattended background timer services
for u in apt-daily.timer apt-daily-upgrade.timer unattended-upgrades.service; do
    systemctl stop "$u" 2>/dev/null || true
    systemctl mask "$u" 2>/dev/null || true
done
log_ok "Background systemd update timers permanently masked."

# Invalidate bash hash table in current subshell
hash -d apt apt-get 2>/dev/null || true

echo ""
echo "============================================================"
echo "    [SUCCESS] AzamLabs Safe APT Guard Successfully Active   "
echo "============================================================"
echo "  - 'apt upgrade'    : BLOCKED (Educational barrier active)"
echo "  - 'apt autoremove' : BLOCKED (32-bit IOL libraries protected)"
echo "  - 'apt update'     : ALLOWED (Safe index queries permitted)"
echo "  - 'apt install'    : ALLOWED (Benign package installations permitted)"
echo "  - Override Switch  : --force-azam-override"
echo "============================================================"
exit 0
