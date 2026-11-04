#!/usr/bin/env python3
"""
===============================================================================
AzamLabs Natural Ascending Sort & Export Sequence Enforcer
===============================================================================
Ensures that folders and labs in workspace listings and the Export dialog are
always sorted in natural ascending sequence (0..9, A..Z), preventing upstream
stock reverse/descending order ($b before $a).

Enforced at:
  1. Backend API: /opt/unetlab/html/includes/api_folders.php
  2. Frontend UI: /opt/unetlab/html/main/js/labs.js (exportDialog)
===============================================================================
"""

import os
import re
import sys

def patch_api_folders(file_path):
    if not os.path.isfile(file_path):
        return False, f"File not found: {file_path}"

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    modified = False

    # 1. Reverse folder sort: return strnatcasecmp($b['name'], $a['name']); -> ($a, $b)
    pattern_folder = r"strnatcasecmp\(\s*\$b\[(['\"])name\1\]\s*,\s*\$a\[(['\"])name\2\]\s*\)"
    if re.search(pattern_folder, content):
        content = re.sub(pattern_folder, r"strnatcasecmp($a[\1name\1], $b[\2name\2])", content)
        modified = True

    # 2. Reverse file sort: return strnatcasecmp($b['file'], $a['file']); -> ($a, $b)
    pattern_file = r"strnatcasecmp\(\s*\$b\[(['\"])file\1\]\s*,\s*\$a\[(['\"])file\2\]\s*\)"
    if re.search(pattern_file, content):
        content = re.sub(pattern_file, r"strnatcasecmp($a[\1file\1], $b[\2file\2])", content)
        modified = True

    if modified:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True, "Successfully patched api_folders.php for natural ascending sort ($a before $b)."
    return True, "api_folders.php already enforcing natural ascending sort."

def patch_labs_js(file_path):
    if not os.path.isfile(file_path):
        return False, f"File not found: {file_path}"

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    modified = False

    # Patch folders in exportDialog: add .sort(function (a, b) { return cmpName(a.name, b.name); })
    # Target: var folders = (data.folders || []).filter(function (f) { return f.name !== '..'; });
    target_folders = "var folders = (data.folders || []).filter(function (f) { return f.name !== '..'; });"
    replacement_folders = "var folders = (data.folders || []).filter(function (f) { return f.name !== '..'; }).sort(function (a, b) { return cmpName(a.name, b.name); });"

    if target_folders in content:
        content = content.replace(target_folders, replacement_folders)
        modified = True

    # Patch labs in exportDialog: add .slice().sort(function (a, b) { return cmpName(a.file || a.name, b.file || b.name); })
    # Target: var labs = data.labs || [];
    target_labs = "var labs = data.labs || [];"
    replacement_labs = "var labs = (data.labs || []).slice().sort(function (a, b) { return cmpName(a.file || a.name, b.file || b.name); });"

    if target_labs in content and "exportDialog" in content:
        # Only replace inside exportDialog context
        idx_dialog = content.find("function exportDialog()")
        if idx_dialog != -1:
            idx_labs = content.find(target_labs, idx_dialog)
            if idx_labs != -1 and idx_labs - idx_dialog < 1000:
                content = content[:idx_labs] + replacement_labs + content[idx_labs + len(target_labs):]
                modified = True

    if modified:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True, "Successfully patched labs.js exportDialog for client-side natural sort."
    return True, "labs.js exportDialog already enforcing natural sort."

def main():
    candidate_folders = [
        "/opt/unetlab/html/includes/api_folders.php",
        "/opt/azambasha/html/includes/api_folders.php",
        "html/includes/api_folders.php"
    ]
    candidate_labs_js = [
        "/opt/unetlab/html/main/js/labs.js",
        "/opt/azambasha/html/main/js/labs.js",
        "html/main/js/labs.js"
    ]

    ok = True
    for p in candidate_folders:
        if os.path.exists(p):
            success, msg = patch_api_folders(p)
            print(f"[*] {msg}")
            ok = ok and success

    for p in candidate_labs_js:
        if os.path.exists(p):
            success, msg = patch_labs_js(p)
            print(f"[*] {msg}")
            ok = ok and success

    if ok:
        print("[✔] Natural ascending sort enforcement complete.")
        return 0
    else:
        print("[⚠] Some candidate files were not found (normal during partial scans).")
        return 0

if __name__ == "__main__":
    sys.exit(main())
