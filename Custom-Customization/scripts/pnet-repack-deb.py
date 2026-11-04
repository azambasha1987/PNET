#!/usr/bin/env python3
"""
===============================================================================
AzamLabs Production Debian Package Rebuild & Repository Indexing Pipeline
===============================================================================
Synchronizes all custom runtime interceptors, adaptive micro-sleep shims,
natural ascending sort patches, session keepalive assets, and 26 canonical CLI
symlinks into both Master and Satellite Debian packages:
  - azamlabs_6.8.93resolute1_amd64.deb
  - azamlabs-satellite_6.8.93resolute1_amd64.deb

Regenerates the APT repository metadata:
  - debian/dists/resolute/main/binary-amd64/Packages
  - debian/dists/resolute/main/binary-amd64/Packages.gz
  - debian/dists/resolute/Release
===============================================================================
"""

import os
import sys
import paramiko

def main():
    print("[1] Connecting to Master VM (192.168.1.23)...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.1.23", username="root", password="azam", timeout=10)

    remote_builder = """#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "    AzamLabs Debian Package Rebuild & Indexing Pipeline     "
echo "============================================================"

if [ -d "/opt/AzamLabs/debian" ]; then
    DEBIAN_BASE="/opt/AzamLabs/debian"
elif [ -d "/opt/azambasha/debian" ]; then
    DEBIAN_BASE="/opt/azambasha/debian"
else
    DEBIAN_BASE="/opt/azamlabs/debian"
fi
POOL_DIR="$DEBIAN_BASE/pool/resolute/main"
DISTS_DIR="$DEBIAN_BASE/dists/resolute"
WORK_DIR="/tmp/deb_rebuild_workspace"
MASTER_DEB="$POOL_DIR/azamlabs_6.8.93resolute1_amd64.deb"
SAT_DEB="$POOL_DIR/azamlabs-satellite_6.8.93resolute1_amd64.deb"

# Ensure local source keepalive is in both themes locations
mkdir -p /opt/unetlab/themes/default/js /opt/unetlab/html/themes/default/js
if [ -f /opt/unetlab/html/themes/default/js/azamlabs-keepalive.js ]; then
    cp -a /opt/unetlab/html/themes/default/js/azamlabs-keepalive.js /opt/unetlab/themes/default/js/
fi

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/master" "$WORK_DIR/satellite"

# -----------------------------------------------------------------------------
# 1. REBUILD MASTER PACKAGE: azamlabs_6.8.93resolute1_amd64.deb
# -----------------------------------------------------------------------------
echo "[*] Unpacking Master deb: $MASTER_DEB..."
dpkg-deb -R "$MASTER_DEB" "$WORK_DIR/master"

echo "[*] Synchronizing Master payload from live /opt/unetlab..."
M_PAYLOAD="$WORK_DIR/master"

# Wrappers & Shims
mkdir -p "$M_PAYLOAD/opt/unetlab/wrappers"
cp -a /opt/unetlab/wrappers/azam-iol-shim64.so "$M_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/azam-iol-shim32.so "$M_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/azam-iol-shim.so "$M_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/azam-iol-launcher "$M_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/ksm_merge_exec "$M_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/unl_wrapper "$M_PAYLOAD/opt/unetlab/wrappers/"

# Runtime Interceptors & Sorting
mkdir -p "$M_PAYLOAD/opt/unetlab/html/devices/qemu" "$M_PAYLOAD/opt/unetlab/html/devices/iol"
cp -a /opt/unetlab/html/devices/qemu/device_qemu.php "$M_PAYLOAD/opt/unetlab/html/devices/qemu/"
cp -a /opt/unetlab/html/devices/iol/device_iol.php "$M_PAYLOAD/opt/unetlab/html/devices/iol/"
cp -a /opt/unetlab/html/includes/api_folders.php "$M_PAYLOAD/opt/unetlab/html/includes/"
cp -a /opt/unetlab/html/main/js/labs.js "$M_PAYLOAD/opt/unetlab/html/main/js/"

# Frontend UI, Themes, Keepalive & Avatar
mkdir -p "$M_PAYLOAD/opt/unetlab/themes/default/js" "$M_PAYLOAD/opt/unetlab/html/themes/default/js"
mkdir -p "$M_PAYLOAD/opt/unetlab/html/main/css" "$M_PAYLOAD/opt/unetlab/html/main/js"
mkdir -p "$M_PAYLOAD/opt/unetlab/html/login/img"
cp -a /opt/unetlab/html/api.php "$M_PAYLOAD/opt/unetlab/html/"
cp -a /opt/unetlab/html/themes/default/index.html "$M_PAYLOAD/opt/unetlab/html/themes/default/"
cp -a /opt/unetlab/html/themes/default/js/azamlabs* "$M_PAYLOAD/opt/unetlab/html/themes/default/js/" || true
cp -a /opt/unetlab/themes/default/js/azamlabs* "$M_PAYLOAD/opt/unetlab/themes/default/js/" || true
cp -a /opt/unetlab/html/main/index.html "$M_PAYLOAD/opt/unetlab/html/main/"
cp -a /opt/unetlab/html/main/css/theme-engine.css "$M_PAYLOAD/opt/unetlab/html/main/css/"
cp -a /opt/unetlab/html/main/azam-features.js "$M_PAYLOAD/opt/unetlab/html/main/"
cp -a /opt/unetlab/html/main/js/azam-features.js "$M_PAYLOAD/opt/unetlab/html/main/js/"
cp -a /opt/unetlab/html/login/index.html "$M_PAYLOAD/opt/unetlab/html/login/"
cp -a /opt/unetlab/html/login/login.css "$M_PAYLOAD/opt/unetlab/html/login/"
cp -a /opt/unetlab/html/login/login.js "$M_PAYLOAD/opt/unetlab/html/login/"
cp -a /opt/unetlab/html/login/version.php "$M_PAYLOAD/opt/unetlab/html/login/"
cp -a /opt/unetlab/html/login/img/azam_home_avatar.png "$M_PAYLOAD/opt/unetlab/html/login/img/"

# PHP session & auth
cp -a /opt/unetlab/html/includes/functions.php "$M_PAYLOAD/opt/unetlab/html/includes/"
cp -a /opt/unetlab/html/includes/__lab.php "$M_PAYLOAD/opt/unetlab/html/includes/"
cp -a /opt/unetlab/html/includes/activity_log.php "$M_PAYLOAD/opt/unetlab/html/includes/"
cp -a /opt/unetlab/html/includes/api_authentication.php "$M_PAYLOAD/opt/unetlab/html/includes/"
cp -a /opt/unetlab/html/includes/version.php "$M_PAYLOAD/opt/unetlab/html/includes/"

# Appliance Templates (All 746+ with mem-merge=on)
mkdir -p "$M_PAYLOAD/opt/unetlab/html/templates"
cp -a /opt/unetlab/html/templates/* "$M_PAYLOAD/opt/unetlab/html/templates/"

# Scripts
mkdir -p "$M_PAYLOAD/opt/unetlab/scripts"
cp -a /opt/unetlab/scripts/azambasha* "$M_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/apply-heavy-node-optimizer.sh "$M_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/azam-iol-shim.c "$M_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/ksm_merge_exec.c "$M_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/azamlabs* "$M_PAYLOAD/opt/unetlab/scripts/" || true

# Update postinst to create all 26 canonical symlinks
POSTINST="$M_PAYLOAD/DEBIAN/postinst"
if ! grep -q "azam-export-sort" "$POSTINST"; then
    cat >> "$POSTINST" << 'EOF'

# AzamLabs Canonical CLI Symlinks Hierarchy
mkdir -p /usr/local/bin
SYMLINKS=(
    "azam-menu:azambasha-admin-menu.sh"
    "azam-doctor:azambasha-doctor.sh"
    "azam-bootstorm:azambasha-bootstorm.py"
    "azam-ai:azambasha-ai-lab-builder.py"
    "azam-git:azambasha-topology-git.sh"
    "azam-console-fix:azambasha-console-fix.sh"
    "azam-perf:azambasha-perf-profiler.sh"
    "azam-optimizer:azambasha-heavy-node-optimizer.sh"
    "azam-watchdog:azambasha-watchdog.py"
    "azam-images:azambasha-image-doctor.sh"
    "azam-backup:azambasha-backup-and-restore.sh"
    "azam-dark:azambasha-deploy-homelogo.sh"
    "azam-capacity:azambasha-capacity-planner.py"
    "azam-bench:azambasha-bench.sh"
    "azam-ssl:azambasha-fix-ssl-and-certs.sh"
    "azam-templates:azambasha-template-library.py"
    "azam-credentials:azambasha-fix-web-credentials.sh"
    "azam-update:azambasha-update.sh"
    "azam-fleet:azambasha-fleet-status.sh"
    "azam-nodes:azambasha-node-bulk-manager.sh"
    "azam-cluster:azambasha-fix-cluster.sh"
    "azam-clean:azambasha-clean-temp.sh"
    "azam-audit:azambasha-quarterly-audit.sh"
    "azam-satdeploy:extracted_azam-satdeploy.sh"
    "azam-session:azambasha-disable-logout.sh"
    "azam-export-sort:azambasha-fix-export-sort.py"
)
for item in "${SYMLINKS[@]}"; do
    CMD="${item%%:*}"
    SCRIPT="${item##*:}"
    if [ -f "/opt/unetlab/scripts/$SCRIPT" ]; then
        ln -sf "/opt/unetlab/scripts/$SCRIPT" "/usr/local/bin/$CMD"
        chmod +x "/opt/unetlab/scripts/$SCRIPT"
    fi
done
EOF
fi

# Sanitize permissions
chown -R root:root "$M_PAYLOAD"
find "$M_PAYLOAD/opt/unetlab/wrappers" -type f -exec chmod 0755 {} +
chmod 4755 "$M_PAYLOAD/opt/unetlab/wrappers/unl_wrapper" \
            "$M_PAYLOAD/opt/unetlab/wrappers/iol_wrapper" \
            "$M_PAYLOAD/opt/unetlab/wrappers/qemu_wrapper" \
            "$M_PAYLOAD/opt/unetlab/wrappers/docker_wrapper" \
            "$M_PAYLOAD/opt/unetlab/wrappers/dynamips_wrapper" 2>/dev/null || true
find "$M_PAYLOAD/opt/unetlab/scripts" -type f -name "*.sh" -exec chmod 0755 {} +
find "$M_PAYLOAD/opt/unetlab/scripts" -type f -name "*.py" -exec chmod 0755 {} +

echo "[*] Repacking Master deb: $MASTER_DEB..."
dpkg-deb -b -Zzstd "$M_PAYLOAD" "$MASTER_DEB"
echo "[✔] Master deb repack complete!"

# -----------------------------------------------------------------------------
# 2. REBUILD SATELLITE PACKAGE: azamlabs-satellite_6.8.93resolute1_amd64.deb
# -----------------------------------------------------------------------------
echo "[*] Unpacking Satellite deb: $SAT_DEB..."
dpkg-deb -R "$SAT_DEB" "$WORK_DIR/satellite"

echo "[*] Synchronizing Satellite payload from live system..."
S_PAYLOAD="$WORK_DIR/satellite"

# Wrappers & Shims
mkdir -p "$S_PAYLOAD/opt/unetlab/wrappers"
cp -a /opt/unetlab/wrappers/azam-iol-shim64.so "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/azam-iol-shim32.so "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/azam-iol-shim.so "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/azam-iol-launcher "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/ksm_merge_exec "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/iol_wrapper "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/qemu_wrapper "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/dynamips_wrapper "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/unl_wrapper "$S_PAYLOAD/opt/unetlab/wrappers/"
cp -a /opt/unetlab/wrappers/docker_wrapper "$S_PAYLOAD/opt/unetlab/wrappers/"

# Device engines (for headless execution on worker)
mkdir -p "$S_PAYLOAD/opt/unetlab/html/devices/qemu" "$S_PAYLOAD/opt/unetlab/html/devices/iol"
cp -a /opt/unetlab/html/devices/qemu/device_qemu.php "$S_PAYLOAD/opt/unetlab/html/devices/qemu/"
cp -a /opt/unetlab/html/devices/iol/device_iol.php "$S_PAYLOAD/opt/unetlab/html/devices/iol/"

# Templates
mkdir -p "$S_PAYLOAD/opt/unetlab/html/templates"
cp -a /opt/unetlab/html/templates/* "$S_PAYLOAD/opt/unetlab/html/templates/"

# Satellite scripts & daemons
mkdir -p "$S_PAYLOAD/opt/unetlab/scripts"
cp -a /opt/unetlab/scripts/azamlabs-satd.py "$S_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/azamlabs-brokerd.py "$S_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/azamlabs-linkwatchd.py "$S_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/azambasha-satellite-join.sh "$S_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/azambasha-heavy-node-optimizer.sh "$S_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/apply-heavy-node-optimizer.sh "$S_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/azam-iol-shim.c "$S_PAYLOAD/opt/unetlab/scripts/" || true
cp -a /opt/unetlab/scripts/ksm_merge_exec.c "$S_PAYLOAD/opt/unetlab/scripts/" || true

# Sanitize permissions
chown -R root:root "$S_PAYLOAD"
find "$S_PAYLOAD/opt/unetlab/wrappers" -type f -exec chmod 0755 {} +
chmod 4755 "$S_PAYLOAD/opt/unetlab/wrappers/unl_wrapper" \
            "$S_PAYLOAD/opt/unetlab/wrappers/iol_wrapper" \
            "$S_PAYLOAD/opt/unetlab/wrappers/qemu_wrapper" \
            "$S_PAYLOAD/opt/unetlab/wrappers/docker_wrapper" \
            "$S_PAYLOAD/opt/unetlab/wrappers/dynamips_wrapper" 2>/dev/null || true
find "$S_PAYLOAD/opt/unetlab/scripts" -type f -name "*.sh" -exec chmod 0755 {} +
find "$S_PAYLOAD/opt/unetlab/scripts" -type f -name "*.py" -exec chmod 0755 {} +

echo "[*] Repacking Satellite deb: $SAT_DEB..."
dpkg-deb -b -Zzstd "$S_PAYLOAD" "$SAT_DEB"
echo "[✔] Satellite deb repack complete!"

# -----------------------------------------------------------------------------
# 3. REINDEX APT REPOSITORY POOL & GENERATE RELEASE
# -----------------------------------------------------------------------------
echo "[*] Generating Packages & Packages.gz index..."
cd "$DEBIAN_BASE"
dpkg-scanpackages pool/resolute/main /dev/null > dists/resolute/main/binary-amd64/Packages
gzip -9nc dists/resolute/main/binary-amd64/Packages > dists/resolute/main/binary-amd64/Packages.gz

echo "[*] Computing hashes for dists/resolute/Release..."
PKG_SIZE=$(stat -c%s dists/resolute/main/binary-amd64/Packages)
PKG_GZ_SIZE=$(stat -c%s dists/resolute/main/binary-amd64/Packages.gz)

PKG_MD5=$(md5sum dists/resolute/main/binary-amd64/Packages | awk '{print $1}')
PKG_GZ_MD5=$(md5sum dists/resolute/main/binary-amd64/Packages.gz | awk '{print $1}')

PKG_SHA1=$(sha1sum dists/resolute/main/binary-amd64/Packages | awk '{print $1}')
PKG_GZ_SHA1=$(sha1sum dists/resolute/main/binary-amd64/Packages.gz | awk '{print $1}')

PKG_SHA256=$(sha256sum dists/resolute/main/binary-amd64/Packages | awk '{print $1}')
PKG_GZ_SHA256=$(sha256sum dists/resolute/main/binary-amd64/Packages.gz | awk '{print $1}')

PKG_SHA512=$(sha512sum dists/resolute/main/binary-amd64/Packages | awk '{print $1}')
PKG_GZ_SHA512=$(sha512sum dists/resolute/main/binary-amd64/Packages.gz | awk '{print $1}')

NOW_UTC=$(date -u "+%a, %d %b %Y %H:%M:%S UTC")

cat > dists/resolute/Release << EOF
Origin: Codeberg.org
Label: Codeberg.org
Suite: resolute
Codename: resolute
Components: main
Architectures: all amd64
Date: $NOW_UTC
Acquire-By-Hash: yes
MD5Sum:
 $PKG_MD5 $PKG_SIZE main/binary-amd64/Packages
 $PKG_GZ_MD5 $PKG_GZ_SIZE main/binary-amd64/Packages.gz
SHA1:
 $PKG_SHA1 $PKG_SIZE main/binary-amd64/Packages
 $PKG_GZ_SHA1 $PKG_GZ_SIZE main/binary-amd64/Packages.gz
SHA256:
 $PKG_SHA256 $PKG_SIZE main/binary-amd64/Packages
 $PKG_GZ_SHA256 $PKG_GZ_SIZE main/binary-amd64/Packages.gz
SHA512:
 $PKG_SHA512 $PKG_SIZE main/binary-amd64/Packages
 $PKG_GZ_SHA512 $PKG_GZ_SIZE main/binary-amd64/Packages.gz
EOF

echo "[*] Cleaning up workspace..."
rm -rf "$WORK_DIR"

echo "============================================================"
echo " [✔] Debian Package Rebuild & Repository Indexing Complete! "
echo "============================================================"
ls -lh "$MASTER_DEB" "$SAT_DEB" dists/resolute/main/binary-amd64/Packages* dists/resolute/Release
"""

    print("[2] Uploading rebuild script to VM...")
    sftp = ssh.open_sftp()
    with sftp.file("/tmp/run_rebuild.sh", "w") as f:
        f.write(remote_builder)
    sftp.close()

    print("[3] Executing rebuild script on VM...")
    stdin, stdout, stderr = ssh.exec_command("bash /tmp/run_rebuild.sh")
    
    # Stream output
    for line in iter(stdout.readline, ""):
        print(line, end="")
    
    err = stderr.read().decode('utf-8', errors='replace')
    if err:
        print("STDERR:", err)

    print("[4] Downloading rebuilt packages and indexes to local workspace...")
    sftp = ssh.open_sftp()
    
    LOCAL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    stdin, stdout, stderr = ssh.exec_command('[ -d "/opt/AzamLabs/debian" ] && echo "/opt/AzamLabs/debian" || echo "/opt/azamlabs/debian"')
    remote_base = stdout.read().decode().strip()

    files_to_sync = [
        (f"{remote_base}/pool/resolute/main/azamlabs_6.8.93resolute1_amd64.deb",
         os.path.join(LOCAL_ROOT, "debian", "pool", "resolute", "main", "azamlabs_6.8.93resolute1_amd64.deb")),
        (f"{remote_base}/pool/resolute/main/azamlabs-satellite_6.8.93resolute1_amd64.deb",
         os.path.join(LOCAL_ROOT, "debian", "pool", "resolute", "main", "azamlabs-satellite_6.8.93resolute1_amd64.deb")),
        (f"{remote_base}/dists/resolute/main/binary-amd64/Packages",
         os.path.join(LOCAL_ROOT, "debian", "dists", "resolute", "main", "binary-amd64", "Packages")),
        (f"{remote_base}/dists/resolute/main/binary-amd64/Packages.gz",
         os.path.join(LOCAL_ROOT, "debian", "dists", "resolute", "main", "binary-amd64", "Packages.gz")),
        (f"{remote_base}/dists/resolute/Release",
         os.path.join(LOCAL_ROOT, "debian", "dists", "resolute", "Release"))
    ]

    for remote_path, local_path in files_to_sync:
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        print(f"  ↳ Downloading: {os.path.basename(remote_path)}...")
        sftp.get(remote_path, local_path)
        print(f"    ✔ Saved to {local_path} ({os.path.getsize(local_path)} bytes)")

    sftp.close()
    ssh.close()
    print("\n[✔] All packages and repository indexes synchronized successfully!")

if __name__ == "__main__":
    main()
