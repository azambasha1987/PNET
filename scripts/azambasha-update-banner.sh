#!/usr/bin/env bash
# ==============================================================================
# azambasha-update-banner.sh
# Universal Dynamic Console Banner Updater for Master & Satellite Nodes
# Auto-detects live IP, node role, polls for DHCP during boot, and refreshes /etc/issue.
# ==============================================================================

MAX_WAIT_SECONDS=15

# 1. Resolve Live IPv4 Address with Polling Support
resolve_live_ip() {
    local ip=""

    # Tier 0: Authoritative configured static IP check
    if [ -f "/etc/network/interfaces" ]; then
        local static_ip
        static_ip=$(awk '/iface pnet0 inet static/{flag=1; next} flag && /address/{print $2; exit}' /etc/network/interfaces 2>/dev/null || true)
        if [ -n "$static_ip" ]; then
            if ip -4 addr show dev pnet0 2>/dev/null | grep -qw "$static_ip"; then
                echo "$static_ip"
                return 0
            fi
        fi
    fi
    if [ -f "/etc/netplan/01-azamlabs-netcfg.yaml" ]; then
        local np_static_ip
        np_static_ip=$(grep -E 'addresses:\s*\[[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' /etc/netplan/01-azamlabs-netcfg.yaml 2>/dev/null | head -n1 | sed -E 's/.*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+).*/\1/' || true)
        [ -z "$np_static_ip" ] && np_static_ip=$(grep -E '^\s*-\s*[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' /etc/netplan/01-azamlabs-netcfg.yaml 2>/dev/null | head -n1 | sed -E 's/.*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+).*/\1/' || true)
        if [ -n "$np_static_ip" ]; then
            if ip -4 addr show dev pnet0 2>/dev/null | grep -qw "$np_static_ip"; then
                echo "$np_static_ip"
                return 0
            fi
        fi
    fi

    # Tier 1: pnet0 bridge IPv4
    ip=$(ip -4 addr show dev pnet0 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | grep -v '^127\.' | grep -v '^169\.254\.' | head -n1)
    if [ -n "$ip" ]; then
        echo "$ip"
        return 0
    fi

    # Tier 2: Interface handling default gateway route
    local def_iface
    def_iface=$(ip -4 route show default 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}' | head -n1)
    if [ -n "$def_iface" ]; then
        ip=$(ip -4 addr show dev "$def_iface" 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | grep -v '^127\.' | grep -v '^169\.254\.' | head -n1)
        if [ -n "$ip" ]; then
            echo "$ip"
            return 0
        fi
    fi

    # Tier 3: Any physical or primary bridge interface (ens*, enp*, eth*, eno*, br*)
    for iface in $(ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | cut -d'@' -f1); do
        case "$iface" in
            lo|docker*|veth*|virbr*|tun*|tap*|dummy*|wg*|zt*) continue ;;
            *)
                ip=$(ip -4 addr show dev "$iface" 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | grep -v '^127\.' | grep -v '^169\.254\.' | head -n1)
                if [ -n "$ip" ]; then
                    echo "$ip"
                    return 0
                fi
                ;;
        esac
    done

    # Tier 4: Fallback to non-loopback hostname -I
    ip=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^127\.' | grep -v '^169\.254\.' | grep -v '^172\.1[7-9]\.' | head -n1)
    if [ -n "$ip" ]; then
        echo "$ip"
        return 0
    fi

    return 1
}

get_ip() {
    local ip=""
    local elapsed=0

    # Wait for DHCP or network assignment if called during boot
    while [ $elapsed -lt $MAX_WAIT_SECONDS ]; do
        ip=$(resolve_live_ip || true)
        if [ -n "$ip" ] && [ "$ip" != "127.0.0.1" ]; then
            echo "$ip"
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done

    # Final attempt fallback
    ip=$(resolve_live_ip || true)
    if [ -n "$ip" ]; then
        echo "$ip"
    else
        echo "127.0.0.1"
    fi
}

HOST_IP="$(get_ip)"

# 2. Detect Node Role (Master Controller vs Satellite Worker Node)
ROLE="Master Controller"
if [ -f "/etc/azamlabs-role" ]; then
    DETECTED_ROLE="$(cat /etc/azamlabs-role 2>/dev/null || true)"
    [ "$DETECTED_ROLE" = "satellite" ] && ROLE="Satellite Worker Node"
    [ "$DETECTED_ROLE" = "master" ] && ROLE="Master Controller"
elif [ -f "/etc/pnetlab-role" ]; then
    DETECTED_ROLE="$(cat /etc/pnetlab-role 2>/dev/null || true)"
    [ "$DETECTED_ROLE" = "satellite" ] && ROLE="Satellite Worker Node"
    [ "$DETECTED_ROLE" = "master" ] && ROLE="Master Controller"
elif systemctl is-active --quiet azamlabs-satd 2>/dev/null || systemctl is-active --quiet pnetlab-satd 2>/dev/null || [ -f "/etc/azamlabs-satellite/satd.conf" ] || [ -f "/etc/pnetlab-satellite/satd.conf" ] || [ -f "/opt/unetlab/data/satellite.json" ]; then
    ROLE="Satellite Worker Node"
elif [ -d "/opt/unetlab/html" ] || [ -f "/etc/apache2/sites-available/azamlabs.conf" ]; then
    ROLE="Master Controller"
fi

# 3. Generate Formatted Banner
if [ "$ROLE" = "Satellite Worker Node" ]; then
    PAIR_STATUS="Ready for Master Pairing"
    if [ -f "/etc/azamlabs-satellite/satd.conf" ] && grep -q "master_ip" "/etc/azamlabs-satellite/satd.conf" 2>/dev/null; then
        MASTER_HOST=$(grep -o '"master_ip"[^,]*' /etc/azamlabs-satellite/satd.conf | cut -d'"' -f4)
        [ -n "$MASTER_HOST" ] && PAIR_STATUS="Paired with Master (${MASTER_HOST})"
    elif [ -f "/etc/pnetlab-satellite/satd.conf" ] && grep -q "master_ip" "/etc/pnetlab-satellite/satd.conf" 2>/dev/null; then
        MASTER_HOST=$(grep -o '"master_ip"[^,]*' /etc/pnetlab-satellite/satd.conf | cut -d'"' -f4)
        [ -n "$MASTER_HOST" ] && PAIR_STATUS="Paired with Master (${MASTER_HOST})"
    elif [ -f "/opt/unetlab/data/satellite.json" ] && grep -q "master_ip" "/opt/unetlab/data/satellite.json" 2>/dev/null; then
        MASTER_HOST=$(grep -o '"master_ip"[^,]*' /opt/unetlab/data/satellite.json | cut -d'"' -f4)
        [ -n "$MASTER_HOST" ] && PAIR_STATUS="Paired with Master (${MASTER_HOST})"
    fi

    cat > /etc/issue << EOF

============================================================
           Azam Basha v8 Virtual Network Emulator
============================================================
  Role            : ${ROLE}
  Status          : ${PAIR_STATUS}
  SSH Management  : ssh root@${HOST_IP} (Password: azam)
============================================================

\S (\l)

EOF
else
    cat > /etc/issue << EOF

============================================================
           Azam Basha v8 Virtual Network Emulator
============================================================
  Role            : ${ROLE}
  Web UI Access   : https://${HOST_IP}/
  Default User    : admin
  Default Pass    : azam
  SSH Management  : ssh root@${HOST_IP} (Password: azam)
============================================================

\S (\l)

EOF
fi

cp -f /etc/issue /etc/issue.net 2>/dev/null || true
echo "[azambasha-banner] Role: ${ROLE} | Updated /etc/issue -> IP: ${HOST_IP}"

# 4. Deploy Dynamic AzamLabs MOTD for SSH Sessions
mkdir -p /etc/update-motd.d /opt/unetlab/scripts/motd 2>/dev/null || true

# Purge legacy upstream MOTD scripts and noisy stock ads
LEGACY_NAME="$(printf '%s%s' 'pnet' 'lab')"
rm -f /etc/update-motd.d/*"${LEGACY_NAME}"* /opt/unetlab/scripts/motd/*"${LEGACY_NAME}"* 2>/dev/null || true
rm -f /etc/update-motd.d/??-pnet* /opt/unetlab/scripts/motd/??-pnet* 2>/dev/null || true
chmod -x /etc/update-motd.d/10-help-text /etc/update-motd.d/50-motd-news 2>/dev/null || true

# Generate AzamLabs Header
cat > /etc/update-motd.d/00-azamlabs-header << 'EOF'
#!/bin/sh
# AzamLabs MOTD Header
set -u

if [ -t 1 ] && [ "${TERM:-dumb}" != dumb ] && [ -n "${TERM:-}" ]; then
    BOLD=$(printf '\033[1m')
    CYAN=$(printf '\033[36m')
    DIM=$(printf '\033[90m')
    RESET=$(printf '\033[0m')
else
    BOLD=
    CYAN=
    DIM=
    RESET=
fi

VERSION=$(dpkg-query -W -f='${Version}' azamlabs 2>/dev/null || true)
[ -z "$VERSION" ] && VERSION=$(grep '^PACKAGE_VERSION=' /etc/azamlabs-version 2>/dev/null | cut -d= -f2 || true)
[ -z "$VERSION" ] && VERSION=$(grep '^VERSION=' /etc/azamlabs-version 2>/dev/null | cut -d= -f2 || true)
[ -z "$VERSION" ] && VERSION="6.8.87resolute1"

printf '\n'
printf '%s%s AzamLabs v8.2%s%s - engine %s - network labs, wire-rate fun%s\n' \
    "$BOLD" "$CYAN" "$RESET" "$CYAN" "$VERSION" "$RESET"
printf '%s%s%s\n' "$DIM" ' Console personality: enabled; management: local and explicit.' "$RESET"
EOF
chmod 0755 /etc/update-motd.d/00-azamlabs-header 2>/dev/null || true

# Generate AzamLabs Appliance Status & Management Guidance
cat > /etc/update-motd.d/10-azamlabs-status << 'EOF'
#!/bin/sh
# AzamLabs Appliance Status & Management Guidance
set -u

if [ -t 1 ] && [ "${TERM:-dumb}" != dumb ] && [ -n "${TERM:-}" ]; then
    BOLD=$(printf '\033[1m')
    CYAN=$(printf '\033[36m')
    GREEN=$(printf '\033[32m')
    YELLOW=$(printf '\033[33m')
    DIM=$(printf '\033[90m')
    RESET=$(printf '\033[0m')
else
    BOLD=
    CYAN=
    GREEN=
    YELLOW=
    DIM=
    RESET=
fi

VERSION=$(dpkg-query -W -f='${Version}' azamlabs 2>/dev/null || true)
[ -z "$VERSION" ] && VERSION=$(grep '^PACKAGE_VERSION=' /etc/azamlabs-version 2>/dev/null | cut -d= -f2 || true)
[ -z "$VERSION" ] && VERSION=$(grep '^VERSION=' /etc/azamlabs-version 2>/dev/null | cut -d= -f2 || true)
[ -z "$VERSION" ] && VERSION="6.8.87resolute1"

MGMT_IP=
if command -v ip >/dev/null 2>&1; then
    MGMT_IP=$(ip -4 -o addr show dev pnet0 scope global 2>/dev/null \
        | awk '{ split($4, address, "/"); print address[1]; exit }' || true)
    if [ -z "$MGMT_IP" ]; then
        def_iface=$(ip -4 route show default 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}' | head -n1)
        if [ -n "$def_iface" ]; then
            MGMT_IP=$(ip -4 addr show dev "$def_iface" 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -n1)
        fi
    fi
fi

if [ -n "$MGMT_IP" ]; then
    MGMT_IP_SHOWN="${GREEN}${MGMT_IP}${RESET}"
else
    MGMT_IP="not configured"
    MGMT_IP_SHOWN="${YELLOW}not configured${RESET}"
fi

UPTIME_SECONDS=$(awk -F. '{ print $1 }' /proc/uptime 2>/dev/null || printf '0')
case "$UPTIME_SECONDS" in
    ''|*[!0-9]*) UPTIME_SECONDS=0 ;;
esac
UPTIME_DAYS=$((UPTIME_SECONDS / 86400))
UPTIME_HOURS=$(( (UPTIME_SECONDS % 86400) / 3600))
UPTIME_MINUTES=$(( (UPTIME_SECONDS % 3600) / 60))

NODE_COUNT=unavailable
if command -v pgrep >/dev/null 2>&1; then
    NODE_COUNT=$(pgrep -fc '(^|/)(qemu-system-|docker|dynamips|iol)' 2>/dev/null || true)
    case "$NODE_COUNT" in
        ''|*[!0-9]*) NODE_COUNT=0 ;;
    esac
fi

if grep -Eq '(^|[[:space:]])(vmx|svm)([[:space:]]|$)' /proc/cpuinfo 2>/dev/null; then
    HW_ACCEL="${GREEN}VT-x/AMD-V available${RESET}"
else
    HW_ACCEL="${DIM}VT-x/AMD-V unavailable${RESET}"
fi

ROLE="Master Controller"
if [ -f /etc/azamlabs-role ]; then
    ROLE="$(cat /etc/azamlabs-role 2>/dev/null || echo "Master Controller")"
fi

printf '\n%s%s Appliance status%s\n' "$BOLD" "$CYAN" "$RESET"
if [ "$ROLE" = "satellite" ] || [ "$ROLE" = "Satellite Worker Node" ]; then
    printf '   %sRole         %s%sSatellite Worker Node%s\n' "$DIM" "$RESET" "$CYAN" "$RESET"
else
    printf '   %sWeb UI       %shttps://%s/%s\n' "$DIM" "$RESET" "$MGMT_IP" "$RESET"
fi
printf '   %sMgmt IP      %s%s (pnet0)\n' "$DIM" "$RESET" "$MGMT_IP_SHOWN"
printf '   %sEngine       %s%s\n' "$DIM" "$RESET" "$VERSION"
printf '   %sUptime       %s%sd %sh %sm\n' "$DIM" "$RESET" "$UPTIME_DAYS" "$UPTIME_HOURS" "$UPTIME_MINUTES"
printf '   %sLab nodes    %s%s running%s (process count, approximate)\n' "$DIM" "$RESET" "$NODE_COUNT" "$RESET"
printf '   %sHardware     %s%s\n' "$DIM" "$RESET" "$HW_ACCEL"

printf '\n%s%s Platform management%s\n' "$BOLD" "$CYAN" "$RESET"
printf '   %ssudo azam-update%s              %sRun official AzamLabs system update & check%s\n' "$GREEN" "$RESET" "$DIM" "$RESET"
printf '   %sazam-health%s                   %sCheck health of emulators, bridges, and services%s\n' "$GREEN" "$RESET" "$DIM" "$RESET"
printf '   %sazam-menu%s                     %sOpen interactive platform administration console%s\n' "$GREEN" "$RESET" "$DIM" "$RESET"
printf '\n'
EOF
chmod 0755 /etc/update-motd.d/10-azamlabs-status 2>/dev/null || true

# Generate AzamLabs Fortune / Personality Quote
cat > /etc/update-motd.d/90-azamlabs-fortune << 'EOF'
#!/bin/sh
# AzamLabs Console Personality & Network Humor
set -u

if [ -t 1 ] && [ "${TERM:-dumb}" != dumb ] && [ -n "${TERM:-}" ]; then
    BOLD=$(printf '\033[1m')
    MAGENTA=$(printf '\033[35m')
    RESET=$(printf '\033[0m')
else
    BOLD=
    MAGENTA=
    RESET=
fi

POOL=/opt/unetlab/scripts/motd-fortunes.txt
COUNT=$(wc -l < "$POOL" 2>/dev/null || printf '0')
case "$COUNT" in
    ''|*[!0-9]*) COUNT=0 ;;
esac
if [ "$COUNT" -gt 0 ]; then
    DAY=$(date +%j)
    LINE=$(sed -n "$(( (DAY * 7 + $$) % COUNT + 1 ))p" "$POOL")
else
    LINE='Why did the packet cross the network? It had a default route.'
fi

printf '   %s%s-- %s%s\n\n' "$BOLD" "$MAGENTA" "$LINE" "$RESET"
EOF
chmod 0755 /etc/update-motd.d/90-azamlabs-fortune 2>/dev/null || true

# Mirror to /opt/unetlab/scripts/motd/ for administrative consistency
cp -f /etc/update-motd.d/00-azamlabs-header /opt/unetlab/scripts/motd/00-azamlabs-header 2>/dev/null || true
cp -f /etc/update-motd.d/10-azamlabs-status /opt/unetlab/scripts/motd/10-azamlabs-status 2>/dev/null || true
cp -f /etc/update-motd.d/90-azamlabs-fortune /opt/unetlab/scripts/motd/90-azamlabs-fortune 2>/dev/null || true
echo "[azambasha-banner] Deployed dynamic AzamLabs SSH MOTD (/etc/update-motd.d/)"

# Refresh /run/motd.dynamic immediately so active and next SSH sessions see the new banner
if command -v run-parts >/dev/null 2>&1 && [ -d /etc/update-motd.d ]; then
    run-parts --lsbsysinit /etc/update-motd.d > /run/motd.dynamic 2>/dev/null || true
fi

# 5. Refresh Active TTY Console so the banner updates on screen immediately
if [ -c /dev/tty1 ]; then
    pkill -HUP -f 'agetty.*tty1' 2>/dev/null || true
fi
