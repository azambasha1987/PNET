#!/usr/bin/env python3
"""
===============================================================================
PNetLab / AzamLabs Natural Ascending Sort & Export Sequence Enforcer
===============================================================================
Ensures that folders and labs in workspace listings and the Export dialog are
always sorted in natural ascending sequence (0..9, A..Z), preventing upstream
stock reverse/descending order ($b before $a).

Enforced at:
  1. Backend API: /opt/unetlab/html/includes/api_folders.php (PHP usort)
  2. Frontend Modern UI: /opt/unetlab/html/themes/default/islands/js/labs-workspace*.js
  3. Frontend Legacy UI: /opt/unetlab/html/main/js/labs.js (exportDialog)
===============================================================================
"""

import os
import re
import sys
import glob

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
        return True, f"Successfully patched {file_path} for natural ascending sort ($a before $b)."
    return True, f"{file_path} already enforcing natural ascending sort."

def patch_islands_js(island_dir):
    if not os.path.isdir(island_dir):
        return False, f"Directory not found: {island_dir}"

    islands = glob.glob(os.path.join(island_dir, "labs-workspace*.js"))
    if not islands:
        return False, f"No labs-workspace*.js found in {island_dir}"

    target = 'var r=a.body&&a.body.data||{folders:[],labs:[]},e=(r.folders||[]).filter(function(q){return q.name!==".."}),n=r.labs||[];'
    replacement = 'var r=a.body&&a.body.data||{folders:[],labs:[]},e=(r.folders||[]).filter(function(q){return q.name!==".."}).sort(function(a,b){return(a.name||"").localeCompare(b.name||"",undefined,{numeric:!0,sensitivity:"base"})}),n=(r.labs||[]).slice().sort(function(a,b){return(a.file||a.name||"").localeCompare(b.file||b.name||"",undefined,{numeric:!0,sensitivity:"base"})});'

    patched_any = False
    for path in islands:
        if os.path.islink(path):
            continue
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            if target in content:
                content = content.replace(target, replacement)
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                patched_any = True
        except Exception as e:
            print(f"[!] Error patching {path}: {e}")

    if patched_any:
        return True, f"Successfully patched modern Svelte island ({island_dir}) for client-side natural ascending sort."
    return True, f"Modern Svelte island ({island_dir}) already enforcing natural ascending sort."

def patch_labs_js(file_path):
    if not os.path.isfile(file_path):
        return False, f"File not found: {file_path}"

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    modified = False

    target_folders = "var folders = (data.folders || []).filter(function (f) { return f.name !== '..'; });"
    replacement_folders = "var folders = (data.folders || []).filter(function (f) { return f.name !== '..'; }).sort(function (a, b) { return cmpName(a.name, b.name); });"

    if target_folders in content:
        content = content.replace(target_folders, replacement_folders)
        modified = True

    target_labs = "var labs = data.labs || [];"
    replacement_labs = "var labs = (data.labs || []).slice().sort(function (a, b) { return cmpName(a.file || a.name, b.file || b.name); });"

    if target_labs in content and "exportDialog" in content:
        idx_dialog = content.find("function exportDialog()")
        if idx_dialog != -1:
            idx_labs = content.find(target_labs, idx_dialog)
            if idx_labs != -1 and idx_labs - idx_dialog < 1000:
                content = content[:idx_labs] + replacement_labs + content[idx_labs + len(target_labs):]
                modified = True

    if modified:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True, f"Successfully patched legacy {file_path} exportDialog."
    return True, f"Legacy {file_path} already enforcing natural sort."

def main():
    print("=" * 72)
    print("PNetLab / AzamLabs Export Chronology & Natural Ascending Sorter")
    print("=" * 72)

    candidate_folders = [
        "/opt/unetlab/html/includes/api_folders.php",
        "/opt/azambasha/html/includes/api_folders.php",
        "html/includes/api_folders.php"
    ]
    candidate_island_dirs = [
        "/opt/unetlab/html/themes/default/islands/js",
        "/opt/azambasha/html/themes/default/islands/js",
        "html/themes/default/islands/js"
    ]
    candidate_labs_js = [
        "/opt/unetlab/html/main/js/labs.js",
        "/opt/azambasha/html/main/js/labs.js",
        "html/main/js/labs.js"
    ]

    ok = True

    # 1. Patch Backend PHP API
    for p in candidate_folders:
        if os.path.exists(p):
            success, msg = patch_api_folders(p)
            print(f"[*] {msg}")
            ok = ok and success

    # 2. Patch Modern Svelte Islands
    for d in candidate_island_dirs:
        if os.path.exists(d):
            success, msg = patch_islands_js(d)
            print(f"[*] {msg}")
            ok = ok and success

    # 3. Patch Legacy labs.js (fallback)
    for p in candidate_labs_js:
        if os.path.exists(p):
            success, msg = patch_labs_js(p)
            print(f"[*] {msg}")
            ok = ok and success

    # Fix permissions
    for p in candidate_folders + candidate_labs_js:
        if os.path.exists(p):
            try:
                import pwd, grp
                uid = pwd.getpwnam("www-data").pw_uid
                gid = grp.getgrnam("www-data").gr_gid
                os.chown(p, uid, gid)
                os.chmod(p, 0o644)
            except Exception:
                pass

    if ok:
        print("[✔] Export chronology natural ascending sort enforced successfully.")
        return 0
    else:
        print("[!] Warnings encountered during enforcement.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
