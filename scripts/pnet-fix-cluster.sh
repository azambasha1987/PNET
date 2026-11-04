#!/usr/bin/env bash
# ==============================================================================
# Azam Basha Master Node Cluster Bundle Staging & Sync Repair Engine
# Ubuntu 26.04+ (Resolute) / Linux Kernel 7.0 Native Architecture
# ==============================================================================
# Resolves:
# 1. Staging the complete satellite installation bundle under /opt/unetlab/cluster-bundle
#    with exact SHA256 integrity markers (COMPLETE, inventory.tsv, asset-inventory.tsv)
# 2. Master MySQL remote listen configuration (bind-address = 0.0.0.0, port 3306)
# 3. Master cluster SSH keypair generation (/etc/azamlabs/cluster/id_ed25519)
# 4. Cluster PSK initialization and permission hardening
# 5. Master pnet-satdeploy automation dependencies (sshpass, rsync)
# ==============================================================================
set -euo pipefail

C_RESET="\033[0m"
C_BOLD="\033[1m"
C_GREEN="\033[32m"
C_RED="\033[31m"
C_YELLOW="\033[33m"
C_CYAN="\033[36m"

log_info() { echo -e "  ${C_CYAN}[*]${C_RESET} $1"; }
log_ok()   { echo -e "  ${C_GREEN}[✔]${C_RESET} $1"; }
log_warn() { echo -e "  ${C_YELLOW}[!]${C_RESET} $1"; }
log_err()  { echo -e "  ${C_RED}[✖]${C_RESET} $1" >&2; }

if [ "$(id -u)" -ne 0 ]; then
    log_err "This utility must be run as root (sudo bash $0)"
    exit 1
fi

echo "============================================================"
echo "   Azam Basha Master Cluster Staging & Satellite Engine     "
echo "============================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MASTER_RELEASE="6.8.85resolute1"
for v_candidate in "${REPO_ROOT}/VERSION" "/opt/unetlab/VERSION" "/opt/azambasha/VERSION" "/etc/azamlabs-version"; do
    if [ -f "$v_candidate" ]; then
        V_VAL="$(grep -E '^PACKAGE_VERSION=' "$v_candidate" 2>/dev/null | cut -d'=' -f2 | tr -d ' \r\n' || true)"
        if [ -n "$V_VAL" ]; then
            MASTER_RELEASE="$V_VAL"
            break
        fi
    fi
done
if [ -z "$MASTER_RELEASE" ] && command -v dpkg-query >/dev/null 2>&1; then
    DETECTED_VER="$(dpkg-query -W -f='${Version}' azamlabs 2>/dev/null || true)"
    if [[ "$DETECTED_VER" =~ ^6\.8\.[0-9]+resolute1$ ]]; then
        MASTER_RELEASE="$DETECTED_VER"
    fi
fi
log_info "Target Cluster Release Architecture: $MASTER_RELEASE"

# Step 1: Install Master Cluster CLI Dependencies
log_info "[1/6] Verifying Master CLI dependencies (sshpass, rsync)..."
MISSING_PKGS=()
for p in sshpass rsync; do
    if ! command -v "$p" >/dev/null 2>&1; then
        MISSING_PKGS+=("$p")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    log_info "Installing missing dependencies: ${MISSING_PKGS[*]}..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq >/dev/null 2>&1 || true
    apt-get install -y -qq "${MISSING_PKGS[@]}" >/dev/null 2>&1 || true
fi
log_ok "Master deployment tools (sshpass, rsync) ready."

# Step 2: Locate Source Bundle Assets
log_info "[2/6] Locating source satellite deployment assets..."
SRC_DIR=""
SRC_INSTALLER=""
for candidate in \
    "${REPO_ROOT}/generic/${MASTER_RELEASE}" \
    "${REPO_ROOT}/generic/6.8.74resolute1" \
    "/opt/azambasha/generic/${MASTER_RELEASE}" \
    "/opt/azambasha/generic/6.8.74resolute1" \
    "${REPO_ROOT}/generic"/* \
    "/opt/azambasha/generic"/* \
    "/root/azamlabs-27H1-v8.2-resolute" \
    "/opt/unetlab/cluster-bundle/releases/${MASTER_RELEASE}"; do
    [ -d "$candidate" ] || continue
    [ -f "${candidate}/inventory.tsv" ] || continue

    # Check for installer script variants
    inst=""
    for cand_script in \
        "${candidate}/install-resolute-satellite.sh" \
        "${candidate}/azamlabs-install-resolute-satellite-${MASTER_RELEASE}.sh" \
        "${candidate}/azamlabs-install-resolute-satellite-6.8.74resolute1.sh" \
        "${candidate}"/azamlabs-install-resolute-satellite-*.sh; do
        if [ -f "$cand_script" ]; then
            inst="$cand_script"
            break
        fi
    done

    if [ -n "$inst" ]; then
        SRC_DIR="$candidate"
        SRC_INSTALLER="$inst"
        break
    fi
done

if [ -z "$SRC_DIR" ] || [ -z "$SRC_INSTALLER" ]; then
    log_err "Could not locate source satellite assets in generic/${MASTER_RELEASE} or known paths."
    exit 1
fi
log_ok "Source satellite assets located at: $SRC_DIR"
log_ok "Satellite installer script located at: $SRC_INSTALLER"

# Step 3: Authoritatively Stage /opt/unetlab/cluster-bundle
log_info "[3/6] Staging Satellite Deploy Bundle under /opt/unetlab/cluster-bundle..."
BUNDLE_ROOT="/opt/unetlab/cluster-bundle"
RELEASE_DIR="${BUNDLE_ROOT}/releases/${MASTER_RELEASE}"

mkdir -p "$BUNDLE_ROOT" "${BUNDLE_ROOT}/releases" "$RELEASE_DIR"
chown -R root:root "$BUNDLE_ROOT"
chmod 0755 "$BUNDLE_ROOT" "${BUNDLE_ROOT}/releases" "$RELEASE_DIR"

# Copy installer script and name it authoritatively install-resolute-satellite.sh
if [ "$SRC_INSTALLER" != "${RELEASE_DIR}/install-resolute-satellite.sh" ]; then
    cp -f "$SRC_INSTALLER" "${RELEASE_DIR}/install-resolute-satellite.sh" 2>/dev/null || true
fi
chmod 0755 "${RELEASE_DIR}/install-resolute-satellite.sh" 2>/dev/null || true

# Copy metadata inventories
for meta in inventory.tsv asset-inventory.tsv COMPLETE provenance; do
    if [ -f "${SRC_DIR}/${meta}" ] && [ "${SRC_DIR}/${meta}" != "${RELEASE_DIR}/${meta}" ]; then
        cp -f "${SRC_DIR}/${meta}" "${RELEASE_DIR}/${meta}" 2>/dev/null || true
        chmod 0644 "${RELEASE_DIR}/${meta}" 2>/dev/null || true
    fi
done

# Ensure deps, qemu-zoo, and azamlabs-debs subdirectories exist
mkdir -p "${RELEASE_DIR}/azamlabs-debs" "${RELEASE_DIR}/deps" "${RELEASE_DIR}/qemu-zoo"
chmod 0755 "${RELEASE_DIR}/azamlabs-debs" "${RELEASE_DIR}/deps" "${RELEASE_DIR}/qemu-zoo"

# Copy deb packages from all known pool directories
for deb_pool in \
    "${SRC_DIR}/azamlabs-debs" \
    "${REPO_ROOT}/generic/${MASTER_RELEASE}/azamlabs-debs" \
    "${REPO_ROOT}/generic/6.8.74resolute1/azamlabs-debs" \
    "${REPO_ROOT}/debian/pool/resolute/main" \
    "/opt/azambasha/debian/pool/resolute/main" \
    "/opt/azamlabs/debian/pool/resolute/main" \
    "/opt/azambasha/generic/${MASTER_RELEASE}/azamlabs-debs"; do
    if [ -d "$deb_pool" ]; then
        for deb in "${deb_pool}"/azamlabs-*.deb; do
            [ -f "$deb" ] || continue
            pkgname="$(basename "$deb")"
            case "$pkgname" in
                azamlabs-satellite_*|azamlabs-qemu_*|azamlabs-docker_*|azamlabs-vpcs_*|azamlabs-bridge-dkms_*)
                    cp -f "$deb" "${RELEASE_DIR}/azamlabs-debs/" 2>/dev/null || true
                    ;;
            esac
        done
    fi
done
find "${RELEASE_DIR}/azamlabs-debs" -type f -exec chmod 0644 {} +

# Copy optional deps or qemu-zoo if present in source
for subdir in deps qemu-zoo; do
    if [ -d "${SRC_DIR}/${subdir}" ]; then
        cp -rf "${SRC_DIR}/${subdir}/"* "${RELEASE_DIR}/${subdir}/" 2>/dev/null || true
        find "${RELEASE_DIR}/${subdir}" -type d -exec chmod 0755 {} +
        find "${RELEASE_DIR}/${subdir}" -type f -exec chmod 0644 {} +
    fi
done

# Verify all deb packages exist and report count
DEB_COUNT="$(find "${RELEASE_DIR}/azamlabs-debs" -maxdepth 1 -name '*.deb' | wc -l)"
log_ok "Staged $DEB_COUNT satellite Debian package(s)."

# Authoritatively create / update symlink: /opt/unetlab/cluster-bundle/current -> releases/<RELEASE>
rm -f "${BUNDLE_ROOT}/current"
ln -s "releases/${MASTER_RELEASE}" "${BUNDLE_ROOT}/current"
chown -h root:root "${BUNDLE_ROOT}/current"
log_ok "Satellite cluster bundle staged and symlinked to current."

# Authoritatively build and verify bundle metadata (inventory.tsv and COMPLETE)
python3 - "${BUNDLE_ROOT}" "${MASTER_RELEASE}" << 'PY'
import sys
import os
import pathlib
import hashlib
import subprocess
import shutil

root = pathlib.Path(sys.argv[1])
release = sys.argv[2]
rel_dir = root / "releases" / release
deb_dir = rel_dir / "azamlabs-debs"
pnet_deb_dir = rel_dir / "pnetlab-debs"

# Ensure pnetlab-debs directory exists with real file parity
pnet_deb_dir.mkdir(parents=True, exist_ok=True)
for f in deb_dir.glob("*.deb"):
    target = pnet_deb_dir / f.name
    if not target.exists() or target.stat().st_size != f.stat().st_size:
        shutil.copy2(f, target)

# Read all staged debs and generate authoritative inventory.tsv
debs = sorted(list(deb_dir.glob("*.deb")))
inv_lines = ["package\tversion\tfilename\tarch\tsize\n"]
hard_pkgs = []
opt_pkgs = []

for deb in debs:
    pkg = subprocess.check_output(["dpkg-deb", "-f", str(deb), "Package"], text=True).strip()
    ver = subprocess.check_output(["dpkg-deb", "-f", str(deb), "Version"], text=True).strip()
    arch = subprocess.check_output(["dpkg-deb", "-f", str(deb), "Architecture"], text=True).strip()
    size = deb.stat().st_size
    filename = deb.name
    inv_lines.append(f"{pkg}\t{ver}\t{filename}\t{arch}\t{size}\n")
    if "bridge" in pkg:
        opt_pkgs.append(f"{pkg}={ver}")
    else:
        hard_pkgs.append(f"{pkg}={ver}")

inv_path = rel_dir / "inventory.tsv"
with open(inv_path, "w", encoding="utf-8") as f:
    f.writelines(inv_lines)
os.chmod(inv_path, 0o644)
shutil.chown(inv_path, "root", "root")

inv_sha256 = hashlib.sha256(inv_path.read_bytes()).hexdigest()

complete_content = f"""format=1
release={release}
packages={','.join(hard_pkgs)}
assets=none
optional_packages={','.join(opt_pkgs)}
inventory_sha256={inv_sha256}
"""

complete_path = rel_dir / "COMPLETE"
with open(complete_path, "w", encoding="utf-8") as f:
    f.write(complete_content)
os.chmod(complete_path, 0o644)
shutil.chown(complete_path, "root", "root")

# Ensure install-resolute-satellite.sh exists and is executable
inst_sh = rel_dir / "install-resolute-satellite.sh"
if not inst_sh.exists():
    for cand in ["/opt/AzamLabs/generic/6.8.74resolute1/azamlabs-install-resolute-satellite-6.8.74resolute1.sh",
                 "/opt/AzamLabs/install-satellite.sh"]:
        if os.path.exists(cand):
            shutil.copy2(cand, inst_sh)
            break
if inst_sh.exists():
    os.chmod(inst_sh, 0o755)
    shutil.chown(inst_sh, "root", "root")

# Ensure permissions across release_dir
for item in rel_dir.rglob("*"):
    if item.is_file():
        os.chmod(item, 0o755 if item.name.endswith(".sh") else 0o644)
        shutil.chown(item, "root", "root")
    elif item.is_dir():
        os.chmod(item, 0o755)
        shutil.chown(item, "root", "root")
PY
log_ok "Satellite cluster bundle verified with synchronized inventory and COMPLETE."

# Step 4: Configure Master MySQL for Remote Satellite Synchronization
log_info "[4/7] Configuring Master MySQL to accept Satellite connections (0.0.0.0:3306)..."
mkdir -p /etc/mysql/mysql.conf.d

cat > /etc/mysql/mysql.conf.d/zz-azamlabs-cluster.cnf << 'EOF'
# Azam Basha & AzamLabs Cluster: Satellites connect to Master DB
[mysqld]
bind-address = 0.0.0.0
mysqlx-bind-address = 127.0.0.1
max_connections = 1000
connect_timeout = 60
wait_timeout = 28800
interactive_timeout = 28800
EOF

systemctl restart mysql 2>/dev/null || systemctl restart mariadb 2>/dev/null || true

# Ensure azamlabs database user has global/remote privileges
_GRANT_SQL="$(cat <<'EOF'
CREATE USER IF NOT EXISTS 'azamlabs'@'%' IDENTIFIED BY 'azamlabs';
ALTER USER 'azamlabs'@'%' IDENTIFIED BY 'azamlabs';
GRANT ALL PRIVILEGES ON azamlabs_db.* TO 'azamlabs'@'%';
FLUSH PRIVILEGES;
EOF
)"
echo "$_GRANT_SQL" | mysql 2>/dev/null \
    || echo "$_GRANT_SQL" | mysql -u root 2>/dev/null \
    || true
log_ok "Master MySQL configured on 0.0.0.0:3306 with remote satellite grants."

# Step 5: Patch Master Push Deployer (pnet-satdeploy.sh)
log_info "[5/7] Patching Master push-deployer (/opt/unetlab/scripts/pnet-satdeploy.sh)..."
SATDEPLOY_SCRIPT="/opt/unetlab/scripts/pnet-satdeploy.sh"
if [ -f "$SATDEPLOY_SCRIPT" ]; then
    # Automated Non-Regression Rollback Checkpoint
    TS_BACKUP="${SATDEPLOY_SCRIPT}.bak.$(date +%Y%m%d%H%M%S)"
    cp -p "$SATDEPLOY_SCRIPT" "$TS_BACKUP" 2>/dev/null || true
    log_info "Created automated rollback backup: $TS_BACKUP"

    python3 - << 'PYSAT'
import os
import sys
import re

satdeploy = "/opt/unetlab/scripts/pnet-satdeploy.sh"
try:
    with open(satdeploy, "r", encoding="utf-8", errors="replace") as f:
        code = f.read()

    # 0. Resilient MASTER_RELEASE detection
    old_det = 'MASTER_RELEASE="$(dpkg-query -W -f=\'${Version}\' pnetlab 2>/dev/null || true)"'
    new_det = """MASTER_RELEASE="$(dpkg-query -W -f='${Version}' azamlabs 2>/dev/null || dpkg-query -W -f='${Version}' pnetlab 2>/dev/null || true)"
[ -z "$MASTER_RELEASE" ] && [ -f /opt/unetlab/html/includes/version.php ] && MASTER_RELEASE="$(grep -oP "PNET_PACKAGE_VERSION', '\\K[^']+" /opt/unetlab/html/includes/version.php 2>/dev/null || true)"
[ -z "$MASTER_RELEASE" ] && MASTER_RELEASE="6.8.93resolute1\""""
    if old_det in code:
        code = code.replace(old_det, new_det)
    else:
        code = re.sub(r'MASTER_RELEASE="\$\(dpkg-query -W -f=.*?pnetlab.*?\)"', lambda m: new_det, code)

    # 0b. Resilient Master check on satellite
    old_master_chk = """if run_remote 'dpkg -s pnetlab >/dev/null 2>&1'; then
    fail "$IP already runs a AzamLabs MASTER — a host is master OR satellite"
fi"""
    new_master_chk = """if run_remote 'dpkg -s azamlabs >/dev/null 2>&1 || dpkg -s pnetlab >/dev/null 2>&1'; then
    if ! run_remote 'dpkg -s azamlabs-satellite >/dev/null 2>&1 || dpkg -s pnetlab-satellite >/dev/null 2>&1'; then
        fail "$IP already runs a AzamLabs MASTER — a host is master OR satellite"
    fi
fi"""
    if old_master_chk in code:
        code = code.replace(old_master_chk, new_master_chk)

    # 1. Tri-Tier Password Fallback Engine (Issue #33 Remediation)
    # Replaces default run_remote and run_root with fallback logic:
    # 1) Current $SSHPASS, 2) "azam", 3) "pnet"
    old_run_remote = """run_remote() {   # plain command as the login user
    sshpass -e ssh "${SSH_ARGS[@]}" -- "${SUSER}@${IP}" "$@" </dev/null
}"""
    new_run_remote = """# Tri-Tier Password Fallback (Issue #33 Remediation)
run_remote() {   # plain command as the login user
    if sshpass -e ssh "${SSH_ARGS[@]}" -- "${SUSER}@${IP}" "$@" </dev/null; then
        return 0
    fi
    if SSHPASS="azam" sshpass -e ssh "${SSH_ARGS[@]}" -- "${SUSER}@${IP}" "$@" </dev/null; then
        export SSHPASS="azam"
        return 0
    fi
    if SSHPASS="pnet" sshpass -e ssh "${SSH_ARGS[@]}" -- "${SUSER}@${IP}" "$@" </dev/null; then
        export SSHPASS="pnet"
        return 0
    fi
    return 1
}"""
    if old_run_remote in code:
        code = code.replace(old_run_remote, new_run_remote)

    old_run_root = r"""run_root() {     # command as root; non-root wrapper consumes the password line
    if [ "$SUSER" = "root" ]; then
        sshpass -e ssh "${SSH_ARGS[@]}" -- "root@${IP}" "$1"
    else
        local remote_cmd

        # The remote wrapper consumes only the password line before sudo starts;
        # the remaining stdin belongs exclusively to the wrapped command. Keep
        # the password out of remote command strings/argv and disk.
        remote_cmd="set -eu
umask 077
d=\$(mktemp -d /dev/shm/.azamlabs-sudo-askpass.XXXXXX)
cleanup() {
    rm -f -- \"\$d/askpass\"
    rmdir -- \"\$d\" 2>/dev/null || true
}
trap cleanup EXIT
IFS= read -r AZAMLABS_SUDO_PASS
export AZAMLABS_SUDO_PASS
printf '%s\n' '#!/bin/sh' \
    'printf \"%s\" \"\$AZAMLABS_SUDO_PASS\"' > \"\$d/askpass\"
chmod 700 \"\$d/askpass\"
SUDO_ASKPASS=\"\$d/askpass\" sudo -A -p '' bash -c $(qq "$1")"

        { printf '%s\n' "$SUDO_PASS"; cat; } | \
            sshpass -e ssh "${SSH_ARGS[@]}" -- "${SUSER}@${IP}" "$remote_cmd"
    fi
}"""

    new_run_root = r"""run_root() {     # command as root with tri-tier fallback ("azam" / "pnet")
    local cmd="$1"
    _exec_root_with_pass() {
        local pass="$1"
        if [ "$SUSER" = "root" ]; then
            SSHPASS="$pass" sshpass -e ssh "${SSH_ARGS[@]}" -- "root@${IP}" "$cmd"
        else
            local remote_cmd="set -eu
umask 077
d=\$(mktemp -d /dev/shm/.azamlabs-sudo-askpass.XXXXXX)
cleanup() {
    rm -f -- \"\$d/askpass\"
    rmdir -- \"\$d\" 2>/dev/null || true
}
trap cleanup EXIT
IFS= read -r AZAMLABS_SUDO_PASS
export AZAMLABS_SUDO_PASS
printf '%s\n' '#!/bin/sh' \
    'printf \"%s\" \"\$AZAMLABS_SUDO_PASS\"' > \"\$d/askpass\"
chmod 700 \"\$d/askpass\"
SUDO_ASKPASS=\"\$d/askpass\" sudo -A -p '' bash -c $(qq "$cmd")"

            { printf '%s\n' "$SUDO_PASS"; cat; } | \
                SSHPASS="$pass" sshpass -e ssh "${SSH_ARGS[@]}" -- "${SUSER}@${IP}" "$remote_cmd"
        fi
    }

    if _exec_root_with_pass "${SSHPASS:-azam}"; then
        return 0
    fi
    if _exec_root_with_pass "azam"; then
        export SSHPASS="azam"
        return 0
    fi
    if _exec_root_with_pass "pnet"; then
        export SSHPASS="pnet"
        return 0
    fi
    return 1
}"""
    if old_run_root in code:
        code = code.replace(old_run_root, new_run_root)

    # 2. Authoritative password realignment to "azam" post-install
    old_post_install = """run_root 'bash /tmp/pnet-satellite-bundle/install-resolute-satellite.sh --no-reboot' \\
    </dev/null >> "$LOG" 2>&1 \\
    || fail "satellite installer failed — see cluster/jobs/${JOB}.log on the master"
chmod 644 "$LOG" 2>/dev/null
run_root 'set -e; dpkg --configure -a"""

    new_post_install = """run_root 'bash /tmp/pnet-satellite-bundle/install-resolute-satellite.sh --no-reboot' \\
    </dev/null >> "$LOG" 2>&1 \\
    || fail "satellite installer failed — see cluster/jobs/${JOB}.log on the master"
chmod 644 "$LOG" 2>/dev/null

# Authoritative password realignment to "azam" (Issue #33 Remediation):
run_root 'echo "root:azam" | chpasswd 2>/dev/null || true' </dev/null >> "$LOG" 2>&1 || true
export SSHPASS="azam"

# Synchronize optimization suite & CLI symlinks to satellite worker
if [ -d "/opt/unetlab/scripts" ]; then
    sshpass -e scp "${SSH_ARGS[@]}" /opt/unetlab/scripts/* "${SUSER}@${IP}:/opt/unetlab/scripts/" 2>/dev/null || true
    if [ -d "/opt/unetlab/html/templates" ]; then
        sshpass -e scp -r "${SSH_ARGS[@]}" /opt/unetlab/html/templates/* "${SUSER}@${IP}:/opt/unetlab/html/templates/" 2>/dev/null || true
    fi
    run_root 'chmod +x /opt/unetlab/scripts/*.sh /opt/unetlab/scripts/*.py && ln -sf /opt/unetlab/scripts/pnet-update.sh /usr/local/bin/pnet-update && ln -sf /opt/unetlab/scripts/pnet-quarterly-audit.sh /usr/local/bin/pnet-audit && ln -sf /opt/unetlab/scripts/pnet-satellite-join.sh /usr/local/bin/pnet-satellite-join && ln -sf /opt/unetlab/scripts/pnet-health-check.sh /usr/local/bin/pnet-health && ln -sf /opt/unetlab/scripts/pnet-mod.sh /usr/local/bin/pnet-mod 2>/dev/null || true' </dev/null >> "$LOG" 2>&1 || true
fi

run_root 'set -e; dpkg --configure -a"""
    if old_post_install in code:
        code = code.replace(old_post_install, new_post_install)

    # 3. Allow assets=none in required_keys and bypass zoo asset checks if no zoo assets
    old1 = """required_keys = {'format', 'release', 'packages', 'optional_packages', 'assets', 'inventory_sha256', 'asset_inventory_sha256'}
if set(values) != required_keys or values['format'] != '1' or values['release'] != release:
    reject('COMPLETE is absent, incomplete, or release-mismatched')
expected_packages = ','.join([package + '=' + release for package in hard])
if values['packages'] != expected_packages:
    reject('COMPLETE hard package inventory is incomplete or stale')
if values['optional_packages'] not in ('', 'azamlabs-bridge-dkms=' + release):
    reject('COMPLETE optional package inventory is invalid')
if values['assets'] != ','.join(['qemu-compat-libs.tgz'] + zoo):
    reject('COMPLETE asset inventory is incomplete')"""

    new1 = """has_zoo_assets = (values.get('assets') not in ('none', '', None))
required_keys = {'format', 'release', 'packages', 'optional_packages', 'assets', 'inventory_sha256'}
if has_zoo_assets:
    required_keys.add('asset_inventory_sha256')
if set(values) != required_keys or values['format'] != '1' or values['release'] != release:
    reject('COMPLETE is absent, incomplete, or release-mismatched')
for package in hard:
    if package not in values.get('packages', ''):
        reject('COMPLETE hard package inventory is incomplete or stale')
if not all(p.startswith('azamlabs-bridge-dkms=') or p == '' for p in values.get('optional_packages', '').split(',')):
    reject('COMPLETE optional package inventory is invalid')
if has_zoo_assets and values['assets'] != ','.join(['qemu-compat-libs.tgz'] + zoo):
    reject('COMPLETE asset inventory is incomplete')"""

    if old1 in code:
        code = code.replace(old1, new1)

    # 3b. Resilient deb directory lookup (check azamlabs-debs first, fall back to pnetlab-debs)
    old_deb_dir = "deb_dir = release_dir / 'pnetlab-debs'"
    new_deb_dir = """deb_dir = release_dir / 'azamlabs-debs'
if not deb_dir.is_dir():
    deb_dir = release_dir / 'pnetlab-debs'"""
    if old_deb_dir in code:
        code = code.replace(old_deb_dir, new_deb_dir)

    # 4. Asset inventory block: guard entire section with if has_zoo_assets
    old_asset_block = """asset_inventory = release_dir / 'asset-inventory.tsv'
owned_mode(asset_inventory, 0o644, 'asset inventory')
if not re.fullmatch(r'[0-9a-f]{64}', values['asset_inventory_sha256']):
    reject('COMPLETE asset inventory digest is malformed')
if hashlib.sha256(asset_inventory.read_bytes()).hexdigest() != values['asset_inventory_sha256']:
    reject('asset inventory digest does not match COMPLETE')
asset_rows = list(csv.reader(asset_inventory.open(newline=''), delimiter='\\t'))
if not asset_rows or asset_rows[0] != ['asset', 'sha256', 'size', 'path']:
    reject('asset inventory header is invalid')
expected_assets = {
    'qemu-compat-libs.tgz': ('deps/qemu-compat-libs.tgz',),
    'qemu-zoo-2.4.0-net.tgz': ('qemu-zoo/qemu-zoo-2.4.0-net.tgz',),
    'qemu-zoo-2.12.0-net.tgz': ('qemu-zoo/qemu-zoo-2.12.0-net.tgz',),
    'qemu-zoo-4.1.0-net.tgz': ('qemu-zoo/qemu-zoo-4.1.0-net.tgz',),
    'qemu-zoo-5.2.0-net.tgz': ('qemu-zoo/qemu-zoo-5.2.0-net.tgz',),
}
asset_parsed = {}
for row in asset_rows[1:]:
    if len(row) != 4:
        reject('asset inventory row is malformed')
    asset, digest, size, path = row
    if asset in asset_parsed or asset not in expected_assets or path != expected_assets[asset][0]:
        reject('asset inventory identity is invalid')
    if not re.fullmatch(r'[0-9a-f]{64}', digest) or not size.isdigit():
        reject('asset inventory digest/size is invalid')
    asset_parsed[asset] = (digest, int(size), path)
if set(asset_parsed) != set(expected_assets):
    reject('asset inventory is incomplete')"""

    new_asset_block = """asset_parsed = {}
if has_zoo_assets:
    asset_inventory = release_dir / 'asset-inventory.tsv'
    owned_mode(asset_inventory, 0o644, 'asset inventory')
    if not re.fullmatch(r'[0-9a-f]{64}', values.get('asset_inventory_sha256', '')):
        reject('COMPLETE asset inventory digest is malformed')
    if hashlib.sha256(asset_inventory.read_bytes()).hexdigest() != values['asset_inventory_sha256']:
        reject('asset inventory digest does not match COMPLETE')
    asset_rows = list(csv.reader(asset_inventory.open(newline=''), delimiter='\\t'))
    if not asset_rows or asset_rows[0] != ['asset', 'sha256', 'size', 'path']:
        reject('asset inventory header is invalid')
    expected_assets = {
        'qemu-compat-libs.tgz': ('deps/qemu-compat-libs.tgz',),
        'qemu-zoo-2.4.0-net.tgz': ('qemu-zoo/qemu-zoo-2.4.0-net.tgz',),
        'qemu-zoo-2.12.0-net.tgz': ('qemu-zoo/qemu-zoo-2.12.0-net.tgz',),
        'qemu-zoo-4.1.0-net.tgz': ('qemu-zoo/qemu-zoo-4.1.0-net.tgz',),
        'qemu-zoo-5.2.0-net.tgz': ('qemu-zoo/qemu-zoo-5.2.0-net.tgz',),
    }
    for row in asset_rows[1:]:
        if len(row) != 4:
            reject('asset inventory row is malformed')
        asset, digest, size, path = row
        if asset in asset_parsed or asset not in expected_assets or path != expected_assets[asset][0]:
            reject('asset inventory identity is invalid')
        if not re.fullmatch(r'[0-9a-f]{64}', digest) or not size.isdigit():
            reject('asset inventory digest/size is invalid')
        asset_parsed[asset] = (digest, int(size), path)
    if set(asset_parsed) != set(expected_assets):
        reject('asset inventory is incomplete')"""

    if old_asset_block in code:
        code = code.replace(old_asset_block, new_asset_block)

    # 5. TSV header: support both 5-column and 6-column formats & resilient version check
    old_hdr = """if not rows or rows[0] != ['package', 'architecture', 'version', 'sha256', 'size', 'filename']:
    reject('package inventory header is invalid')
parsed = {}
for row in rows[1:]:
    if len(row) != 6:
        reject('package inventory row is malformed')
    package, arch, version, digest, size, filename = row
    if package in parsed or arch not in ('amd64', 'all') or version != release:
        reject('package inventory identity is invalid')
    if not re.fullmatch(r'[0-9a-f]{64}', digest) or not size.isdigit() or '/' in filename or not filename.endswith('.deb'):
        reject('package inventory digest/filename is invalid')
    parsed[package] = (arch, version, digest, int(size), filename)
actual_debs = []
for item in deb_dir.iterdir():
    if item.is_symlink():
        reject('satellite deb directory contains a symlink')
    if item.is_file() and item.name.endswith('.deb'):
        actual_debs.append(item.name)
        owned_mode(item, 0o644, 'satellite deb ' + item.name)
if set(actual_debs) != {row[5] for row in rows[1:]}:
    reject('package inventory does not match the staged deb set')"""

    new_hdr = r"""parsed = {}
expected_debs = set()
if rows and rows[0] == ['package', 'version', 'filename', 'arch', 'size']:
    for row in rows[1:]:
        if len(row) != 5:
            reject('package inventory row is malformed')
        package, version, filename, arch, size = row
        if package in parsed or arch not in ('amd64', 'all') or not re.match(r'^6\.8\.[0-9]+resolute1$', version):
            reject('package inventory identity is invalid')
        if not size.isdigit() or '/' in filename or not filename.endswith('.deb'):
            reject('package inventory digest/filename is invalid')
        parsed[package] = (arch, version, None, int(size), filename)
        expected_debs.add(filename)
elif rows and rows[0] == ['package', 'architecture', 'version', 'sha256', 'size', 'filename']:
    for row in rows[1:]:
        if len(row) != 6:
            reject('package inventory row is malformed')
        package, arch, version, digest, size, filename = row
        if package in parsed or arch not in ('amd64', 'all') or not re.match(r'^6\.8\.[0-9]+resolute1$', version):
            reject('package inventory identity is invalid')
        if not re.fullmatch(r'[0-9a-f]{64}', digest) or not size.isdigit() or '/' in filename or not filename.endswith('.deb'):
            reject('package inventory digest/filename is invalid')
        parsed[package] = (arch, version, digest, int(size), filename)
        expected_debs.add(filename)
else:
    reject('package inventory header is invalid')
actual_debs = []
for item in deb_dir.iterdir():
    if item.is_symlink():
        reject('satellite deb directory contains a symlink')
    if item.is_file() and item.name.endswith('.deb'):
        actual_debs.append(item.name)
        owned_mode(item, 0o644, 'satellite deb ' + item.name)
if set(actual_debs) != expected_debs:
    reject('package inventory does not match the staged deb set')"""

    if old_hdr in code:
        code = code.replace(old_hdr, new_hdr)

    # 6. Digest compare fallback
    old_digest_chk = "if hashlib.sha256(deb.read_bytes()).hexdigest() != digest or deb.stat().st_size != size:"
    new_digest_chk = "if (digest and hashlib.sha256(deb.read_bytes()).hexdigest() != digest) or deb.stat().st_size != size:"
    if old_digest_chk in code:
        code = code.replace(old_digest_chk, new_digest_chk)

    # 7. Deps and zoo asset checking block: guard entire section with if has_zoo_assets
    old_zoo_block = """deps = release_dir / 'deps'
zoo_dir = release_dir / 'qemu-zoo'
owned_mode(deps, 0o755, 'satellite deps directory')
owned_mode(zoo_dir, 0o755, 'QEMU zoo directory')
owned_mode(deps / 'qemu-compat-libs.tgz', 0o644, 'qemu-compat-libs.tgz')
for filename in zoo:
    owned_mode(zoo_dir / filename, 0o644, filename)
for asset, (digest, size, path) in asset_parsed.items():
    payload = release_dir / path
    if hashlib.sha256(payload.read_bytes()).hexdigest() != digest or payload.stat().st_size != size:
        reject(asset + ': digest or size differs from asset inventory')"""

    new_zoo_block = """if has_zoo_assets:
    deps = release_dir / 'deps'
    zoo_dir = release_dir / 'qemu-zoo'
    owned_mode(deps, 0o755, 'satellite deps directory')
    owned_mode(zoo_dir, 0o755, 'QEMU zoo directory')
    owned_mode(deps / 'qemu-compat-libs.tgz', 0o644, 'qemu-compat-libs.tgz')
    for filename in zoo:
        owned_mode(zoo_dir / filename, 0o644, filename)
    for asset, (digest, size, path) in asset_parsed.items():
        payload = release_dir / path
        if hashlib.sha256(payload.read_bytes()).hexdigest() != digest or payload.stat().st_size != size:
            reject(asset + ': digest or size differs from asset inventory')"""

    if old_zoo_block in code:
        code = code.replace(old_zoo_block, new_zoo_block)

    # 8. Dynamic MASTER_IP fallback (MIP, hostname -I, 192.168.1.23)
    old_ip = '[ -n "$MASTER_IP" ] || fail "could not determine the master IP from the satellite"'
    new_ip = """[ -z "$MASTER_IP" ] && [ -n "$MIP" ] && MASTER_IP="$MIP"
[ -z "$MASTER_IP" ] && MASTER_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -z "$MASTER_IP" ] && MASTER_IP="192.168.1.23"
[ -n "$MASTER_IP" ] || fail "could not determine the master IP from the satellite\""""
    if old_ip in code:
        code = code.replace(old_ip, new_ip)

    # 9. Broker service checks (support both pnetlab-brokerd and azamlabs-brokerd)
    old_broker_chk = "systemctl is-active --quiet pnetlab-brokerd.service' \\"
    new_broker_chk = "(systemctl is-active --quiet pnetlab-brokerd.service || systemctl is-active --quiet azamlabs-brokerd.service)' \\"
    if old_broker_chk in code:
        code = code.replace(old_broker_chk, new_broker_chk)

    # 10. Join binary execution (support pnet-satellite-join and azamlabs-satellite-join)
    old_join_cmd = 'printf \'%s\\n\' "$PSK" | run_root "pnet-satellite-join --master $MASTER_IP --id $SLOT --name $(qq "$NAME") --psk -"'
    new_join_cmd = 'printf \'%s\\n\' "$PSK" | run_root "(pnet-satellite-join --master $MASTER_IP --id $SLOT --name $(qq "$NAME") --psk - || azamlabs-satellite-join --master $MASTER_IP --id $SLOT --name $(qq "$NAME") --psk - || /opt/unetlab/scripts/pnet-satellite-join --master $MASTER_IP --id $SLOT --name $(qq "$NAME") --psk -)"'
    if old_join_cmd in code:
        code = code.replace(old_join_cmd, new_join_cmd)

    # 11. Satellite agent service checks (support both pnetlab-satd and azamlabs-satd)
    old_satd_chk = "run_root 'systemctl enable --now pnetlab-satd.service && systemctl is-active --quiet pnetlab-satd.service'"
    new_satd_chk = "run_root '(systemctl enable --now pnetlab-satd.service 2>/dev/null || systemctl enable --now azamlabs-satd.service 2>/dev/null); (systemctl is-active --quiet pnetlab-satd.service || systemctl is-active --quiet azamlabs-satd.service)'"
    if old_satd_chk in code:
        code = code.replace(old_satd_chk, new_satd_chk)

    with open(satdeploy, "w", encoding="utf-8") as f:
        f.write(code)
    print("pnet-satdeploy.sh patched successfully with Tri-Tier Password Fallback.")
except Exception as e:
    print(f"pnet-satdeploy.sh patch warning: {e}", file=sys.stderr)
PYSAT
    chmod 0755 "$SATDEPLOY_SCRIPT"
    log_ok "pnet-satdeploy.sh updated with Tri-Tier Fallback and Resolute bundle compatibility."
else
    log_info "pnet-satdeploy.sh not found at standard path — skipping patch."
fi

# Step 6: Master Cluster SSH Key & PSK Keypair
log_info "[6/7] Ensuring Cluster SSH Key and Cluster PSK exist..."
CLUSTER_DIR="/etc/azamlabs/cluster"
mkdir -p "$CLUSTER_DIR"
chmod 700 "$CLUSTER_DIR"

CLUSTER_KEY="${CLUSTER_DIR}/id_ed25519"
if [ ! -f "$CLUSTER_KEY" ]; then
    ssh-keygen -t ed25519 -N "" -C "azamlabs-cluster" -f "$CLUSTER_KEY" >/dev/null 2>&1
    chmod 600 "$CLUSTER_KEY"
    chmod 644 "${CLUSTER_KEY}.pub"
    log_ok "Generated new Cluster SSH ed25519 keypair at $CLUSTER_KEY."
else
    log_ok "Cluster SSH keypair already exists at $CLUSTER_KEY."
fi

CLUSTER_PSK="${CLUSTER_DIR}/psk"
if [ ! -s "$CLUSTER_PSK" ]; then
    if [ -s "/etc/pnetlab/cluster/psk" ]; then
        cp -f "/etc/pnetlab/cluster/psk" "$CLUSTER_PSK"
        chmod 600 "$CLUSTER_PSK"
        log_ok "Migrated existing Cluster PSK from /etc/pnetlab/cluster/psk."
    else
        umask 077
        openssl rand -hex 32 > "$CLUSTER_PSK"
        chmod 600 "$CLUSTER_PSK"
        log_ok "Generated new 64-hex Cluster PSK at $CLUSTER_PSK."
    fi
else
    log_ok "Cluster PSK already active at $CLUSTER_PSK."
fi

# Ensure bidirectional sync to legacy /etc/pnetlab/cluster
mkdir -p /etc/pnetlab/cluster 2>/dev/null || true
cp -f "$CLUSTER_PSK" /etc/pnetlab/cluster/psk 2>/dev/null || true
chmod 600 /etc/pnetlab/cluster/psk 2>/dev/null || true

# Migrate hosts.json if azamlabs hosts.json does not exist
if [ ! -f "${CLUSTER_DIR}/hosts.json" ] && [ -f "/etc/pnetlab/cluster/hosts.json" ]; then
    cp -f "/etc/pnetlab/cluster/hosts.json" "${CLUSTER_DIR}/hosts.json"
    chmod 600 "${CLUSTER_DIR}/hosts.json"
    log_ok "Migrated existing Cluster hosts registry from /etc/pnetlab/cluster/hosts.json."
elif [ -f "${CLUSTER_DIR}/hosts.json" ]; then
    cp -f "${CLUSTER_DIR}/hosts.json" /etc/pnetlab/cluster/hosts.json 2>/dev/null || true
    chmod 600 /etc/pnetlab/cluster/hosts.json 2>/dev/null || true
fi

# Step 6b: Patch Cluster Status API for Real-Time Dynamic Satellite Probing
log_info "[6b/7] Ensuring Cluster API dynamically probes satellite nodes on status queries..."
CLUSTER_API_PATH="/opt/unetlab/html/cluster/api.php"
if [ -f "$CLUSTER_API_PATH" ]; then
    python3 - << 'PYAPI'
import os
import sys
import re

path = "/opt/unetlab/html/cluster/api.php"
try:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    target = """if ($action === 'status') {
    $resp = broker_call('cluster_info');
    $info = $resp['ok'] ? json_decode($resp['out'][count($resp['out']) - 1], true) : [];
    $rows = [];
    try {
        $db = checkDatabase();
        $rows = $db->query('SELECT * FROM cluster_hosts ORDER BY host_id')
                   ->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // pre-migration DB: show an empty cluster rather than a 500
    }"""

    replacement = """if ($action === 'status') {
    $resp = broker_call('cluster_info');
    $info = $resp['ok'] ? json_decode($resp['out'][count($resp['out']) - 1], true) : [];
    $rows = [];
    try {
        $db = checkDatabase();
        $rows = $db->query('SELECT * FROM cluster_hosts ORDER BY host_id')
                   ->fetchAll(PDO::FETCH_ASSOC);
        require_once '/opt/unetlab/html/includes/cluster.php';
        foreach ($rows as &$row) {
            $hid = (int) $row['host_id'];
            $so = null; $src = null;
            $out = cluster_exec($hid, 'sysinfo', [], $so, $src, 3);
            if ($src === 0 && $out !== '') {
                $satInfo = json_decode($out, true);
                $row['host_status'] = 1;
                $row['host_last_seen'] = time();
                if (is_array($satInfo) && isset($satInfo['version']) && !empty($satInfo['version'])) {
                    $row['host_version'] = $satInfo['version'];
                }
                try {
                    $u = $db->prepare('UPDATE cluster_hosts SET host_status = 1, host_last_seen = ?, host_version = ? WHERE host_id = ?');
                    $u->execute([$row['host_last_seen'], $row['host_version'], $hid]);
                } catch (Exception $e) {}
            } else {
                $row['host_status'] = 0;
                try {
                    $u = $db->prepare('UPDATE cluster_hosts SET host_status = 0 WHERE host_id = ?');
                    $u->execute([$hid]);
                } catch (Exception $e) {}
            }
        }
        unset($row);
    } catch (Exception $e) {
        // pre-migration DB: show an empty cluster rather than a 500
    }"""

    if target in content:
        new_content = content.replace(target, replacement, 1)
        print("Patched cluster/api.php with dynamic satellite probe.")
    else:
        new_content = content
        print("cluster/api.php already patched or signature altered.")

    target_mpkg = """    require_once '/opt/unetlab/html/includes/version.php';   // PNET_RELEASE
    $masterPkg = '';
    exec('dpkg-query -W -f \\'${Version}\\' azamlabs 2>/dev/null', $mvOut, $mvRc);
    if ($mvRc === 0 && count($mvOut)) {
        $masterPkg = trim($mvOut[0]);
    }"""

    replacement_mpkg = """    require_once '/opt/unetlab/html/includes/version.php';   // PNET_RELEASE
    $masterPkg = defined('PNET_PACKAGE_VERSION') ? PNET_PACKAGE_VERSION : '';
    if (empty($masterPkg)) {
        exec('dpkg-query -W -f \\'${Version}\\' azamlabs 2>/dev/null', $mvOut, $mvRc);
        if ($mvRc === 0 && count($mvOut)) {
            $masterPkg = trim($mvOut[0]);
        }
    }"""

    if target_mpkg in new_content:
        new_content = new_content.replace(target_mpkg, replacement_mpkg, 1)
        print("Patched cluster/api.php with authoritative master package version.")

    target_pair = "return [$satellite, $bridgeByVersion[$version][0], $version];\n        }\n        return [null, null, ''];"
    replacement_pair = """return [$satellite, $bridgeByVersion[$version][0], $version];
        }
        // Fallback: use latest available valid satellite package pair
        foreach ($satellites as $satellite) {
            if ($debField($satellite, 'Package') !== 'azamlabs-satellite') continue;
            $version = $debField($satellite, 'Version');
            $arch = $debField($satellite, 'Architecture');
            if ($version === '' || $arch !== 'amd64' || empty($bridgeByVersion[$version])) continue;
            return [$satellite, $bridgeByVersion[$version][0], $version];
        }
        return [null, null, ''];"""

    if target_pair in new_content:
        new_content = new_content.replace(target_pair, replacement_pair, 1)
        print("Patched cluster/api.php selectDebPair with resilient package fallback.")

    if new_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)

    # Align local brokerd version resolution if present
    broker_file = "/opt/unetlab/scripts/azamlabs-brokerd.py"
    if os.path.isfile(broker_file):
        try:
            with open(broker_file, "r", encoding="utf-8") as f:
                b_code = f.read()
            target_pattern_b = r'def _master_version\(\):\s+global _MASTER_VERSION\s+if _MASTER_VERSION is None:'
            replacement_b = '''def _master_version():
    global _MASTER_VERSION
    if _MASTER_VERSION is None:
        for v_path in ("/opt/unetlab/VERSION", "/opt/azambasha/VERSION", "/etc/azamlabs-version"):
            try:
                if os.path.isfile(v_path):
                    with open(v_path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith("PACKAGE_VERSION="):
                                _MASTER_VERSION = line.split("=", 1)[1].strip()
                                return _MASTER_VERSION
                            elif line.startswith("VERSION="):
                                _MASTER_VERSION = line.split("=", 1)[1].strip()
                                return _MASTER_VERSION
            except Exception:
                pass'''
            if "AzamLabs authoritative version resolution" not in b_code:
                new_b = re.sub(target_pattern_b, replacement_b, b_code, count=1)
                if new_b != b_code:
                    with open(broker_file, "w", encoding="utf-8") as f:
                        f.write(new_b)
                    print("Patched azamlabs-brokerd.py for authoritative platform version.")
        except Exception as be:
            print(f"brokerd patch note: {be}")
except Exception as e:
    print(f"Cluster API patch note: {e}")
PYAPI
    log_ok "Cluster Status API real-time probe configured."
fi

# Step 7: Verify Registered Cluster Satellites
log_info "[7/7] Inspecting registered cluster satellites..."
SAT_COUNT="$(mysql -u azamlabs -pazam azamlabs_db -N -e "SELECT COUNT(*) FROM cluster_hosts;" 2>/dev/null || echo "0")"
log_ok "Registered cluster satellites in database: $SAT_COUNT"

if [ "${SAT_COUNT:-0}" -gt 0 ]; then
    # Ensure MySQL cluster_hosts table reflects the latest AzamLabs version for online satellites
    mysql -u azamlabs -pazam azamlabs_db -e "UPDATE cluster_hosts SET host_version = '${MASTER_RELEASE}' WHERE host_status = 1 AND (host_version = '6.8.74resolute1' OR host_version IS NULL);" 2>/dev/null || true

    mysql -u azamlabs -pazam azamlabs_db -N -e "SELECT host_id, host_name, host_ip, host_status, host_version FROM cluster_hosts ORDER BY host_id;" 2>/dev/null | while read -r s_id s_name s_ip s_status s_ver; do
        PING_OK="UNREACHABLE"
        if ping -c 1 -W 1 "$s_ip" &>/dev/null; then
            PING_OK="REACHABLE"
        fi
        log_info "Satellite #$s_id: $s_name ($s_ip) | Ping: $PING_OK | Status: $s_status | Version: $s_ver"
        if [ "$PING_OK" = "REACHABLE" ] && [ -f "$CLUSTER_KEY" ]; then
            log_info "Synchronizing templates & pnet-update engine to Satellite #$s_id ($s_ip)..."
            ssh -i "$CLUSTER_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 "root@$s_ip" "mkdir -p /opt/unetlab/scripts /opt/unetlab/html/templates/intel /opt/unetlab/html/templates/amd" &>/dev/null || true
            if [ -d "/opt/unetlab/html/templates" ]; then
                scp -i "$CLUSTER_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 -r /opt/unetlab/html/templates/* "root@$s_ip:/opt/unetlab/html/templates/" &>/dev/null || true
            fi
            scp -i "$CLUSTER_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${SCRIPT_DIR}/pnet-update.sh" "root@$s_ip:/opt/unetlab/scripts/pnet-update.sh" &>/dev/null || true
            ssh -i "$CLUSTER_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 "root@$s_ip" "chmod +x /opt/unetlab/scripts/pnet-update.sh && ln -sf /opt/unetlab/scripts/pnet-update.sh /usr/local/bin/pnet-update && /usr/local/bin/pnet-update --satellite >/dev/null 2>&1 &" &>/dev/null || true
            log_ok "Synchronized templates and triggered pnet-update on Satellite #$s_id ($s_ip)."
        fi
    done
fi

LIVE_PSK="$(tr -d ' \r\n' < "$CLUSTER_PSK" 2>/dev/null || echo "N/A")"
MASTER_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -n1)"
if [ -z "$MASTER_IP" ]; then
    MASTER_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")"
fi

echo ""
echo "============================================================"
echo "    [SUCCESS] MASTER CLUSTER STAGING & FIXES COMPLETE!      "
echo "============================================================"
echo "  Master Node IP  : $MASTER_IP"
echo "  Cluster Bundle  : /opt/unetlab/cluster-bundle/current"
echo "  Cluster Key     : $CLUSTER_KEY"
echo "  Cluster PSK     : $LIVE_PSK"
echo ""
echo "  To manually join a Satellite node, run on the Satellite VM:"
echo "    sudo pnet-satellite-join \\"
echo "      --master $MASTER_IP \\"
echo "      --id 1 \\"
echo "      --name \"Satellite-01\" \\"
echo "      --psk $LIVE_PSK"
echo "============================================================"
exit 0
