#!/usr/bin/env bash
#
# PNetLab Satellite Node Local Installer
# Installs PNetLab Satellite worker role from local release packages.
#

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)." >&2
    exit 1
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

echo "[1/4] Verifying release package integrity..."
bash "$SCRIPT_DIR/verify-packages.sh" "$VERSION"

echo "[2/4] Installing hypervisor and bridge dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
    bridge-utils \
    cpu-checker \
    tar \
    zstd \
    curl \
    libvirt-daemon-system \
    qemu-kvm \
    docker.io || true

echo "[3/4] Installing PNetLab Satellite packages..."
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

dpkg -i "${DEB_LIST[@]}" || apt-get install -f -y

echo "[4/4] Starting satellite services..."
systemctl daemon-reload || true

echo "=========================================================="
echo " PNetLab Satellite Installation Completed!"
echo " To connect this node to your PNetLab Master:"
echo " Run the registration command shown on your Master Web UI"
echo " (System -> Satellite Management -> Add Satellite)."
echo "=========================================================="
