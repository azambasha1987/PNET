# PNetLab One-Step Update & Operations Guide: Master & Satellite Nodes

*Reference Guide • Platform: Ubuntu 26.04 LTS ("Resolute") & Ubuntu 24.04 LTS ("Noble") • Version: PNetLab v8 (`6.8.93resolute1`)*

---

## ⚡ Quick-Reference: Canonical One-Line Update Commands

| Target Node | Local One-Line Command (on Linux VM) | Remote One-Line Command (from Windows Host) |
|---|---|---|
| **Master Node (Controller)** | `sudo pnet-update --master` | `python scripts/pnet-deploy-vm.py -H <MASTER_IP> -p azam --apply-all` |
| **Satellite Node (Worker)** | `sudo pnet-update --satellite` | `python scripts/pnet-deploy-vm.py -H <SATELLITE_IP> -p azam --satellite-fixes` |
| **Universal (Auto-Detect Role)** | `sudo pnet-update` | `python scripts/pnet-deploy-vm.py -H <NODE_IP> -p azam --auto` |
| **Fleet-Wide Simultaneous** | *Execute on each node* | `python scripts/pnet-deploy-vm.py -H <MASTER_IP> <SATELLITE_IP> -p azam --fleet` |

---

## 🖥️ 1. Master Controller Node One-Line Commands

The Master Controller node runs the PNetLab Web-GUI, Apache FastCGI, MySQL database, Guacamole console proxy, and cluster orchestration.

> [!TIP]
> **Automated In-Band GitHub Download**: When you run `sudo pnet-update --master`, it automatically connects to GitHub (`azambasha1987/PNET`), pulls all updated files directly to `/opt/pnet`, creates an atomic safety snapshot, and executes the complete master node pipeline in a single step.

### A. Direct Execution on Master Node (SSH / Console)
```bash
sudo pnet-update --master
```

### What Happens in the Master Node Update Pipeline:
1. **GitHub In-Band Fetch**: Connects to GitHub (`azambasha1987/PNET`) and pulls/downloads latest repository code into `/opt/pnet`.
2. **Safety Snapshot**: Captures a timestamped `.tar.gz` checkpoint of `/opt/unetlab/{html/includes,templates,data/branding}`.
3. **Permanent Session Fix**: Configures 10-year sliding session cookies (`Never-Logout`).
4. **Lab Export & APT Fix**: Installs `zip`/`unzip`, handles nested folder structures and recursive UUID stripping.
5. **Upload & Docker Subsystem**: 512MB PHP/Apache limits, Docker CE repository, official `pnet-capture-web:1.0` HTML5 packet capture container, and image watcher daemon.
6. **SSL IP-SAN & Console Fix**: Self-signed 5-year IP-SAN cert, Guacamole `:8081` proxy, and 32-byte crypto key.
7. **Database Deep-Fix**: Cleans SQL modes, raises 1M query limits, configures logrotate.
8. **File Permissions & Sockets**: Resets `/dev/kvm` and lab node permissions.
9. **Speed Optimizer Suite**: Activates Ultra-KSM 4KB RAM deduplication (65–80% savings) and OPcache.
10. **Silicon Dataplane Fast-Path**: Sets MTU 9000 jumbo frames and kernel bypass.
11. **Cgroups v2 & System Limits**: Configures systemd slice resource isolation.
12. **Version Freeze & Anti-Conflict**: Blocks unvetted upstream background overwrites.
13. **PNetLab Theme & Branding**: Deploys pure black dark mode and custom platform branding.
14. **Universal Platform Logo**: Deploys home screen avatar icon across all web views.
15. **Node Startup & Cisco IOSv**: Fixes SMM UEFI for Windows 11 and Cisco IOSv boot delays.
16. **Canvas Tools & Diagnostics**: Synchronizes Network Watcher (packet sniffing), Network Painter (topology styling), and Network Analyzer (in-browser capture container).
17. **GUI Version Synchronization**: Synchronizes `/main/#/version`, `/opt/unetlab/VERSION`, and database `cluster_hosts` to latest release.
18. **Web Credentials Reset**: Re-asserts canonical admin credentials (`admin` / `pnet`).
19. **Authentication Self-Healing & Systemd Rate-Limit Immunity**: Deploys `StartLimitIntervalSec=0` drop-ins to prevent `start-limit-hit` lockouts, executes live verification probe (HTTP 200), and clears shared memory lockouts.

---

## 🛰️ 2. Satellite Worker Node One-Line Commands

Satellite Worker nodes provide headless compute density, KVM virtualization, Soft-RoCE RDMA pipelines, and Docker container execution across cluster nodes.

> [!TIP]
> **Automated In-Band GitHub Download**: When you run `sudo pnet-update --satellite`, it automatically connects to GitHub (`azambasha1987/PNET`), pulls all updated files directly to `/opt/pnet`, creates an atomic safety snapshot, and executes the complete satellite worker pipeline in a single step.

### A. Direct Execution on Satellite Worker Node (SSH / Console)
```bash
sudo pnet-update --satellite  
```

### What Happens in the Satellite Worker Pipeline:
1. **GitHub In-Band Fetch**: Connects to GitHub (`azambasha1987/PNetLab`) and pulls/downloads latest repository code into `/opt/pnet`.
2. **Safety Snapshot**: Captures a timestamped `.tar.gz` checkpoint of `/opt/unetlab/{html/includes,templates,data/branding}`.
3. **OS Prerequisites**: Installs `swtpm`, `ovmf`, `rdma-core`, `libelf`, and `nodejs`.
4. **Bridge LACP BPDU Forwarding**: Sets `group_fwd_mask = 0xffff` to allow LACP/LLDP transit.
5. **Silicon Dataplane Accelerator**: Sets MTU 9000 jumbo frames for inter-node links.
6. **Speed Optimizer & Ultra-KSM**: Activates 4KB RAM deduplication for heavy worker density.
7. **Cgroups v2 & System Limits**: Configures task and memory slices for worker containers.
8. **Node Startup Engine**: Fixes Windows 11 UEFI SMM (`smm=on`) and Cisco IOSv boot timeouts.
9. **Soft-RoCE (RXE) Dataplane**: Enables `rdma_rxe` driver for lossless RDMA clustering.
10. **Heavy Node Optimizer**: Applies KVM halt-poll deactivation (`halt_poll_ns = 0`) and anti-bootstorm staggering.
11. **Docker Subsystem & Image Watcher**: Enforces `net.ipv4.ip_forward = 1`, bridge policies, and `azamlabs-docker-image-watcher.service`.
12. **Image Doctor**: Audits and repairs virtual disk QCOW2 images.
13. **File Permissions**: Normalizes permissions on `/opt/unetlab/addons/` and clears stale locks.
14. **Authoritative Credentials**: Enforces canonical `root:azam` password and MOTD banner.
15. **Satellite Root & Cluster DB**: Restores `/etc/azamlabs/cluster-db.conf` and creates symlink `/etc/pnetlab -> /etc/azamlabs`.
16. **Dynamic Satellite Versioning**: Updates `azamlabs-satd.py` to dynamically read `/opt/unetlab/VERSION` (`6.8.93resolute1`) and report exact synchronized cluster telemetry to Master Web UI.
17. **Worker Daemon Self-Healing & Rate-Limit Immunity**: Deploys `StartLimitIntervalSec=0` drop-ins for `azamlabs-satd`, `azamlabs-brokerd`, and `docker`, resets failed states, and verifies root credentials (`root:azam`).

---

## 🌐 3. Auto-Detect Universal One-Line Command

If running directly on a node and you prefer the system to detect whether it is a Master or Satellite automatically:

```bash
sudo pnet-update
```

The script inspects `/etc/azamlabs-role` and `dpkg -s azamlabs-satellite`:
- If Satellite is detected $\rightarrow$ runs the Satellite Worker pipeline.
- If Master is detected $\rightarrow$ runs the Master Controller pipeline.

---

## 🛡️ 4. Safety Snapshots & Instant 1-Line Rollback

In compliance with the **PNetLab Zero-Glitch Protocol**, an immutable pre-update snapshot is automatically created before any files are altered:

### Create Manual Snapshot:
```bash
sudo pnet-audit --snapshot
```

### Instant 1-Line Rollback Command:
```bash
# Rollback to the most recent pre-update snapshot:
sudo pnet-update --rollback

# Or specify a target snapshot archive:
sudo pnet-audit --rollback /opt/unetlab/data/Backup/snapshots/azamlabs_pre_update_<TIMESTAMP>.tar.gz
```

---

## 🔍 5. Post-Update Health Verification Commands

Validate system health and ensure 100% operational status after applying updates:

### Local Diagnostic Probe:
```bash
sudo pnet-update --check
```

### System Health Audit:
```bash
sudo pnet-health
```

### Full Automated Dry-Run Test Suite (7 Probes):
```bash
python3 scripts/azambasha-dry-test.py
```
*Confirms 7/7 probes passed (100% Healthy):*
- Probe 1: Plan & 34-Issue Ledger Integrity
- Probe 2: Direct Email Dispatch Engine
- Probe 3: Additive QEMU Template Discovery
- Probe 4: Turnkey Audit Runner (`pnet-audit`) & Rollback
- Probe 5: Canvas Viewport & Zoom Retention
- Probe 6: PNetLab Operations Center Dashboard Card
- Probe 7: Docker Container Subsystem & Official Images

