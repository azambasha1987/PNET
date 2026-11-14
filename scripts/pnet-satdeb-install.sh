#!/bin/bash
# pnet-satdeb-install.sh — install the satellite package set the master staged
# under /opt/unetlab/satdeb, on THIS satellite. Runs as root in a transient
# systemd unit (pnet-satself-update, spawned by brokerd's
# satellite_self_update, which the master reaches through satd):
#
#   pnet-satdeb-install.sh <version> <job>
#
# The master copies the debs over its rrsync-jailed cluster key (it can write
# under /opt/unetlab and nowhere else), so this worker takes no paths: the five
# filenames are derived from the version, and every file must be a root-owned
# regular file with the expected package identity. A separate unit is needed
# because the satellite deb's postinst restarts brokerd and satd.
# Progress lands in /opt/unetlab/satdeb/status.json, which the master pulls
# back over the same rsync jail. Final state: "done" or "error".
set -u

DIR="/opt/unetlab/satdeb"
VERSION="${1:-}"
JOB="${2:-}"
ST="${DIR}/status.json"
PACKAGES=(pnetlab-satellite pnetlab-bridge-dkms pnetlab-docker pnetlab-qemu pnetlab-vpcs)

log() { echo "pnet-satdeb-install: $*" >&2; }

# The staging directory must be root's alone before anything is written to it
# or read from it.
dir_ok() {
    [ -d "$DIR" ] && [ ! -L "$DIR" ] || return 1
    local owner mode
    owner="$(stat -c %u "$DIR")" mode="$(stat -c %a "$DIR")"
    [ "$owner" = 0 ] && [ $(( 8#$mode & 8#022 )) -eq 0 ]
}

upd() {
    local msg="${2//\"/}"
    printf '{"job":"%s","state":"%s","msg":"%s"}\n' "$JOB" "$1" "$msg" > "${ST}.tmp" \
        && mv -f -- "${ST}.tmp" "$ST"
}
fail() { log "$1"; upd "error" "$1"; exit 1; }

[[ "$VERSION" =~ ^[0-9][A-Za-z0-9.+~]{0,63}$ ]] || { log "bad version"; exit 1; }
[[ "$JOB" =~ ^[0-9a-f]{16}$ ]] || { log "bad job id"; exit 1; }
dir_ok || { log "${DIR} is missing or not root-only"; exit 1; }
upd "running" "verifying satellite packages ${VERSION}"

DEBS=()
for package in "${PACKAGES[@]}"; do
    arch=amd64
    [ "$package" = pnetlab-bridge-dkms ] && arch=all
    path="${DIR}/${package}_${VERSION}_${arch}.deb"
    [ -f "$path" ] && [ ! -L "$path" ] || fail "${package} ${VERSION} was not staged"
    [ "$(stat -c %u "$path")" = 0 ] && [ $(( 8#$(stat -c %a "$path") & 8#022 )) -eq 0 ] \
        || fail "${package} deb is not root-only"
    [ "$(dpkg-deb -f "$path" Package 2>/dev/null)" = "$package" ] \
        && [ "$(dpkg-deb -f "$path" Version 2>/dev/null)" = "$VERSION" ] \
        && [ "$(dpkg-deb -f "$path" Architecture 2>/dev/null)" = "$arch" ] \
        || fail "${package} deb identity does not match ${VERSION}"
    DEBS+=("$path")
done

upd "running" "installing satellite packages ${VERSION}"

# The same transaction as the satellite installer. apt resolves Depends that a
# new release adds (plain dpkg -i left pnetlab-satellite half-configured), and
# --reinstall keeps the same-version repair action working. apt-get update is
# best effort: with every Depends already present the install needs no
# network, and a Depends that an offline satellite cannot fetch makes apt
# refuse before dpkg runs, so the previous packages stay configured. The set
# is held again, as the installer leaves it, and the staged debs are always
# removed.
export DEBIAN_FRONTEND=noninteractive
apt-get update -q >/dev/null 2>&1
out=$(apt-get install -y -q --reinstall --allow-downgrades \
    --allow-change-held-packages --no-install-recommends \
    -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold \
    "${DEBS[@]}" 2>&1)
rc=$?
rm -f -- "${DEBS[@]}"
if [ "$rc" -ne 0 ]; then
    printf '%s\n' "$out" >&2
    fail "apt-get install failed (rc ${rc}): $(printf '%s\n' "$out" | grep -E '^(E:|Depends:| )' | tail -n 6 | tr '\n' ' ')"
fi
apt-mark hold "${PACKAGES[@]}" >/dev/null || fail "apt-mark hold failed"
for package in "${PACKAGES[@]}"; do
    status="$(dpkg-query -W -f='${db:Status-Abbrev}' "$package" 2>/dev/null)"
    [ "$status" = 'hi ' ] || fail "${package} is not configured and held (${status:-missing})"
done
test -x /usr/lib/pnetlab/pnetlab-bridge-lacp-check || fail "bridge LACP check missing"
test -x /usr/sbin/pnetlab-bridge-dkms-status || fail "bridge DKMS status missing"

systemctl restart pnetlab-satd || fail "pnetlab-satd restart failed"
upd "done" "satellite packages ${VERSION} installed; satd restarted"
exit 0
