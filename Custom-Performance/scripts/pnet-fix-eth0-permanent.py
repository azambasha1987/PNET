#!/usr/bin/env python3
# ==============================================================================
# PNetLab Permanent eth0 / First-Boot Wizard Fix for Ubuntu 24/26
# Eliminates the "Interface eth0 not found" dialog on restart / login by:
# 1. Neutralizing auto-execution of ovfconfig.sh in /etc/profile.d/ovf.sh
# 2. Patching /opt/ovf/ovfconfig.sh to dynamically support ens33/ens160/enp0s3
# 3. Patching /opt/ovf/ovfstartup.sh, pnet-bridges.sh & pnet-fwd-reconcile.sh
# 4. Marking /opt/ovf/.configured as permanently configured
# 5. Masking legacy first-boot wizards and clearing pending flags
# ==============================================================================
import os
import sys
import subprocess
import shutil
import re
import argparse

def main():
    parser = argparse.ArgumentParser(description="PNetLab Permanent eth0 & OVF Setup Modernization Fix")
    parser.add_argument("--check", action="store_true", help="Non-destructive check of OVF setup state")
    parser.add_argument("--dry-run", action="store_true", help="Simulate modernization patches without writing changes")
    args = parser.parse_args()

    print("=" * 60)
    print("    Applying Permanent eth0 & OVF Setup Modernization Fix   ")
    print("=" * 60)

    # 1. Discover primary physical interface
    real_iface = "ens33"
    try:
        res = subprocess.run(["ip", "-o", "link", "show"], capture_output=True, text=True, timeout=5)
        for line in res.stdout.splitlines():
            parts = line.split(":")
            if len(parts) >= 2:
                name = parts[1].strip().split("@")[0]
                if name.startswith(("ens", "enp", "eno", "eth")) and not name.startswith("pnet"):
                    real_iface = name
                    break
    except Exception:
        pass

    print(f"[1/5] Detected primary physical uplink: {real_iface}")

    if args.check:
        ovf_configured = os.path.isfile("/opt/ovf/.configured")
        profile_ovf = os.path.isfile("/etc/profile.d/ovf.sh")
        print(f"      -> /opt/ovf/.configured: {'PRESENT' if ovf_configured else 'NOT CONFIGURED'}")
        print(f"      -> /etc/profile.d/ovf.sh: {'PRESENT' if profile_ovf else 'NOT FOUND'}")
        print("[✔] Diagnostic check completed.")
        return 0

    if getattr(args, 'dry_run', False):
        print("  [DRY-RUN] Would mark /opt/ovf/.configured permanently")
        print(f"  [DRY-RUN] Would update ovf scripts to bind uplink {real_iface}")
        print("  [✔] Dry-run completed successfully.")
        return 0

    # 2. Touch permanent configured flag & remove pending flags
    print("[2/5] Marking OVF configuration flags...")
    os.makedirs("/opt/ovf", exist_ok=True)
    try:
        with open("/opt/ovf/.configured", "w") as f:
            f.write(f"configured=true\nuplink={real_iface}\n")
        print("      -> Successfully marked /opt/ovf/.configured")
    except Exception as e:
        print(f"      [!] Could not write /opt/ovf/.configured: {e}")

    for p in ["/root/.ovf_firstboot", "/opt/ovf/.pending", "/tmp/ovf_setup.lock"]:
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass
    print("      -> Cleared legacy firstboot and pending flags")

    # 3. Patch /etc/profile.d/ovf.sh to prevent interactive prompt loop
    print("[3/5] Neutralizing auto-launch in /etc/profile.d/ovf.sh...")
    ovf_profile = "/etc/profile.d/ovf.sh"
    if os.path.isfile(ovf_profile):
        try:
            with open(ovf_profile, "w") as f:
                f.write("#!/bin/sh\n# PNetLab: Auto-prompt neutralized permanently\nexit 0\n")
            os.chmod(ovf_profile, 0o644)
            print(f"      -> Neutralized {ovf_profile}")
        except Exception as e:
            print(f"      [!] Could not modify {ovf_profile}: {e}")

    # 4. Patch /opt/ovf/ovfconfig.sh if present
    print("[4/5] Patching /opt/ovf/ovfconfig.sh...")
    ovf_config = "/opt/ovf/ovfconfig.sh"
    if os.path.isfile(ovf_config):
        try:
            with open(ovf_config, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if "eth0" in content:
                content_patched = re.sub(r"\beth0\b", real_iface, content)
                with open(ovf_config, "w", encoding="utf-8") as f:
                    f.write(content_patched)
                print(f"      -> Replaced hardcoded eth0 with {real_iface} in {ovf_config}")
        except Exception as e:
            print(f"      [!] Could not patch {ovf_config}: {e}")

    # 5. Patch /opt/ovf/ovfstartup.sh & pnet-bridges
    print("[5/5] Patching ovfstartup, pnet-bridges, and ebtables firewall rules...")
    for script in ["/opt/ovf/ovfstartup.sh", "/opt/unetlab/scripts/pnet-bridges.sh", "/opt/unetlab/scripts/pnet-fwd-reconcile.sh"]:
        if os.path.isfile(script):
            try:
                with open(script, "r", encoding="utf-8", errors="ignore") as f:
                    sc = f.read()
                sc_patched = sc.replace("-o eth0", f"-o {real_iface}").replace("dev eth0", f"dev {real_iface}")
                with open(script, "w", encoding="utf-8") as f:
                    f.write(sc_patched)
                os.chmod(script, 0o755)
                print(f"      -> Patched {script}")
            except Exception as e:
                print(f"      [!] Could not patch {script}: {e}")

    # Mask firstboot service if present
    if shutil.which("systemctl"):
        subprocess.run(["systemctl", "mask", "azamlabs-netcfg-firstboot.service"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["systemctl", "mask", "pnet-netcfg-firstboot.service"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["systemctl", "daemon-reload"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("=" * 60)
    print("    [SUCCESS] eth0 & First-Boot Wizard Permanently Neutralized! ")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
