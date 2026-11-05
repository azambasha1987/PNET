# PNetLab Lab Export & APT Management Guide

**Operational Reference for Topology Exporting, Subfolder Archiving, and Safe APT Protection | PNetLab v8 (`6.8.93resolute1`)**  
*Platform: Ubuntu 26.04 LTS ("Resolute") & Ubuntu 24.04 LTS ("Noble")*

---

## 1. Overview & Architectural Capabilities

This guide covers two essential management subsystems in PNetLab:
1. **Lab Export & Recursive Subfolder Support**: Enabling seamless packaging and download of complete lab topologies, nested folder structures, and multi-file archives without UUID collisions.
2. **PNetLab Safe APT Guard**: Protecting the virtualization host from destructive upstream package upgrades that could break 32-bit Cisco IOL libraries, PHP runtime modules, or custom DKMS bridges.

---

## 2. Lab Export & Recursive Subfolder Archiving

In standard legacy virtualization platforms, exporting labs with deep folder hierarchies or multiple nested topologies often fails due to:
- Missing host archiving utilities (`zip`, `unzip`).
- Incompatible directory permissions or broken symlinks on `/opt/unetlab/html/Exports`.
- Legacy UUID-stripping scripts failing to recurse through nested `.unl` topology files inside zip archives.

### Native Solution in PNetLab v8
PNetLab v8 (`6.8.93resolute1`) embeds full recursive subfolder export natively:

1. **Exports Directory Pipeline**:  
   `/opt/unetlab/data/Exports` is established with `www-data:www-data` ownership and linked to Apache DocumentRoot:
   ```bash
   mkdir -p /opt/unetlab/data/Exports
   ln -sfn /opt/unetlab/data/Exports /opt/unetlab/html/Exports
   chown -R www-data:www-data /opt/unetlab/data/Exports /opt/unetlab/html/Exports
   chmod -R 775 /opt/unetlab/data/Exports
   ```

2. **Recursive UUID Stripping (`/opt/unetlab/scripts/remove_uuid.sh`)**:  
   When exporting labs, UUIDs must be stripped so other users can import the lab without ID collision. The PNetLab recursive engine unpacks the zip into a temporary directory, strips UUIDs across all nested directories (`find "$TEMP" -name "*.unl" -exec sed -i ...`), repacks the zip archive atomically, and cleans up temporary files.

3. **Natural Ascending Sequence (0..9, A..Z) Invariant**:  
   Upstream stock systems sort folders and labs in reverse/descending order (`strnatcasecmp($b['name'], $a['name'])`), which causes the Export dialog to list items backwards (e.g. `9 - CCIE` down to `0 - Interview`).  
   PNetLab enforces natural ascending sort across both layers:
   - **Backend**: `/opt/unetlab/html/includes/api_folders.php` enforces `$a` before `$b`.
   - **Frontend**: `/opt/unetlab/html/main/js/labs.js` (`exportDialog`) enforces client-side alphanumeric sorting via `cmpName(a.name, b.name)`.
   - **Update Immunity**: Automatically enforced on every install (`install.sh`), update (`pnet-update`), and upstream ingestion (`azamlabs_upstream_sync.py`) via [`Custom-Features/scripts/pnet-fix-export-sort.py`](../scripts/pnet-fix-export-sort.py).

4. **Manual Repair / Validation Script**:  
   If you ever need to verify or restore export permissions, natural sorting, and tools manually:
   ```bash
   sudo bash Custom-Features/scripts/pnet-fix-export-and-apt.sh
   # Or run the dedicated sorter:
   sudo python3 Custom-Features/scripts/pnet-fix-export-sort.py
   ```

---

## 3. PNetLab Safe APT Guard Subsystem

PNetLab runs a finely-tuned virtualization environment composed of custom low-latency bridges (`azamlabs-bridge-dkms`), 32-bit Cisco IOL emulation libraries (`libc6-i386`, `lib32gcc-s1`), and custom PHP-FPM fast-path workers.

### The Problem with Uncontrolled OS Upgrades
Running an unvetted `apt upgrade`, `apt dist-upgrade`, or `apt autoremove` on an active hypervisor can:
- Replace running kernel headers without recompiling DKMS modules, breaking virtual bridge interfaces.
- Purge 32-bit runtime libraries deemed "orphaned" by APT, causing Cisco IOL nodes to fail with `cannot execute binary file: Exec format error`.
- Upgrade PHP versions abruptly, breaking web console endpoints and database drivers.

### How Safe APT Guard Protects the System
PNetLab deploys [`scripts/pnet-apt-guard.sh`](../../scripts/pnet-apt-guard.sh) (`/etc/apt/apt.conf.d/99azamlabs-apt-guard` and `dpkg-divert` wrapper):

```
┌────────────────────────────────────────────────────────────────────────┐
│ PNetLab Safe APT Guard Interception Architecture                       │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 'apt update'             │ ALLOWED: Updates repository package lists   │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 'apt install <package>'  │ ALLOWED: Allows installing new tools        │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 'apt search' / 'show'    │ ALLOWED: Standard package queries           │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 'apt upgrade'            │ BLOCKED: Intercepts & displays warning      │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 'apt dist-upgrade'       │ BLOCKED: Protects kernel & PHP stack        │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 'apt autoremove'         │ BLOCKED: Prevents purging 32-bit IOL libs   │
└──────────────────────────┴─────────────────────────────────────────────┘
```

When an upgrade command is attempted, the guard displays:
```
============================================================
 [✘] Do Not Try to UPGRADE, this will BREAK PNetLab
============================================================
PNetLab relies on pinned hypervisor, kernel, PHP, and 32-bit
IOL dependencies. Upgrades must be applied via 'pnet-update'.
```

### Managing APT Guard via CLI (`pnet-apt-guard`)

| Task | Command |
| :--- | :--- |
| **Check Guard Status** | `sudo pnet-apt-guard --status` |
| **Re-engage / Enable Guard** | `sudo pnet-apt-guard --enable` |
| **Temporarily Disable Guard** | `sudo pnet-apt-guard --disable` |
| **Emergency One-Time Override** | `sudo apt upgrade --force-pnet-override` |

---

## 4. Verification Procedures

1. **Verify Lab Export in Web UI**:
   - Log into the PNetLab web interface.
   - Navigate to any lab containing nested folders or multiple sub-topologies.
   - Click **Export** &rarr; Verify the `.zip` archive downloads cleanly.
   - Extract the `.zip` archive on your host machine to confirm all `.unl` topology files and directory structures are intact.

2. **Verify APT Guard Interception**:
   ```bash
   sudo apt upgrade
   ```
   *Expected result: Intercepted with protective banner with exit code 1.*

3. **Verify Safe Operations Remain Active**:
   ```bash
   sudo apt update
   ```
   *Expected result: Package lists refresh normally with zero errors.*

