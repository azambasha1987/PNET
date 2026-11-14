#!/usr/bin/env bash
#
# PNetLab Satellite Node Local Installer
# Installs PNetLab Satellite worker role from local release packages and
# automatically applies hypervisor optimizations and pnet-* CLI tooling.
#

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)." >&2
    exit 1
fi

# Normalize repository path symlinks (/opt/PNET <-> /opt/pnet)
if [ -d "/opt/PNET" ] && [ ! -e "/opt/pnet" ]; then
    ln -sfn /opt/PNET /opt/pnet 2>/dev/null || true
elif [ -d "/opt/pnet" ] && [ ! -e "/opt/PNET" ]; then
    ln -sfn /opt/pnet /opt/PNET 2>/dev/null || true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
    if [ -f "$REPO_ROOT/releases/channel-pointer.json" ]; then
        VERSION="$(grep -o '"release": *"[^"]*"' "$REPO_ROOT/releases/channel-pointer.json" | cut -d'"' -f4)"
    else
        echo "Error: No version provided and channel-pointer.json not found." >&2
        exit 1
    fi
fi

RELEASE_DIR="$REPO_ROOT/releases/$VERSION"
DEB_DIR="$RELEASE_DIR/debs"

if [ ! -d "$RELEASE_DIR" ]; then
    echo "Error: Target release directory '$RELEASE_DIR' does not exist." >&2
    exit 1
fi

echo "=========================================================="
echo " Starting PNetLab Satellite Node Installation"
echo " Release: $VERSION"
echo " Source:  $RELEASE_DIR"
echo "=========================================================="

echo "[1/5] Verifying release package integrity..."
bash "$SCRIPT_DIR/verify-packages.sh" "$VERSION"

echo "[2/5] Installing hypervisor and bridge dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y 2>/dev/null || true
apt-get install -y --no-install-recommends \
    bridge-utils \
    cpu-checker \
    tar \
    zstd \
    curl \
    git \
    libvirt-daemon-system \
    qemu-kvm \
    docker.io \
    php-cli \
    python3-pyroute2 \
    python3-psutil \
    python3-yaml \
    python3-pip \
    rsync \
    ifupdown 2>/dev/null || true

# Start and enable docker service immediately
systemctl enable --now docker 2>/dev/null || true
# Silence non-virtualization daemons that spam SCSI / modem warnings on VMs
systemctl disable --now multipathd ModemManager 2>/dev/null || true

echo "[3/5] Installing PNetLab Satellite packages for $VERSION..."
# If conflicting master package (pnetlab) is installed on this satellite node, remove it cleanly
if dpkg -s pnetlab >/dev/null 2>&1; then
    echo "Notice: Master package (pnetlab) detected on Satellite node. Removing master package..."
    dpkg -P --force-all pnetlab 2>/dev/null || true
fi

SATELLITE_DEBS=(
    "pnetlab-bridge-dkms_${VERSION}_all.deb"
    "pnetlab-vpcs_${VERSION}_amd64.deb"
    "pnetlab-docker_${VERSION}_amd64.deb"
    "pnetlab-qemu_${VERSION}_amd64.deb"
    "pnetlab-satellite_${VERSION}_amd64.deb"
)

DEB_LIST=()
for deb_name in "${SATELLITE_DEBS[@]}"; do
    deb_path="$DEB_DIR/$deb_name"
    if [ -f "$deb_path" ]; then
        DEB_LIST+=("$deb_path")
    else
        match=( "$DEB_DIR"/*"${deb_name#*_}" )
        [ -f "${match[0]}" ] && DEB_LIST+=("${match[0]}")
    fi
done

# 1. Direct payload unpack to guarantee all engine files exist
SAT_DEB="$DEB_DIR/pnetlab-satellite_${VERSION}_amd64.deb"
[ -f "$SAT_DEB" ] || SAT_DEB="$(ls -1 "$DEB_DIR"/pnetlab-satellite*.deb 2>/dev/null | head -n1)"
if [ -f "$SAT_DEB" ]; then
    echo "Unpacking PNetLab satellite payload directly to filesystem..."
    dpkg -x "$SAT_DEB" / 2>/dev/null || dpkg-deb -x "$SAT_DEB" / 2>/dev/null || true
fi

# Ensure usr-merge integrity: /lib must always be a symlink to usr/lib
if [ ! -L /lib ] && [ -d /usr/lib ]; then
    echo "Preserving usr-merge: migrating unmerged /lib into /usr/lib..."
    cp -a /lib/* /usr/lib/ 2>/dev/null || true
    rm -rf /lib
    ln -s usr/lib /lib
fi

# 2. Install satellite packages with --force-all to bypass dependency naming quirks (e.g. docker.io vs docker-ce)
dpkg -i --force-all "${DEB_LIST[@]}" 2>/dev/null || true
apt-get install -f -y 2>/dev/null || true

# Final usr-merge check after dpkg
if [ ! -L /lib ] && [ -d /usr/lib ]; then
    echo "Preserving usr-merge after dpkg: migrating unmerged /lib into /usr/lib..."
    cp -a /lib/* /usr/lib/ 2>/dev/null || true
    rm -rf /lib
    ln -s usr/lib /lib
fi

# Lock satellite packages against autoremove
apt-mark manual pnetlab-satellite pnetlab-bridge-dkms pnetlab-vpcs pnetlab-docker pnetlab-qemu 2>/dev/null || true

# Proactively compile and install pnetlab-bridge DKMS for current kernel (including 7.0.0-43+)
if [ -f /usr/src/pnetlab-bridge-1.0/dkms.conf ]; then
    echo "Configuring pnetlab-bridge DKMS for Linux 7.0 kernel..."
    sed -i 's/(14|30|31|38|42)/(14|30|31|38|42|43|44|45)/' /usr/src/pnetlab-bridge-1.0/dkms.conf 2>/dev/null || true
    CURRENT_KVER="$(uname -r 2>/dev/null || true)"
    if [ -n "$CURRENT_KVER" ]; then
        dkms build -m pnetlab-bridge -v 1.0 -k "$CURRENT_KVER" 2>/dev/null || true
        dkms install -m pnetlab-bridge -v 1.0 -k "$CURRENT_KVER" 2>/dev/null || true
        update-initramfs -u -k "$CURRENT_KVER" 2>/dev/null || true
    fi
fi

# Proactive hypervisor virtual NIC kernel driver provisioning
mkdir -p /etc/modules-load.d
cat << 'NIC_EOF' > /etc/modules-load.d/pnet-hypervisor-nics.conf
# Hypervisor virtual NIC drivers for PNetLab Satellite
pcnet32
e1000
e1000e
vmxnet3
virtio_net
NIC_EOF

for mod in pcnet32 e1000 e1000e vmxnet3 virtio_net; do
    modprobe "$mod" 2>/dev/null || true
done

echo "[4/5] Applying satellite optimization scripts and Custom Features for $VERSION..."
if [ -d "$REPO_ROOT/scripts" ]; then
    mkdir -p /opt/unetlab/scripts
    cp -rf "$REPO_ROOT/scripts/." /opt/unetlab/scripts/
    chmod +x /opt/unetlab/scripts/*.sh /opt/unetlab/scripts/*.py 2>/dev/null || true
    # Standardize socket and configuration directory symlinks
    mkdir -p /run/pnetlab /etc/pnetlab-satellite /etc/azamlabs-satellite 2>/dev/null || true
    ln -sfn /run/pnetlab /run/azamlabs 2>/dev/null || true
fi

# ==============================================================================
# Universal Network Modernization & First-Boot "eth0 not found" Permanent Fix
# ==============================================================================
echo "Enforcing universal network interface stability & first-boot protection..."

# 1. Instruct kernel to use consistent eth0 device naming across all hypervisors
if [ -f /etc/default/grub ]; then
    CHANGED_GRUB=0
    if ! grep -q "net.ifnames=0" /etc/default/grub; then
        sed -i 's/GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="net.ifnames=0 biosdevname=0 /' /etc/default/grub 2>/dev/null || true
        sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="/GRUB_CMDLINE_LINUX_DEFAULT="net.ifnames=0 biosdevname=0 /' /etc/default/grub 2>/dev/null || true
        CHANGED_GRUB=1
    fi
    if ! grep -q "biosdevname=0" /etc/default/grub; then
        sed -i 's/GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="biosdevname=0 /' /etc/default/grub 2>/dev/null || true
        CHANGED_GRUB=1
    fi
    if [ "$CHANGED_GRUB" -eq 1 ] && command -v update-grub >/dev/null 2>&1; then
        echo "Updating GRUB with kernel net.ifnames=0 biosdevname=0..."
        update-grub 2>/dev/null || true
    fi
fi

# 2. Permanently neutralize legacy OVF first-boot dialog trap
mkdir -p /opt/ovf /etc/profile.d 2>/dev/null || true
SYSTEM_UUID="$(dmidecode -s system-uuid 2>/dev/null || true)"
if [ -n "$SYSTEM_UUID" ]; then
    echo "$SYSTEM_UUID" > /opt/ovf/.configured
else
    touch /opt/ovf/.configured
fi
chmod 644 /opt/ovf/.configured 2>/dev/null || true

# Neutralize interactive login wizard in /etc/profile.d/ovf.sh
cat << 'OVF_EOF' > /etc/profile.d/ovf.sh
# PNetLab: Auto-prompt neutralized permanently by installer
return 0 2>/dev/null || true
OVF_EOF
chmod 644 /etc/profile.d/ovf.sh 2>/dev/null || true

# 3. Deploy universal MAC-agnostic Netplan configuration bridging uplink into pnet0
if command -v netplan >/dev/null 2>&1; then
    UPLINK_IFACE=""
    for iface in $(ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | cut -d'@' -f1); do
        case "$iface" in
            lo|pnet*|docker*|veth*|virbr*|tun*|tap*|br-*) continue ;;
            eth*|ens*|enp*|eno*)
                UPLINK_IFACE="$iface"
                break
                ;;
        esac
    done
    [ -z "$UPLINK_IFACE" ] && UPLINK_IFACE="eth0"

    # Only generate if pnet0 bridge is not already configured in netplan
    if ! grep -q "pnet0" /etc/netplan/*.yaml /etc/netplan/*.yml 2>/dev/null; then
        DETECTED_IP="$(ip -4 addr show dev "$UPLINK_IFACE" 2>/dev/null | awk '/inet /{print $2}' | head -n1 || true)"
        DETECTED_GW="$(ip -4 route show default 2>/dev/null | awk '{print $3}' | head -n1 || true)"
        [ -z "$DETECTED_GW" ] && DETECTED_GW="192.168.1.1"

        # Backup existing netplan files to prevent duplicate interface declarations
        mkdir -p /opt/unetlab/data/netcfg-backups /etc/netplan 2>/dev/null || true
        for f in /etc/netplan/*.yaml /etc/netplan/*.yml; do
            [ -f "$f" ] && [ "$(basename "$f")" != "01-azamlabs-netcfg.yaml" ] && cp -f "$f" /opt/unetlab/data/netcfg-backups/ 2>/dev/null && rm -f "$f" 2>/dev/null || true
        done

        if [ -n "$DETECTED_IP" ]; then
            cat << NETPLAN_EOF > /etc/netplan/01-azamlabs-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ${UPLINK_IFACE}:
      dhcp4: false
      dhcp6: false
  bridges:
    pnet0:
      interfaces:
        - ${UPLINK_IFACE}
      addresses:
        - ${DETECTED_IP}
      routes:
        - to: default
          via: ${DETECTED_GW}
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
      parameters:
        stp: false
        forward-delay: 0
NETPLAN_EOF
        else
            cat << NETPLAN_EOF > /etc/netplan/01-azamlabs-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ${UPLINK_IFACE}:
      dhcp4: false
      dhcp6: false
  bridges:
    pnet0:
      interfaces:
        - ${UPLINK_IFACE}
      dhcp4: true
      dhcp6: false
      parameters:
        stp: false
        forward-delay: 0
NETPLAN_EOF
        fi
        chmod 600 /etc/netplan/01-azamlabs-netcfg.yaml
        netplan generate 2>/dev/null || true
        netplan apply 2>/dev/null || true

        # Critical safeguard: ensure physical uplink is immediately enslaved to pnet0 so active SSH connection never drops
        ip link set "$UPLINK_IFACE" master pnet0 2>/dev/null || true
        ip link set "$UPLINK_IFACE" up 2>/dev/null || true
        ip link set pnet0 up 2>/dev/null || true
    fi
fi

# 4. Deploy systemd cloud bridges unit and enable it Before=networking.service
if [ -f "$REPO_ROOT/scripts/pnet-bridges.sh" ]; then
    cp -f "$REPO_ROOT/scripts/pnet-bridges.sh" /opt/ovf/pnet-bridges.sh 2>/dev/null || true
fi
if [ -f "$REPO_ROOT/scripts/pnetlab-pnet-bridges.service" ]; then
    cp -f "$REPO_ROOT/scripts/pnetlab-pnet-bridges.service" /etc/systemd/system/pnetlab-pnet-bridges.service 2>/dev/null || true
    systemctl daemon-reload 2>/dev/null || true
    systemctl enable pnetlab-pnet-bridges.service 2>/dev/null || true
fi
chmod 755 /opt/ovf/pnet-bridges.sh 2>/dev/null || true
[ -x /opt/ovf/pnet-bridges.sh ] && /bin/bash /opt/ovf/pnet-bridges.sh 2>/dev/null || true

# Apply all Tri-Pillar Custom Subsystems in Satellite mode (QEMU templates, pnet-* CLI tools, Ultra-KSM, watchdog)
if [ -f "$REPO_ROOT/apply-all-custom.sh" ]; then
    bash "$REPO_ROOT/apply-all-custom.sh" --satellite || true
elif [ -f "$REPO_ROOT/Custom-Features/apply-features.sh" ]; then
    bash "$REPO_ROOT/Custom-Features/apply-features.sh" --satellite || true
fi

# Prepare satdeb staging directory and symlink for cluster package sync
mkdir -p /opt/unetlab/satdeb
chmod 0755 /opt/unetlab/satdeb
rm -rf /root/satdeb 2>/dev/null || true
ln -sfn /opt/unetlab/satdeb /root/satdeb 2>/dev/null || true

echo "[5/5] Starting satellite services..."
systemctl daemon-reload || true
systemctl unmask pnetlab-satd.service 2>/dev/null || true
systemctl enable pnetlab-satd.service 2>/dev/null || true
systemctl start pnetlab-satd.service 2>/dev/null || true

echo "=========================================================="
echo " PNetLab Satellite Installation Completed!"
echo " Release: $VERSION"
echo " CLI Tools: Run 'pnet-health' or 'pnet-satellite-join' to manage node"
echo " To connect this node to your Master Controller:"
echo "   sudo pnet-satellite-join --master <MASTER_IP> --psk <CLUSTER_KEY>"
echo "=========================================================="
