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

echo "[6/7] Applying PNetLab enterprise optimization scripts and Custom Features for $VERSION..."
if [ -d "$REPO_ROOT/scripts" ]; then
    mkdir -p /opt/unetlab/scripts
    cp -rf "$REPO_ROOT/scripts/." /opt/unetlab/scripts/
    chmod +x /opt/unetlab/scripts/*.sh /opt/unetlab/scripts/*.py 2>/dev/null || true
fi

# Deploy and initialize cloud bridges (pnet0-9 + nat0)
mkdir -p /opt/ovf 2>/dev/null || true
if [ -f "$REPO_ROOT/scripts/pnet-bridges.sh" ]; then
    cp -f "$REPO_ROOT/scripts/pnet-bridges.sh" /opt/ovf/pnet-bridges.sh 2>/dev/null || true
fi
if [ -f "$REPO_ROOT/scripts/pnetlab-pnet-bridges.service" ]; then
    cp -f "$REPO_ROOT/scripts/pnetlab-pnet-bridges.service" /etc/systemd/system/pnetlab-pnet-bridges.service 2>/dev/null || true
fi
chmod 755 /opt/ovf/pnet-bridges.sh 2>/dev/null || true
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
