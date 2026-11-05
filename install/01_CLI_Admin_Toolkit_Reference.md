# PNetLab Appliance Master Administration & CLI Guide

**Complete Operational Reference & System Management Manual | PNetLab v8 (`6.8.93resolute1`)**  
*Platform: Ubuntu 26.04 LTS ("Resolute") & Ubuntu 24.04 LTS ("Noble") • Master & Satellite Cluster Nodes*

---

## 1. System Administration Architecture

PNetLab delivers a unified suite of enterprise administration utilities pre-installed into `/opt/unetlab/scripts/` and symlinked directly into `/usr/local/bin/` as first-class CLI commands. These tools provide one-line maintenance, non-destructive health checks, cluster management, performance tuning, and automated rollbacks across both **Master** and **Satellite** nodes.

---

## 2. Canonical CLI Commands Reference (`/usr/local/bin/pnet-*`)

The following canonical CLI tools (`pnet-*`) are available immediately on the command line of any PNetLab server:

| Command | Function & Scope | Common Syntax |
| :--- | :--- | :--- |
| `pnet-update` | **Universal In-Band Updater**: Fetches updates from GitHub, takes safety snapshot, and runs node pipeline. | `sudo pnet-update [--master \| --satellite \| --rollback \| --check]` |
| `pnet-mod` | **Modular Subsystem Manager**: Inspects and deploys the three custom pillars independently. | `sudo pnet-mod [status \| apply <pillar> \| list]` |
| `pnet-audit` | **Quarterly Security & System Audit**: Verifies file integrity, permissions, database, and snapshots. | `sudo pnet-audit [--snapshot \| --rollback <path>]` |
| `pnet-health` | **Comprehensive Health Diagnostics**: Real-time audit of KVM virtualization, CPU governor, RAM, KSM, storage, and services. | `sudo pnet-health` |
| `pnet-doctor` / `pnet-images` | **QCOW2 Image Optimizer**: Audits, repairs, and sparsifies/compresses guest disk images (40–70% disk savings). | `sudo pnet-doctor [--check \| --fix]` |
| `pnet-optimizer` | **Heavy-Node & Speed Optimizer**: Engages Ultra-KSM (4KB deduplication), madvise THP, and dynamic lossless CPU governor. | `sudo pnet-optimizer [--master \| --satellite \| --cluster \| --check]` |
| `pnet-bootstorm` | **Anti-Bootstorm Orchestrator**: Enforces 3-tier staggered startup for high-density virtual node clusters. | `sudo pnet-bootstorm [--status \| --run]` |
| `pnet-cluster` | **Cluster Broker Diagnostic**: Tests MySQL connectivity, PSK authentication, and satellite communication. | `sudo pnet-cluster` |
| `pnet-satellite-join` | **Satellite Enrollment Utility**: Joins worker node to Master using cluster IP and 64-hex PSK. | `sudo pnet-satellite-join --master <IP> --psk <KEY>` |
| `pnet-nodes` | **Node Recovery Engine**: Cleans stale lockfiles, resets `/dev/kvm`, and fixes SMM UEFI & Cisco IOSv boot timeouts. | `sudo pnet-nodes` |
| `pnet-credentials` | **Credential Re-alignment**: Restores canonical web credentials (`admin:pnet`) and SSH root identity. | `sudo pnet-credentials` |
| `pnet-backup` / `pnet-restore` | **Automated Backup & Restore**: Full snapshot archive of labs, users, MySQL database, and configs. | `sudo pnet-backup [backup \| restore <path>]` |
| `pnet-clean` | **Housekeeping & Space Reclaim**: Vacuums journald logs, truncates debug outputs, purges stale temp files. | `sudo pnet-clean` |
| `pnet-apt-guard` | **Safe APT Guard Utility**: Intercepts `apt upgrade` and `autoremove` to protect 32-bit IOL and kernel modules. | `sudo pnet-apt-guard [--status \| --enable \| --disable]` |
| `pnet-dark` | **Pure Black Dark Theme Engine**: Toggles or restores the PNetLab high-contrast dark theme. | `sudo pnet-dark [--enable \| --disable]` |
| `pnet-menu` / `pnet-fix` | **Interactive Repair Suite**: TUI menu providing single-click access to all diagnostic and repair scripts. | `sudo pnet-menu` |
| `pnet-ingest-release` / `pnet-release-engine` | **Release Ingestion Engine**: Stages upstream packages, injects Tri-Pillars, repacks debs, updates manifest and channel pointer. | `sudo pnet-ingest-release [pipeline \| stage \| apply \| manifest \| publish \| push]` |

---

## 3. Common Administrative Tasks & Procedures

### 3.1 Running a Full System Health Diagnostic
```bash
sudo pnet-health
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
sudo pnet-update --master
```

To update a Satellite Worker node:
```bash
sudo pnet-update --satellite
```

To auto-detect the node role and update accordingly:
```bash
sudo pnet-update
```

### 3.3 Creating and Restoring Backups
**To create an immediate full backup:**
```bash
sudo pnet-backup backup
```
*Creates a timestamped `.tar.gz` archive in `/opt/unetlab/data/Backups/` containing MySQL database dumps, user accounts, custom device templates, and all lab topology XMLs.*

**To restore from a backup archive:**
```bash
sudo pnet-backup restore /opt/unetlab/data/Backups/azambasha_backup_YYYYMMDD_HHMMSS.tar.gz
```

### 3.4 Resolving Node Startup Issues & Permission Anomalies
When virtual nodes fail to start, freeze during boot, or display permission errors:
```bash
sudo pnet-nodes
```
*This command resets ownership to `www-data:www-data`, unlocks stale PID locks in `/opt/unetlab/tmp/`, verifies KVM device node permissions (`chmod 666 /dev/kvm`), generates Cisco IOL `iourc` licenses, and tunes UEFI SMM flags.*

### 3.5 Reclaiming Disk Space (Housekeeping)
To safely purge accumulated system logs, temporary files, and vacuum systemd journals:
```bash
sudo pnet-clean
```

---

## 4. Script-Level Utilities Directory (`/opt/unetlab/scripts/`)

All underlying scripts supporting the CLI are located in `/opt/unetlab/scripts/` (and structured repository folders):

| Script Path | Purpose |
| :--- | :--- |
| `scripts/pnet-apply-all-fixes.sh` | Core runner behind `pnet-menu` and `pnet-fix` |
| `scripts/pnet-update.sh` | Core runner behind `pnet-update` |
| `scripts/pnet-health-check.sh` | Core runner behind `pnet-health` |
| `scripts/pnet-backup-restore.sh` / `scripts/pnet-lab-backup.sh` | Core runner behind `pnet-backup` and `pnet-restore` |
| `scripts/pnet-quarterly-audit.sh` | Core runner behind `pnet-audit` |
| `scripts/pnet-housekeeping.sh` / `.py` | Core runner behind `pnet-clean` |
| `scripts/pnet-apt-guard.sh` | Core runner behind `pnet-apt-guard` |
| `scripts/pnet-fix-cluster.sh` | Core runner behind `pnet-cluster` |
| `scripts/pnet-satellite-join.sh` | Core runner behind `pnet-satellite-join` |
| `scripts/pnet-fix-permissions.sh` | Core runner for permission hardening and node lock cleanup |
| `scripts/pnet-os-prerequisites.sh` | Complete OS prerequisites and kernel module provisioner |
| `scripts/pnet-modernize-ubuntu26.sh` | Ubuntu 26+ modernization orchestrator |
| `scripts/pnet-mod.sh` | Modular pillar and subsystem CLI manager |
| `Custom-Performance/scripts/azambasha-heavy-node-optimizer.sh` | Multi-core router and hypervisor optimizer |
| `Custom-Performance/scripts/azambasha-image-doctor.sh` | Guest disk image optimizer and repair tool |
| `Custom-Performance/scripts/azambasha-bootstorm.py` | Staggered node boot anti-bootstorm engine |
| `Custom-Customization/scripts/azambasha-fix-web-credentials.sh` | Canonical credential restoration |
| `Custom-Customization/scripts/azambasha-disable-logout.sh` | Permanent session keepalive engine |

