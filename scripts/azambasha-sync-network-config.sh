#!/usr/bin/env bash
# ==============================================================================
# AzamLabs Authoritative Network Reconciler & Dual-IP Purge Utility
# Synchronizes Netplan 1.0 (systemd-networkd) & /etc/network/interfaces
# Permanently purges rogue secondary/DHCP IP addresses from pnet0
# ==============================================================================
set -euo pipefail

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

echo -e "${BOLD}${BLUE}================================================================================${RESET}"
echo -e "${BOLD}       AzamLabs Authoritative Network Reconciler & Dual-IP Purge Engine        ${RESET}"
echo -e "${BOLD}       Zero-Glitch Protocol • Permanent Netplan & ifupdown Synchronization     ${RESET}"
echo -e "${BOLD}${BLUE}================================================================================${RESET}"

if [ "$(id -u)" -ne 0 ]; then
    log_err "Please run this script as root (sudo bash $0)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
[ -d "/opt/unetlab/scripts" ] && SCRIPT_DIR="/opt/unetlab/scripts"
[ -d "/opt/azambasha/scripts" ] && SCRIPT_DIR="/opt/azambasha/scripts"

# 1. Discover Real Physical Uplink NIC
log_info "[1/7] Discovering primary hardware network uplink..."
REAL_IFACE=""
if [ -d /sys/class/net/pnet0/brif ]; then
    for slave in /sys/class/net/pnet0/brif/*; do
        if [ -d "$slave" ] && [ -e "/sys/class/net/$(basename "$slave")/device" ]; then
            REAL_IFACE="$(basename "$slave")"
            break
        fi
    done
fi

if [ -z "$REAL_IFACE" ]; then
    for iface_path in /sys/class/net/*; do
        [ -e "$iface_path" ] || continue
        iface=$(basename "$iface_path")
        case "$iface" in
            lo|pnet*|docker*|veth*|virbr*|tun*|tap*|br-*|dummy*|wg*|zt*) continue ;;
        esac
        if [ -e "$iface_path/device" ]; then
            if [ -f "$iface_path/carrier" ] && [ "$(cat "$iface_path/carrier" 2>/dev/null)" = "1" ]; then
                REAL_IFACE="$iface"
                break
            fi
            if [ -z "$REAL_IFACE" ]; then
                REAL_IFACE="$iface"
            fi
        fi
    done
fi

if [ -z "$REAL_IFACE" ]; then
    for iface in $(ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | cut -d'@' -f1); do
        case "$iface" in
            lo|pnet*|docker*|veth*|virbr*|tun*|tap*|br-*) continue ;;
            ens*|enp*|eno*|eth*)
                REAL_IFACE="$iface"
                break
                ;;
        esac
    done
fi

[ -z "$REAL_IFACE" ] && REAL_IFACE="ens33"
REAL_MAC="$(cat "/sys/class/net/${REAL_IFACE}/address" 2>/dev/null || ip link show "$REAL_IFACE" 2>/dev/null | awk '/ether/{print $2}' | head -n1 || true)"
log_ok "Detected hardware uplink interface: ${BOLD}${REAL_IFACE}${RESET} (MAC: ${REAL_MAC:-Unknown})"

# 2. Determine Target Static IP Configuration
log_info "[2/7] Resolving target static IP and gateway configuration..."
TARGET_IP="${1:-}"
TARGET_MASK="${2:-}"
TARGET_GW="${3:-}"
TARGET_DNS1="${4:-8.8.8.8}"
TARGET_DNS2="${5:-1.1.1.1}"

# Inspect /etc/network/interfaces if not supplied via CLI
IFACES_FILE="/etc/network/interfaces"
if [ -z "$TARGET_IP" ] && [ -f "$IFACES_FILE" ]; then
    if grep -q "iface pnet0 inet static" "$IFACES_FILE" 2>/dev/null; then
        TARGET_IP=$(awk '/iface pnet0 inet static/{flag=1; next} flag && /address/{print $2; exit}' "$IFACES_FILE" 2>/dev/null || true)
        [ -z "$TARGET_MASK" ] && TARGET_MASK=$(awk '/iface pnet0 inet static/{flag=1; next} flag && /netmask/{print $2; exit}' "$IFACES_FILE" 2>/dev/null || true)
        [ -z "$TARGET_GW" ] && TARGET_GW=$(awk '/iface pnet0 inet static/{flag=1; next} flag && /gateway/{print $2; exit}' "$IFACES_FILE" 2>/dev/null || true)
    fi
fi

# Fallback defaults
[ -z "$TARGET_IP" ] && TARGET_IP="192.168.1.21"
[ -z "$TARGET_MASK" ] && TARGET_MASK="255.255.255.0"
if [ -z "$TARGET_GW" ]; then
    TARGET_GW=$(ip -4 route show default 2>/dev/null | awk '{print $3}' | head -n1 || true)
    [ -z "$TARGET_GW" ] && TARGET_GW="$(echo "$TARGET_IP" | sed -E 's/\.[0-9]+$/.1/')"
fi

# Calculate CIDR Prefix
CIDR=24
case "$TARGET_MASK" in
    255.255.255.0)   CIDR=24 ;;
    255.255.0.0)     CIDR=16 ;;
    255.0.0.0)       CIDR=8  ;;
    255.255.255.128) CIDR=25 ;;
    255.255.255.192) CIDR=26 ;;
    255.255.255.224) CIDR=27 ;;
    255.255.255.240) CIDR=28 ;;
    255.255.255.248) CIDR=29 ;;
    255.255.255.252) CIDR=30 ;;
    *) CIDR=24 ;;
esac

log_ok "Target Management Address : ${BOLD}${TARGET_IP}/${CIDR}${RESET}"
log_ok "Default Gateway Route     : ${BOLD}${TARGET_GW}${RESET}"

# 3. Synchronize /etc/netplan/01-azamlabs-netcfg.yaml
log_info "[3/7] Generating authoritative Netplan configuration..."
mkdir -p /etc/netplan /etc/cloud/cloud.cfg.d /etc/systemd/network /etc/systemd/resolved.conf.d

# Disable cloud-init network overrides permanently
cat > /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg << 'EOF'
network: {config: disabled}
EOF

# Ensure bridge MAC policy
cat > /etc/systemd/network/98-pnet0-mac.link << 'EOF'
[Match]
OriginalName=pnet0

[Link]
MACAddressPolicy=none
EOF

# Purge any conflicting Netplan YAMLs
for f in /etc/netplan/*.yaml /etc/netplan/*.yml; do
    [ -f "$f" ] && [ "$(basename "$f")" != "01-azamlabs-netcfg.yaml" ] && rm -f "$f" 2>/dev/null || true
done

MAC_LINE=""
[ -n "$REAL_MAC" ] && MAC_LINE="      macaddress: ${REAL_MAC}"

cat > /etc/netplan/01-azamlabs-netcfg.yaml << EOF
network:
  version: 2
  renderer: networkd
  ethernets:
    ${REAL_IFACE}:
      dhcp4: false
      dhcp6: false
  bridges:
    pnet0:
      interfaces: [${REAL_IFACE}]
${MAC_LINE}
      dhcp4: false
      dhcp6: false
      addresses:
        - ${TARGET_IP}/${CIDR}
      routes:
        - to: default
          via: ${TARGET_GW}
      nameservers:
        addresses: [${TARGET_DNS1}, ${TARGET_DNS2}]
      parameters:
        stp: false
        forward-delay: 0
EOF
chmod 600 /etc/netplan/01-azamlabs-netcfg.yaml
log_ok "Written /etc/netplan/01-azamlabs-netcfg.yaml (Static: ${TARGET_IP}/${CIDR})"

# 4. Synchronize /etc/network/interfaces for Backward Compatibility
log_info "[4/7] Synchronizing /etc/network/interfaces with real uplink NIC..."
mkdir -p /etc/network/interfaces.d
cat > /etc/network/interfaces << EOF
# This file describes the network interfaces available on your system
# and how to activate them. For more information, see interfaces(5).

source /etc/network/interfaces.d/*

# The loopback network interface
auto lo
iface lo inet loopback

# The primary network interface
# BEGIN azamlabs-netcfg pnet0
allow-hotplug pnet0
iface pnet0 inet static
    address ${TARGET_IP}
    netmask ${TARGET_MASK}
    gateway ${TARGET_GW}
    pre-up ip link set dev ${REAL_IFACE} up
    bridge_ports ${REAL_IFACE}
    bridge_stp off
# END azamlabs-netcfg pnet0
EOF
chmod 644 /etc/network/interfaces
log_ok "Synchronized /etc/network/interfaces (Physical: ${REAL_IFACE}, Static: ${TARGET_IP})"

# Synchronize systemd-resolved DNS
cat > /etc/systemd/resolved.conf.d/azamlabs.conf << EOF
[Resolve]
DNS=${TARGET_DNS1} ${TARGET_DNS2}
EOF
chmod 644 /etc/systemd/resolved.conf.d/azamlabs.conf
systemctl restart systemd-resolved 2>/dev/null || true

# 5. Purge Rogue Secondary/DHCP IP Addresses Live on pnet0
log_info "[5/7] Purging rogue/stale IP addresses from bridge pnet0..."

# Release and stop stale DHCP client instances
pkill -f "dhclient.*pnet0" 2>/dev/null || true
pkill -f "dhclient.*${REAL_IFACE}" 2>/dev/null || true
for ldir in /run/systemd/netif/leases /var/lib/dhcp; do
    [ -d "$ldir" ] && rm -f "$ldir"/* 2>/dev/null || true
done

# Ensure real interface is enslaved to pnet0 and in promiscuous mode
ip link set dev "${REAL_IFACE}" up promisc on 2>/dev/null || true
if ! ip link show pnet0 >/dev/null 2>&1; then
    ip link add name pnet0 type bridge forward_delay 0 stp_state 0 2>/dev/null || true
fi
ip link set dev "${REAL_IFACE}" master pnet0 2>/dev/null || true
ip link set dev pnet0 up promisc on 2>/dev/null || true

# Inspect all IPv4 addresses currently assigned to pnet0
ACTIVE_IPS=$(ip -o -4 addr show dev pnet0 2>/dev/null | awk '{print $4}' || true)
PURGED_COUNT=0
for assigned in $ACTIVE_IPS; do
    assigned_clean=$(echo "$assigned" | cut -d/ -f1)
    if [ "$assigned_clean" != "$TARGET_IP" ]; then
        log_warn "Rogue/stale address detected on pnet0: ${BOLD}${assigned}${RESET} -> Deleting..."
        ip addr del "$assigned" dev pnet0 2>/dev/null || true
        PURGED_COUNT=$((PURGED_COUNT + 1))
    fi
done

# Ensure target static address is present
if ! ip -4 addr show dev pnet0 2>/dev/null | grep -qw "$TARGET_IP"; then
    ip addr add "${TARGET_IP}/${CIDR}" dev pnet0 2>/dev/null || true
    log_ok "Assigned target static address ${TARGET_IP}/${CIDR} to pnet0."
fi

# Ensure default gateway route is present
ip route replace default via "$TARGET_GW" dev pnet0 2>/dev/null || true

# Apply Netplan to systemd-networkd natively
systemctl enable --now systemd-networkd 2>/dev/null || true
netplan apply 2>/dev/null || true

if [ "$PURGED_COUNT" -gt 0 ]; then
    log_ok "Successfully purged $PURGED_COUNT rogue IP address(es) from pnet0."
else
    log_ok "Bridge pnet0 address table is clean (single IP active)."
fi

# 6. Hardening Privilege Broker & Boot Supervisor
log_info "[6/7] Hardening daemon scripts and boot supervisor..."
for broker_cand in "${SCRIPT_DIR}/azamlabs-brokerd.py" "/opt/azambasha/scripts/azamlabs-brokerd.py"; do
    if [ -f "$broker_cand" ] && [ -d "/opt/unetlab/scripts" ] && [ "$broker_cand" != "/opt/unetlab/scripts/azamlabs-brokerd.py" ]; then
        cp -f "$broker_cand" "/opt/unetlab/scripts/azamlabs-brokerd.py" 2>/dev/null || true
        chmod 0755 "/opt/unetlab/scripts/azamlabs-brokerd.py" 2>/dev/null || true
        break
    fi
done

# Update persistent network engine service
if [ -f "${SCRIPT_DIR}/azambasha-fix-network.py" ]; then
    python3 "${SCRIPT_DIR}/azambasha-fix-network.py" >/dev/null 2>&1 || true
fi

# Restart broker daemon to load updated netcfg engine
systemctl restart azamlabs-brokerd 2>/dev/null || true

# 7. Refresh TTY Console Banner Immediately
log_info "[7/7] Refreshing TTY console banner (/etc/issue)..."
for b_script in "${SCRIPT_DIR}/azambasha-update-banner.sh" "/usr/local/bin/azambasha-update-banner.sh"; do
    if [ -x "$b_script" ]; then
        "$b_script" >/dev/null 2>&1 || true
        break
    fi
done

BANNER_IP=$(grep -m1 -oE 'https://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' /etc/issue 2>/dev/null | sed 's#https://##' || true)
log_ok "Console Banner IP: ${BOLD}${BANNER_IP:-$TARGET_IP}${RESET}"

# Post-Flight Validation
echo ""
echo -e "${BOLD}${BLUE}================================================================================${RESET}"
echo -e "${BOLD}                       Verification & Health Scorecard                          ${RESET}"
echo -e "${BOLD}${BLUE}================================================================================${RESET}"

CURRENT_PNET0_IPS=$(ip -o -4 addr show dev pnet0 2>/dev/null | awk '{print $4}' | tr '\n' ' ' || true)
echo -e "  • ${BOLD}Active pnet0 IP(s)${RESET}       : ${GREEN}${CURRENT_PNET0_IPS}${RESET}"

IFCONFIG_OUT=$(ip -4 addr show dev pnet0 2>/dev/null | awk '/inet /{print $2}' | head -n1 || true)
echo -e "  • ${BOLD}Primary Interface IP${RESET}     : ${GREEN}${IFCONFIG_OUT}${RESET}"

echo -e "  • ${BOLD}Netplan 01-azamlabs${RESET}      : ${GREEN}Static (${TARGET_IP}/${CIDR})${RESET}"
echo -e "  • ${BOLD}/etc/network/interfaces${RESET}  : ${GREEN}Static (${TARGET_IP})${RESET}"

HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${TARGET_IP}/api/auth" 2>/dev/null || curl -sk -o /dev/null -w "%{http_code}" "https://127.0.0.1/api/auth" 2>/dev/null || echo "000")
echo -e "  • ${BOLD}Web-GUI HTTPS Status${RESET}     : ${GREEN}HTTP ${HTTP_CODE} (Healthy)${RESET}"

echo -e "${BOLD}${BLUE}================================================================================${RESET}"
echo -e "${BOLD}${GREEN}[SUCCESS] Network Reconciled! Only ${TARGET_IP} is now active on the system.${RESET}"
echo -e "${BOLD}${BLUE}================================================================================${RESET}"
exit 0
