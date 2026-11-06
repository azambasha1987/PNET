#!/usr/bin/env python3
"""
PNetLab Universal Image Reconciler & Alias Engine
================================================
Scans /opt/unetlab/labs for node image references and compares them against
installed images in /opt/unetlab/addons/qemu, /opt/unetlab/addons/iol/bin,
and /opt/unetlab/addons/dynamips.

In --check mode (default): reports missing images and possible alias matches.
In --fix mode: automatically creates relative symlinks in /opt/unetlab/addons/qemu
so that imported labs work immediately without per-node manual configuration.
"""

import os
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict

QEMU_DIR = "/opt/unetlab/addons/qemu"
IOL_DIR = "/opt/unetlab/addons/iol/bin"
DYN_DIR = "/opt/unetlab/addons/dynamips"
LABS_DIR = "/opt/unetlab/labs"

CANONICAL_FAMILY_MAP = {
    "cat9kv": ["cat9kvuadp", "cat9kvq200"],
    "cat9k": ["cat9kvuadp", "cat9kvq200"],
}

def get_installed_qemu():
    if not os.path.isdir(QEMU_DIR):
        return {}, {}
    installed = {}
    by_prefix = defaultdict(list)
    for entry in os.scandir(QEMU_DIR):
        if entry.is_dir():
            name = entry.name
            installed[name] = os.path.realpath(entry.path)
            prefix = name.split("-")[0].lower()
            by_prefix[prefix].append(name)
    # Sort installed lists so newest version is preferred
    for p in by_prefix:
        by_prefix[p].sort(reverse=True)
    return installed, by_prefix

def find_best_target(missing_img, tmpl, by_prefix):
    prefix = missing_img.split("-")[0].lower()
    tmpl_prefix = tmpl.lower() if tmpl else prefix
    
    # 1. Exact prefix match
    if prefix in by_prefix and by_prefix[prefix]:
        return by_prefix[prefix][0]
    
    # 2. Template prefix match
    if tmpl_prefix in by_prefix and by_prefix[tmpl_prefix]:
        return by_prefix[tmpl_prefix][0]
        
    # 3. Canonical family fallback (e.g. cat9kv -> cat9kvuadp)
    for fam_key, candidates in CANONICAL_FAMILY_MAP.items():
        if prefix.startswith(fam_key) or tmpl_prefix.startswith(fam_key):
            for cand in candidates:
                if cand in by_prefix and by_prefix[cand]:
                    return by_prefix[cand][0]
                    
    # 4. Partial prefix match (e.g. linux-alpine-base-3-20-3 -> linux-alpine-base-3.23.3)
    if prefix in by_prefix:
        # Check sub-prefix
        parts = missing_img.split("-")
        if len(parts) >= 3:
            sub = "-".join(parts[:3]).lower()
            for cand in by_prefix[prefix]:
                if cand.lower().startswith(sub):
                    return cand
            # try 2 parts
            sub2 = "-".join(parts[:2]).lower()
            for cand in by_prefix[prefix]:
                if cand.lower().startswith(sub2):
                    return cand

    return None

def main():
    mode = "--check"
    if len(sys.argv) > 1 and sys.argv[1] in ("--fix", "-f"):
        mode = "--fix"
    elif len(sys.argv) > 1 and sys.argv[1] in ("-h", "--help"):
        print("Usage: pnet-reconcile-images.py [--check | --fix]")
        sys.exit(0)

    installed_qemu, by_prefix = get_installed_qemu()
    
    # Scan all labs
    missing_qemu = defaultdict(lambda: {"count": 0, "templates": set(), "sample_labs": []})
    total_labs = 0

    if os.path.isdir(LABS_DIR):
        for root, _, files in os.walk(LABS_DIR):
            for f in files:
                if f.endswith(".unl"):
                    total_labs += 1
                    lab_path = os.path.join(root, f)
                    try:
                        tree = ET.parse(lab_path)
                        for node in tree.findall(".//node"):
                            ntype = node.get("type")
                            img = (node.get("image") or "").strip()
                            tmpl = (node.get("template") or "").strip()
                            if ntype == "qemu" and img:
                                if img not in installed_qemu:
                                    missing_qemu[img]["count"] += 1
                                    missing_qemu[img]["templates"].add(tmpl)
                                    if len(missing_qemu[img]["sample_labs"]) < 3:
                                        missing_qemu[img]["sample_labs"].append(lab_path)
                    except Exception:
                        pass

    print("============================================================")
    print("      PNetLab Lab Image Compatibility & Alias Reconciler    ")
    print("============================================================")
    print(f"Total labs scanned: {total_labs}")
    print(f"Unique missing QEMU images requested: {len(missing_qemu)}")

    reconcilable = []
    unresolvable = []

    for img, data in sorted(missing_qemu.items(), key=lambda x: -x[1]["count"]):
        tmpl = next(iter(data["templates"])) if data["templates"] else ""
        target = find_best_target(img, tmpl, by_prefix)
        if target:
            reconcilable.append((img, target, data["count"], tmpl))
        else:
            unresolvable.append((img, data["count"], tmpl))

    print(f"\n[✔] Reconcilable via Aliasing: {len(reconcilable)} image(s)")
    for img, target, cnt, tmpl in reconcilable:
        status_str = f"'{img}' ({cnt} nodes, tmpl: {tmpl}) -> '{target}'"
        if mode == "--fix":
            alias_path = os.path.join(QEMU_DIR, img)
            if not os.path.exists(alias_path):
                try:
                    os.symlink(target, alias_path)
                    print(f"  [FIXED] Created alias: {status_str}")
                except Exception as e:
                    print(f"  [ERROR] Failed creating symlink {status_str}: {e}")
            else:
                print(f"  [EXISTS] Alias active: {status_str}")
        else:
            print(f"  [CAN FIX] {status_str}")

    if unresolvable:
        print(f"\n[⚠] Unresolvable (No compatible base appliance installed on disk): {len(unresolvable)} image(s)")
        for img, cnt, tmpl in unresolvable:
            print(f"  [MISSING APPLIANCE] '{img}' ({cnt} nodes, tmpl: {tmpl})")
        print("\nNote: Unresolvable appliances require uploading the base disk image to /opt/unetlab/addons/qemu/.")

    print("============================================================")

if __name__ == "__main__":
    main()
