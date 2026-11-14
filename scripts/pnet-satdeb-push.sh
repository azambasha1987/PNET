#!/bin/bash
# pnet-satdeb-push.sh — push the master's satellite package set to a joined
# satellite and have it install the set. Runs as root in a transient systemd
# unit (pnet-satdeb-<job>, spawned by brokerd's cluster_sync_satellite):
#
#   pnet-satdeb-push.sh <sat_ip> <host_id> <satellite_deb> <bridge_deb> \
#       <docker_deb> <qemu_deb> <vpcs_deb> <job>
#
# The set is the one the satellite installer installs and holds:
# pnetlab-satellite, pnetlab-bridge-dkms, pnetlab-docker, pnetlab-qemu and
# pnetlab-vpcs, all at one Debian version.
# Transport: the satellite pins the cluster key to `rrsync /opt/unetlab`, so
# the debs are rsynced into /opt/unetlab/satdeb (same jail as image sync) and
# the install is requested through satd (cluster_call satellite_self_update,
# which takes only the version and this job id). The satellite writes its
# progress to satdeb/status.json, pulled back over the same jail.
# Progress lands in html/cluster/jobs/<job>.json (same poll as image sync /
# cluster/api.php?action=sync_status). Final state: "done" or "error".
set -u
set -o pipefail

SAT="${1:-}"
HOST_ID="${2:-}"
SAT_DEB="${3:-}"
BRIDGE_DEB="${4:-}"
DOCKER_DEB="${5:-}"
QEMU_DEB="${6:-}"
VPCS_DEB="${7:-}"
JOB="${8:-}"

BASE="/opt/unetlab/html/cluster"
ST="${BASE}/jobs/invalid.json"
KEY="/etc/pnetlab/cluster/id_ed25519"
SSHOPT="ssh -i ${KEY} -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10"
INSTALL_TIMEOUT=1200

mkdir -p "${BASE}/jobs"
upd() {
    # Escape any double-quotes in the message so the JSON stays valid.
    local msg="${3//\"/}"
    printf '{"state":"%s","pct":%s,"msg":"%s"}\n' "$1" "$2" "$msg" > "$ST"
    chmod 644 "$ST" 2>/dev/null || true
}
fail() { upd "error" 0 "$1"; exit 1; }

# ── arg validation ─────────────────────────────────────────────────────────────
[ "$#" -eq 8 ] && [ -n "$SAT" ] && [ -n "$SAT_DEB" ] && [ -n "$BRIDGE_DEB" ] && \
    [ -n "$DOCKER_DEB" ] && [ -n "$QEMU_DEB" ] && [ -n "$VPCS_DEB" ] && \
    [ -n "$JOB" ] || fail "bad arguments"
[[ "$JOB" =~ ^[0-9a-f]{16}$ ]] || fail "bad job id"
ST="${BASE}/jobs/${JOB}.json"
[[ "$HOST_ID" =~ ^[1-5]$ ]] || fail "bad host id"
[ -f "$KEY" ] || fail "cluster key missing (/etc/pnetlab/cluster/id_ed25519)"

deb_field() {
    dpkg-deb -f "$1" "$2" 2>/dev/null || true
}

# One payload: present, exact package identity, allowed architecture, the
# shared set version and the dpkg filename <package>_<version>_<arch>.deb that
# the satellite derives from the version. The source paths are jailed by
# brokerd, but this worker is the authoritative root-side check.
SET_VERSION=""
check_deb() {
    local path="$1" package="$2" archs="$3" version arch
    [ -f "$path" ] || fail "${package} deb not found: ${path}"
    [ "$(deb_field "$path" Package)" = "$package" ] || \
        fail "${package} deb package identity is invalid"
    arch="$(deb_field "$path" Architecture)"
    case " ${archs} " in
        *" ${arch} "*) ;;
        *) fail "${package} deb architecture is not ${archs}" ;;
    esac
    version="$(deb_field "$path" Version)"
    [ -n "$version" ] || fail "${package} deb has no version"
    [ -n "$SET_VERSION" ] || SET_VERSION="$version"
    [ "$version" = "$SET_VERSION" ] || \
        fail "satellite package versions do not match (${package} ${version}, expected ${SET_VERSION})"
    cp -- "$path" "${STAGE}/satdeb/${package}_${version}_${arch}.deb" || \
        fail "could not stage ${package} deb"
}

# Root-only staging outside the world-writable /opt/unetlab/tmp.
STAGE="$(mktemp -d /var/tmp/pnet-satdeb.XXXXXXXX)" || fail "could not create a staging directory"
trap 'rm -rf -- "$STAGE"' EXIT
mkdir -m 0755 "${STAGE}/satdeb"
check_deb "$SAT_DEB" pnetlab-satellite amd64
check_deb "$BRIDGE_DEB" pnetlab-bridge-dkms all
check_deb "$DOCKER_DEB" pnetlab-docker amd64
check_deb "$QEMU_DEB" pnetlab-qemu amd64
check_deb "$VPCS_DEB" pnetlab-vpcs amd64
[[ "$SET_VERSION" =~ ^[0-9][A-Za-z0-9.+~]{0,63}$ ]] || fail "unsupported package version ${SET_VERSION}"
chmod 0644 "${STAGE}"/satdeb/*.deb

upd "running" 0 "connecting to ${SAT}"

# ── 1. rsync the set into the satellite's jail (0 → 60 %) ─────────────────────
upd "running" 5 "copying satellite packages ${SET_VERSION} to ${SAT}"
$SSHOPT "root@${SAT}" "mkdir -p /opt/unetlab/satdeb && chmod 0755 /opt/unetlab/satdeb && ln -sfn /opt/unetlab/satdeb /root/satdeb 2>/dev/null || true" >/dev/null 2>&1 || true
# "$STAGE/./satdeb" (not "./satdeb/"): the relative path starts at satdeb, so
# rsync never sends "." and leaves the jail root's owner and mode alone.
RSYNC_ERR=$(rsync -a -R -e "$SSHOPT" "${STAGE}/./satdeb" "root@${SAT}:." 2>&1)
RSYNC_RC=$?
if [ "${RSYNC_RC}" -ne 0 ]; then
    ERRMSG=$(printf '%s' "${RSYNC_ERR}" | tr '\n' ' ' | tr '"' "'")
    fail "rsync failed (rc ${RSYNC_RC}): ${ERRMSG}"
fi

# ── 2. ask the satellite to install it (60 → 70 %) ────────────────────────────
upd "running" 60 "requesting the install on ${SAT}"
CALL_OUT=$(python3 - "$HOST_ID" "$SET_VERSION" "$JOB" <<'PY'
import json, socket, sys
host, version, job = sys.argv[1:4]
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(90)
s.connect("/run/pnetlab/broker.sock")
s.sendall((json.dumps({"verb": "cluster_call", "args": {
    "host": int(host), "verb": "satellite_self_update",
    "args": {"version": version, "job": job}}}) + "\n").encode())
buf = b""
while not buf.endswith(b"\n"):
    chunk = s.recv(65536)
    if not chunk:
        break
    buf += chunk
resp = json.loads(buf or b"{}")
print(resp.get("rc", 255), (resp.get("err") or " ".join(resp.get("out") or []))[:300])
PY
)
CALL_RC="${CALL_OUT%% *}"
if [ "${CALL_RC}" != 0 ]; then
    case "$CALL_OUT" in
        *"verb not allowed"*)
            fail "satellite ${SAT} predates self-update; redeploy it once, then Sync works" ;;
    esac
    fail "satellite install request failed: $(printf '%s' "${CALL_OUT#* }" | tr '"' "'")"
fi

# ── 3. follow the satellite's status file (70 → 100 %) ───────────────────────
upd "running" 70 "installing satellite packages ${SET_VERSION} on ${SAT}"
deadline=$(( $(date +%s) + INSTALL_TIMEOUT ))
while [ "$(date +%s)" -lt "$deadline" ]; do
    sleep 3
    rm -f -- "${STAGE}/status.json"
    rsync -e "$SSHOPT" "root@${SAT}:satdeb/status.json" "${STAGE}/status.json" >/dev/null 2>&1 || continue
    read -r state msg < <(python3 - "${STAGE}/status.json" "$JOB" <<'PY'
import json, sys
try:
    with open(sys.argv[1]) as f:
        st = json.load(f)
except (OSError, ValueError):
    st = {}
if st.get("job") != sys.argv[2]:
    print("pending")
else:
    print(st.get("state", "pending"), str(st.get("msg", "")).replace("\n", " ")[:300])
PY
    )
    case "$state" in
        done)
            mysql -u root -ppnetlab pnetlab_db -e "UPDATE cluster_hosts SET host_status=1, host_version='${SET_VERSION}', host_last_seen=UNIX_TIMESTAMP() WHERE host_id=${HOST_ID};" 2>/dev/null || true
            python3 -c "import json, os; p='/etc/pnetlab/cluster/hosts.json'; os.path.exists(p) and (lambda d: (d.get('hosts',{}).get('${HOST_ID}',{}).update({'version':'${SET_VERSION}'}), json.dump(d, open(p,'w'), indent=2)))(json.load(open(p)))" 2>/dev/null || true
            rm -f /dev/shm/pnq-cluster.cache.json /dev/shm/pnq-cluster.cache.json.lock 2>/dev/null || true
            upd "done" 100 "satellite ${SAT} updated to ${SET_VERSION}; satd restarted"
            exit 0 ;;
        error)
            fail "satellite install failed: ${msg}" ;;
        running)
            upd "running" 80 "${SAT}: ${msg}" ;;
    esac
done
fail "satellite ${SAT} did not finish the install within ${INSTALL_TIMEOUT} s"
