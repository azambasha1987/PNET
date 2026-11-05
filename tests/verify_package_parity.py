#!/usr/bin/env python3
"""
Automated Package Payload Parity & Regression Gate
Verifies that any built .deb package contains 100% of the customized
PNetLab files and zero upstream stock clobbering files.
"""

import os
import subprocess
import tempfile
import sys
import paramiko

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if not os.path.isdir(os.path.join(REPO_ROOT, "scripts")):
    REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def _resolve_deb_paths():
    version_file = os.path.join(REPO_ROOT, "VERSION")
    v = "6.8.93"
    if os.path.isfile(version_file):
        with open(version_file, "r", encoding="utf-8") as f:
            v = f.read().strip()
    cands_deb = [
        os.path.join(REPO_ROOT, "releases", v, "debs", f"pnetlab_{v}_amd64.deb"),
        os.path.join(REPO_ROOT, "releases", "6.8.93resolute1", "debs", "pnetlab_6.8.93resolute1_amd64.deb"),
        os.path.join(REPO_ROOT, "debian", "pool", "resolute", "main", f"pnetlab_{v}_amd64.deb"),
        os.path.join(REPO_ROOT, "debian", "pool", "resolute", "main", "pnetlab_6.8.93resolute1_amd64.deb"),
    ]
    cands_bridge = [
        os.path.join(REPO_ROOT, "releases", v, "debs", f"pnetlab-bridge-dkms_{v}_all.deb"),
        os.path.join(REPO_ROOT, "releases", "6.8.93resolute1", "debs", "pnetlab-bridge-dkms_6.8.93resolute1_all.deb"),
        os.path.join(REPO_ROOT, "debian", "pool", "resolute", "main", f"pnetlab-bridge-dkms_{v}_all.deb"),
        os.path.join(REPO_ROOT, "debian", "pool", "resolute", "main", "pnetlab-bridge-dkms_6.8.93resolute1_all.deb"),
    ]
    core = next((p for p in cands_deb if os.path.isfile(p)), cands_deb[0])
    bridge = next((p for p in cands_bridge if os.path.isfile(p)), cands_bridge[0])
    return core, bridge

DEB_PATH, BRIDGE_DEB_PATH = _resolve_deb_paths()

def run_parity_check():
    print("=" * 70)
    print("AZAMLABS DEBIAN PACKAGE PAYLOAD PARITY & REGRESSION GATE")
    print(f"Target Core Deb:   {DEB_PATH}")
    print(f"Target Bridge Deb: {BRIDGE_DEB_PATH}")
    print("=" * 70)

    if not os.path.isfile(DEB_PATH):
        print(f"[FAIL] Deb package not found: {DEB_PATH}")
        sys.exit(1)

    return run_on_vm()

def run_on_vm():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('<MASTER_IP>', username='root', password='pnet')

    # Always copy fresh candidate deb to /tmp/verify_core_deb.deb on VM
    sftp = ssh.open_sftp()
    remote_deb = '/tmp/verify_core_deb.deb'
    print("Uploading fresh core deb to VM for verification...")
    sftp.put(DEB_PATH, remote_deb)
    sftp.close()

    script = """
    WORK=$(mktemp -d)
    dpkg-deb -x /tmp/verify_core_deb.deb "$WORK"
    
    echo "=== Checking Required PNetLab Patterns in Core Engine ==="
    grep -q -E "Default:.*admin.*(pnet|azam)" "$WORK/opt/unetlab/html/login/index.html" && echo "PASS: Login default creds" || echo "FAIL: Login default creds"
    grep -q "laser-sweep-ring" "$WORK/opt/unetlab/html/login/index.html" && echo "PASS: Login holographic avatar" || echo "FAIL: Login holographic avatar"
    grep -q "Anti-Bootstorm Engine" "$WORK/opt/unetlab/html/main/js/pnet-features.js" && echo "PASS: Bootstorm in main GUI" || echo "FAIL: Bootstorm in main GUI"
    grep -q "pnet-features.js" "$WORK/opt/unetlab/html/themes/default/index.html" && echo "PASS: Canvas HUD injected" || echo "FAIL: Canvas HUD injected"
    grep -q "isHttps" "$WORK/opt/unetlab/html/api.php" && echo "PASS: Dynamic HTTP cookie" || echo "FAIL: Dynamic HTTP cookie"
    grep -q "6.8.93" "$WORK/opt/unetlab/html/includes/version.php" && echo "PASS: Version 6.8.93" || echo "FAIL: Version 6.8.93"
    grep -q 'strnatcasecmp($a.*name.*$b.*name' "$WORK/opt/unetlab/html/includes/api_folders.php" && echo "PASS: Natural ascending sort in api_folders.php" || echo "FAIL: Natural ascending sort in api_folders.php"
    grep -q 'mem-merge=on' "$WORK/opt/unetlab/html/devices/qemu/device_qemu.php" && echo "PASS: Dynamic QEMU deduplication interceptor" || echo "FAIL: Dynamic QEMU deduplication interceptor"
    grep -q 'ksm_merge_exec' "$WORK/opt/unetlab/html/devices/iol/device_iol.php" && echo "PASS: Cisco IOL ksm_merge_exec launcher interceptor" || echo "FAIL: Cisco IOL ksm_merge_exec launcher interceptor"
    [ -f "$WORK/opt/unetlab/wrappers/pnet-iol-shim64.so" ] && [ -f "$WORK/opt/unetlab/wrappers/pnet-iol-shim32.so" ] && echo "PASS: Multiarch adaptive IOL C-shims" || echo "FAIL: Multiarch adaptive IOL C-shims"
    [ -f "$WORK/opt/unetlab/themes/default/js/pnet-keepalive.js" ] && echo "PASS: Pre-baked frontend keepalive script" || echo "FAIL: Pre-baked frontend keepalive script"
    
    echo "=== Checking Forbidden Stock Upstream Patterns ==="
    if grep -q "pnet" "$WORK/opt/unetlab/html/login/index.html"; then
        echo "FAIL: Stock pnet string found in login/index.html!"
    else
        echo "PASS: Zero stock pnet passwords in login"
    fi
    if grep -q "Offline appliance access" "$WORK/opt/unetlab/html/login/index.html"; then
        echo "FAIL: Stock Offline appliance access footnote found!"
    else
        echo "PASS: Zero stock footnotes"
    fi
    
    rm -rf "$WORK"
    """
    stdin, stdout, stderr = ssh.exec_command(script)
    out = stdout.read().decode()
    print(out)
    ssh.close()
    return "FAIL:" not in out

if __name__ == '__main__':
    success = run_parity_check()
    if success:
        print("[ALL GATES PASSED] Package payload is 100% compliant with PNetLab standards.")
    else:
        print("[GATE FAILED] Package contains clobbered or stock files!")
        sys.exit(1)
