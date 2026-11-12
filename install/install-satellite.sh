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
    docker.io 2>/dev/null || true

echo "[3/5] Installing PNetLab Satellite packages for $VERSION..."
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

dpkg -i "${DEB_LIST[@]}" || apt-get install -f -y 2>/dev/null || true

# Ensure usr-merge integrity: /lib must always be a symlink to usr/lib
if [ ! -L /lib ] && [ -d /usr/lib ]; then
    echo "Preserving usr-merge: migrating unmerged /lib into /usr/lib..."
    cp -a /lib/* /usr/lib/ 2>/dev/null || true
    rm -rf /lib
    ln -s usr/lib /lib
fi

# Lock satellite packages against autoremove
apt-mark manual pnetlab-satellite pnetlab-bridge-dkms pnetlab-vpcs pnetlab-docker pnetlab-qemu 2>/dev/null || true

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

# 3. Deploy systemd cloud bridges unit and enable it Before=networking.service
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

echo "[5/5] Starting satellite services..."
systemctl daemon-reload || true

echo "=========================================================="
echo " PNetLab Satellite Installation Completed!"
echo " Release: $VERSION"
echo " CLI Tools: Run 'pnet-health' or 'pnet-satellite-join' to manage node"
echo " To connect this node to your Master Controller:"
echo "   sudo pnet-satellite-join --master <MASTER_IP> --psk <CLUSTER_KEY>"
echo "=========================================================="
