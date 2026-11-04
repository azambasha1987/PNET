# PNetLab Appliance Master Administration & CLI Guide

**Complete Operational Reference & System Management Manual | PNetLab v8 (`6.8.93resolute1`)**  
*Platform: Ubuntu 26.04 LTS ("Resolute") & Ubuntu 24.04 LTS ("Noble") • Master & Satellite Cluster Nodes*

---

## 1. System Administration Architecture

PNetLab delivers a unified suite of enterprise administration utilities pre-installed into `/opt/unetlab/scripts/` and symlinked directly into `/usr/local/bin/` as first-class CLI commands. These tools provide one-line maintenance, non-destructive health checks, cluster management, performance tuning, and automated rollbacks across both **Master** and **Satellite** nodes.

---

## 2. Canonical CLI Commands Reference (`/usr/local/bin/pnet-*` and `/usr/local/bin/azam-*`)

The following canonical CLI tools (`pnet-*`) and backwards-compatible aliases (`azam-*`) are available immediately on the command line of any PNetLab server:

| Command | Function & Scope | Common Syntax |
| :--- | :--- | :--- |
| `pnet-update` / `azam-update` | **Universal In-Band Updater**: Fetches updates from GitHub, takes safety snapshot, and runs node pipeline. | `sudo azam-update [--master \| --satellite \| --rollback \| --check]` |
| `pnet-audit` / `azam-audit` | **Quarterly Security & System Audit**: Verifies file integrity, permissions, database, and snapshots. | `sudo azam-audit [--snapshot \| --rollback <path>]` |
| `pnet-health` / `azam-health` / `pnet-doctor` / `azam-doctor` | **Comprehensive Health Diagnostics**: Real-time audit of KVM virtualization, CPU governor, RAM, KSM, storage, and services. | `sudo azam-health` |
| `pnet-images` / `azam-images` | **QCOW2 Image Optimizer**: Audits, repairs, and sparsifies/compresses guest disk images (40–70% disk savings). | `sudo azam-images [--audit \| --compress]` |
| `pnet-optimizer` / `azam-optimizer` | **Heavy-Node & Speed Optimizer**: Engages Ultra-KSM (4KB deduplication), madvise THP, and dynamic lossless CPU governor. | `sudo azam-optimizer [--master \| --satellite \| --cluster \| --check]` |
| `pnet-bootstorm` / `azam-bootstorm` | **Anti-Bootstorm Orchestrator**: Enforces 3-tier staggered startup for high-density virtual node clusters. | `sudo azam-bootstorm [--status \| --run]` |
| `pnet-cluster` / `azam-cluster` | **Cluster Broker Diagnostic**: Tests MySQL connectivity, PSK authentication, and satellite communication. | `sudo azam-cluster` |
| `pnet-satellite-join` / `azam-satellite-join`| **Satellite Enrollment Utility**: Joins worker node to Master using cluster IP and 64-hex PSK. | `sudo azam-satellite-join --master <IP> --psk <KEY>` |
| `pnet-nodes` / `azam-nodes` | **Node Recovery Engine**: Cleans stale lockfiles, resets `/dev/kvm`, and fixes SMM UEFI & Cisco IOSv boot timeouts. | `sudo azam-nodes` |
| `pnet-credentials` / `azam-credentials` | **Credential Re-alignment**: Restores canonical web credentials (`admin:pnet`) and SSH root identity. | `sudo azam-credentials` |
| `pnet-backup` / `azam-backup` | **Automated Backup & Restore**: Full snapshot archive of labs, users, MySQL database, and configs. | `sudo azam-backup [backup \| restore <path>]` |
| `pnet-clean` / `azam-clean` | **Housekeeping & Space Reclaim**: Vacuums journald logs, truncates debug outputs, purges stale temp files. | `sudo azam-clean` |
| `pnet-apt-guard` / `azam-apt-guard` | **Safe APT Guard Utility**: Intercepts `apt upgrade` and `autoremove` to protect 32-bit IOL and kernel modules. | `sudo azam-apt-guard [--status \| --enable \| --disable]` |
| `pnet-dark` / `azam-dark` | **Pure Black Dark Theme Engine**: Toggles or restores the PNetLab high-contrast dark theme. | `sudo azam-dark [--enable \| --disable]` |
| `pnet-menu` / `azam-menu` / `pnet-fix` / `azam-fix` | **Interactive Repair Suite**: TUI menu providing single-click access to all diagnostic and repair scripts. | `sudo azam-menu` |

---

## 3. Common Administrative Tasks & Procedures

### 3.1 Running a Full System Health Diagnostic
```bash
sudo azam-health
```
*Outputs an immediate visual audit of:*
- KVM virtualization acceleration (`/dev/kvm` accessible, VT-x/AMD-V active)
- Ultra-KSM memory deduplication efficiency (Total RAM saved across nodes)
- Storage utilization on `/opt/unetlab` and root partition
- Status of daemons: Apache2, MySQL, PHP-FPM, Guacamole, pnetlab-satd, pnetlab-mcp
- Inventory of installed QEMU, IOL, Dynamips, and Docker images

### 3.2 Executing Automated Cluster Updates
To update a Master Controller node:
```bash
sudo azam-update --master
```

To update a Satellite Worker node:
```bash
sudo azam-update --satellite
```

To auto-detect the node role and update accordingly:
```bash
sudo azam-update
```

### 3.3 Creating and Restoring Backups
**To create an immediate full backup:**
```bash
sudo azam-backup backup
```
*Creates a timestamped `.tar.gz` archive in `/opt/unetlab/data/Backups/` containing MySQL database dumps, user accounts, custom device templates, and all lab topology XMLs.*

**To restore from a backup archive:**
```bash
sudo azam-backup restore /opt/unetlab/data/Backups/azambasha_backup_YYYYMMDD_HHMMSS.tar.gz
```

### 3.4 Resolving Node Startup Issues & Permission Anomalies
When virtual nodes fail to start, freeze during boot, or display permission errors:
```bash
sudo azam-nodes
```
*This command resets ownership to `www-data:www-data`, unlocks stale PID locks in `/opt/unetlab/tmp/`, verifies KVM device node permissions (`chmod 666 /dev/kvm`), generates Cisco IOL `iourc` licenses, and tunes UEFI SMM flags.*

### 3.5 Reclaiming Disk Space (Housekeeping)
To safely purge accumulated system logs, temporary files, and vacuum systemd journals:
```bash
sudo azam-clean
```

---

## 4. Script-Level Utilities Directory (`/opt/unetlab/scripts/`)

All underlying scripts supporting the CLI are located in `/opt/unetlab/scripts/` (and mirror repository `scripts/`):

| Script Path | Purpose |
| :--- | :--- |
| `scripts/azambasha-apply-all-fixes.sh` | Core runner behind `pnet-menu` / `azam-menu` and `pnet-fix` / `azam-fix` |
| `scripts/azambasha-update.sh` | Core runner behind `pnet-update` / `azam-update` |
| `scripts/azambasha-health-check.sh` | Core runner behind `pnet-health` / `azam-health` and `pnet-doctor` / `azam-doctor` |
| `scripts/azambasha-image-doctor.sh` | Core runner behind `pnet-images` / `azam-images` |
| `scripts/azambasha-heavy-node-optimizer.sh` | Core runner behind `pnet-optimizer` / `azam-optimizer` |
| `scripts/azambasha-bootstorm.py` | Core runner behind `pnet-bootstorm` / `azam-bootstorm` |
| `scripts/azambasha-backup-restore.sh` | Core runner behind `pnet-backup` / `azam-backup` |
| `scripts/azambasha-quarterly-audit.sh` | Core runner behind `pnet-audit` / `azam-audit` |
| `scripts/azambasha-housekeeping.sh` | Core runner behind `pnet-clean` / `azam-clean` |
| `scripts/azambasha-apt-guard.sh` | Core runner behind `pnet-apt-guard` / `azam-apt-guard` |
| `scripts/azambasha-fix-cluster.sh` | Core runner behind `pnet-cluster` / `azam-cluster` |
| `scripts/azambasha-satellite-join.sh` | Core runner behind `pnet-satellite-join` / `azam-satellite-join` |
| `scripts/azambasha-fix-web-credentials.sh` | Core runner behind `pnet-credentials` / `azam-credentials` |
| `scripts/azambasha-fix-node-startup.sh` | Core runner behind `pnet-nodes` / `azam-nodes` |
| `scripts/azambasha-speed-optimizer.sh` | Core runner for OPcache, Gzip, and sysctl tuning |
| `scripts/azambasha-disable-logout.sh` | Permanent 10-year sliding session enforcer |

