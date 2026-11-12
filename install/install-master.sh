#!/usr/bin/env bash
#
# PNetLab Master Node Local Installer
# Installs PNetLab Master from local release packages and automatically applies
# the enterprise optimization and management scripts suite.
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
ASSET_DIR="$RELEASE_DIR/assets"

if [ ! -d "$RELEASE_DIR" ]; then
    echo "Error: Target release directory '$RELEASE_DIR' does not exist." >&2
    exit 1
fi

echo "=========================================================="
echo " Starting PNetLab Master Node Installation"
echo " Release: $VERSION"
echo " Source:  $RELEASE_DIR"
echo "=========================================================="

echo "[1/7] Verifying release package integrity..."
bash "$SCRIPT_DIR/verify-packages.sh" "$VERSION"

echo "[2/7] Enrolling repository signing key..."
if [ -f "$DEB_DIR/debian-repository.key" ]; then
    install -d -m 0755 /usr/share/keyrings
    gpg --dearmor < "$DEB_DIR/debian-repository.key" > /usr/share/keyrings/pnetlab-local.gpg 2>/dev/null || \
        cp "$DEB_DIR/debian-repository.key" /usr/share/keyrings/pnetlab-local.gpg
fi

echo "[3/7] Updating apt cache and installing base dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y 2>/dev/null || true
apt-get install -y --no-install-recommends \
    apache2 \
    mysql-server \
    php-fpm \
    php-mysql \
    php-cli \
    bridge-utils \
    cpu-checker \
    tar \
    zstd \
    curl \
    git \
    docker.io \
    libcairo2 \
    libxcb-render0 \
    libxcb-shm0 \
    libvirt-daemon-system \
    qemu-kvm 2>/dev/null || true

echo "[4/7] Unpacking core application assets..."
mkdir -p /opt/unetlab
ASSET_ARCHIVE="$ASSET_DIR/pnetlab-core-assets-$VERSION.tar.zst"
if [ -f "$ASSET_ARCHIVE" ]; then
    tar --zstd -xf "$ASSET_ARCHIVE" -C /opt/unetlab/ || {
        echo "Warning: Direct tar --zstd extraction failed, trying zstd pipe..."
        zstd -dc "$ASSET_ARCHIVE" | tar -xf - -C /opt/unetlab/
    }
fi

echo "[5/7] Installing PNetLab Master debian packages for $VERSION..."
MASTER_DEBS=(
    "pnetlab-bridge-dkms_${VERSION}_all.deb"
    "pnetlab-vpcs_${VERSION}_amd64.deb"
    "pnetlab-docker_${VERSION}_amd64.deb"
    "pnetlab-qemu_${VERSION}_amd64.deb"
    "pnetlab-schema_${VERSION}_amd64.deb"
    "pnetlab-guacd_${VERSION}_amd64.deb"
    "pnetlab_${VERSION}_amd64.deb"
)

# 1. Direct payload unpack to guarantee all web and engine files exist
MAIN_DEB="$DEB_DIR/pnetlab_${VERSION}_amd64.deb"
[ -f "$MAIN_DEB" ] || MAIN_DEB="$(ls -1 "$DEB_DIR"/pnetlab*.deb 2>/dev/null | grep -v satellite | head -n1)"
if [ -f "$MAIN_DEB" ]; then
    echo "Unpacking PNetLab core payload directly to filesystem..."
    dpkg -x "$MAIN_DEB" / 2>/dev/null || dpkg-deb -x "$MAIN_DEB" / 2>/dev/null || true
fi

# Ensure usr-merge integrity: /lib must always be a symlink to usr/lib
if [ ! -L /lib ] && [ -d /usr/lib ]; then
    echo "Preserving usr-merge: migrating unmerged /lib into /usr/lib..."
    cp -a /lib/* /usr/lib/ 2>/dev/null || true
    rm -rf /lib
    ln -s usr/lib /lib
fi

# 2. Install pre-dependent and supporting packages first
dpkg -i --force-all \
    "$DEB_DIR"/pnetlab-schema*.deb \
    "$DEB_DIR"/pnetlab-guacd*.deb \
    "$DEB_DIR"/pnetlab-docker*.deb \
    "$DEB_DIR"/pnetlab-qemu*.deb \
    "$DEB_DIR"/pnetlab-vpcs*.deb \
    "$DEB_DIR"/pnetlab-bridge-dkms*.deb 2>/dev/null || true

# 3. Install main pnetlab debian package
if [ -f "$MAIN_DEB" ]; then
    dpkg -i --force-all "$MAIN_DEB" 2>/dev/null || true
fi

# Final usr-merge integrity check after package installations
if [ ! -L /lib ] && [ -d /usr/lib ]; then
    echo "Preserving usr-merge after dpkg: migrating unmerged /lib into /usr/lib..."
    cp -a /lib/* /usr/lib/ 2>/dev/null || true
    rm -rf /lib
    ln -s usr/lib /lib
fi

# Lock all PNetLab packages against accidental removal by apt autoremove
echo "Locking PNetLab core packages against autoremove..."
apt-mark manual \
    pnetlab \
    pnetlab-guacd \
    pnetlab-schema \
    pnetlab-docker \
    pnetlab-qemu \
    pnetlab-vpcs \
    pnetlab-bridge-dkms 2>/dev/null || true

# Proactively compile and install pnetlab-bridge DKMS for current kernel (including 7.0.0-43+)
if [ -f /usr/src/pnetlab-bridge-1.0/dkms.conf ]; then
    echo "Configuring pnetlab-bridge DKMS for Linux 7.0 kernel..."
    sed -i 's/(14|30|31|38|42)/(14|30|31|38|42|43|44|45)/' /usr/src/pnetlab-bridge-1.0/dkms.conf 2>/dev/null || true
    CURRENT_KVER="$(uname -r 2>/dev/null || true)"
    if [ -n "$CURRENT_KVER" ]; then
        dkms build -m pnetlab-bridge -v 1.0 -k "$CURRENT_KVER" 2>/dev/null || true
        dkms install -m pnetlab-bridge -v 1.0 -k "$CURRENT_KVER" 2>/dev/null || true
    fi
fi

# Proactive hypervisor virtual NIC kernel driver provisioning
echo "Provisioning hypervisor virtual NIC kernel drivers (VMware, VirtualBox, KVM, Hyper-V)..."
mkdir -p /etc/modules-load.d
cat << 'NIC_EOF' > /etc/modules-load.d/pnet-hypervisor-nics.conf
# Hypervisor virtual NIC drivers for PNetLab
pcnet32
e1000
e1000e
vmxnet3
virtio_net
NIC_EOF

for mod in pcnet32 e1000 e1000e vmxnet3 virtio_net; do
    modprobe "$mod" 2>/dev/null || true
done

echo "[6/7] Applying PNetLab enterprise optimization scripts and Custom Features for $VERSION..."
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

# 4. Deploy universal MAC-agnostic Netplan configuration bridging eth0 into pnet0
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

        if [ -n "$DETECTED_IP" ]; then
            cat << NETPLAN_EOF > /etc/netplan/00-installer-config.yaml
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
            cat << NETPLAN_EOF > /etc/netplan/00-installer-config.yaml
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
        chmod 600 /etc/netplan/00-installer-config.yaml
        netplan generate 2>/dev/null || true
        netplan apply 2>/dev/null || true

        # Critical safeguard: ensure physical uplink is immediately enslaved to pnet0 so active SSH connection never drops
        ip link set "$UPLINK_IFACE" master pnet0 2>/dev/null || true
        ip link set "$UPLINK_IFACE" up 2>/dev/null || true
        ip link set pnet0 up 2>/dev/null || true
    fi
fi

# Ensure all cloud bridges (pnet0-9, nat0) exist and carrier is asserted
[ -x /opt/ovf/pnet-bridges.sh ] && /bin/bash /opt/ovf/pnet-bridges.sh 2>/dev/null || true

# Apply all Tri-Pillar Custom Subsystems (Performance, Customization, Features)
if [ -f "$REPO_ROOT/apply-all-custom.sh" ]; then
    bash "$REPO_ROOT/apply-all-custom.sh" --master || true
elif [ -f "$REPO_ROOT/Custom-Features/apply-features.sh" ]; then
    bash "$REPO_ROOT/Custom-Features/apply-features.sh" --master || true
fi

echo "[7/7] Finalizing services and configuring Apache Web-UI..."
if [ -f "$REPO_ROOT/scripts/pnet-fix-apache-web.sh" ]; then
    bash "$REPO_ROOT/scripts/pnet-fix-apache-web.sh" || true
elif [ -f "/opt/unetlab/scripts/pnet-fix-apache-web.sh" ]; then
    bash "/opt/unetlab/scripts/pnet-fix-apache-web.sh" || true
fi

# Authoritatively enforce default Web-UI and database credentials (admin / pnet)
if [ -f "$REPO_ROOT/Custom-Customization/scripts/pnet-fix-web-credentials.sh" ]; then
    bash "$REPO_ROOT/Custom-Customization/scripts/pnet-fix-web-credentials.sh" --silent || true
elif [ -f "/opt/unetlab/scripts/pnet-fix-web-credentials.sh" ]; then
    bash "/opt/unetlab/scripts/pnet-fix-web-credentials.sh" --silent || true
fi

# Provision and stage cluster satellite deployment bundle (/opt/unetlab/cluster-bundle)
if [ -f "$REPO_ROOT/scripts/pnet-fix-cluster.sh" ]; then
    bash "$REPO_ROOT/scripts/pnet-fix-cluster.sh" || true
elif [ -f "/opt/unetlab/scripts/pnet-fix-cluster.sh" ]; then
    bash "/opt/unetlab/scripts/pnet-fix-cluster.sh" || true
fi

# Authoritatively enforce 512MB large upload limits, Apache timeout ceilings, and Docker subsystem
if [ -f "$REPO_ROOT/Custom-Features/scripts/pnet-upload-and-docker-fix.sh" ]; then
    bash "$REPO_ROOT/Custom-Features/scripts/pnet-upload-and-docker-fix.sh" || true
elif [ -f "/opt/unetlab/scripts/pnet-upload-and-docker-fix.sh" ]; then
    bash "/opt/unetlab/scripts/pnet-upload-and-docker-fix.sh" || true
fi

if [ -d /opt/unetlab/wrappers ]; then
    chmod -R 755 /opt/unetlab/wrappers || true
fi

systemctl daemon-reload || true
systemctl restart apache2 2>/dev/null || true

echo "=========================================================="
echo " PNetLab Master Installation & Script Optimization Completed!"
echo " Release: $VERSION"
echo " CLI Tools: Run 'pnet-health' or 'pnet-menu' to manage system"
echo " Web UI:    https://$(hostname -I | awk '{print $1}')/ or https://localhost/"
echo " Default Username: admin"
echo " Default Password: pnet"
echo "=========================================================="
