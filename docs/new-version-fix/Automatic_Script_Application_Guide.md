# Automatic Script Application & Version Ingestion Engine

**Operational Architecture & Runbook: Autonomous Script Execution Across Initial Installs and Upstream Upgrades**  
*Platform: Ubuntu 26.04 LTS ("Resolute") & Ubuntu 24.04 LTS ("Noble") • Master & Satellite Cluster Nodes*  
*Repository: [azambasha1987/PNET](https://github.com/azambasha1987/PNET)*

---

## 1. Executive Summary & Purpose

When installing or upgrading **PNetLab v8** to a new upstream release (e.g., from `6.8.93resolute1` to future versions), stock upstream Debian packages (`.deb`) inherently overwrite configuration templates, reset web directories, purge custom hypervisor settings, and omit system-level performance tuning.

To eliminate manual reconfiguration after every update, this repository implements the **Autonomous Version Ingestion & Script Execution Engine**. Whenever a new version is installed or updated:
1. Base Debian packages (`.deb`) are installed/upgraded.
2. The complete enterprise toolkit from `scripts/` is automatically propagated into `/opt/unetlab/scripts/`.
3. The optimization and feature pipeline is immediately re-executed, ensuring all hypervisor tunings, memory deduplications, cgroups governance, and `pnet-*` CLI commands remain permanently active.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│              AUTONOMOUS SCRIPT LIFECYCLE FOR EVERY NEW VERSION                   │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│        1. Fresh Installation           │          2. In-Band Upgrades            │
│   (install-master.sh / satellite)      │              (pnet-update)              │
├────────────────────────────────────────┼─────────────────────────────────────────┤
│ • Validates SHA256 package hashes      │ • Pulls latest code from GitHub         │
│ • Unpacks core assets archive          │ • Reads releases/channel-pointer.json   │
│ • Installs release .deb packages       │ • Upgrades Debian packages via dpkg -i  │
│                                        │                                         │
│ └───────► AUTOMATIC POST-INSTALL ──────┴───────► AUTOMATIC POST-UPDATE ◄────────┘
│                                   ▼
│    ┌────────────────────────────────────────────────────────────────────────┐
│    │     Enterprise Script Execution Pipeline (/opt/unetlab/scripts/)       │
│    ├────────────────────────────────────────────────────────────────────────┤
│    │ 1. Global pnet-* CLI Registration & Legacy azam-* Purge               │
│    │ 2. Ultra-KSM (4KB Deduplication, 65-80% RAM Savings) + OPcache        │
│    │ 3. Cgroups v2 Dynamic CPU & Memory Isolation Engine                    │
│    │ 4. File Permission Standardization & Device Socket Normalization       │
│    │ 5. Web UI Canonical Credential Re-assertion (admin:pnet)               │
│    └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1: Installation Lifecycle (`install-master.sh` & `install-satellite.sh`)

During an initial deployment on an Ubuntu host, the installer executes in seven distinct stages. Stage 6 is dedicated to automatically applying the enterprise scripts.

### 2.1 Master Node Execution Flow (`install-master.sh`)
```bash
sudo bash install/install-master.sh [--version <VERSION>]
```

1. **Package Verification**: Validates SHA256 checksums of all `.deb` and `.tar.zst` files against signed manifests.
2. **Keyring Enrollment**: Installs the local repository GPG key into `/usr/share/keyrings/pnetlab-local.gpg`.
3. **Dependency Resolution**: Installs Apache2, MySQL, PHP-FPM, Docker, KVM, and bridge utilities via `apt-get`.
4. **Asset Unpacking**: Extracts `pnetlab-core-assets-<VERSION>.tar.zst` directly to `/opt/unetlab/`.
5. **Debian Package Installation**: Installs all 7 Master `.deb` packages via `dpkg -i`.
6. **Automatic Script Application (Step 6)**:
   * **Toolkit Propagation**: Synchronizes all scripts from `scripts/` into `/opt/unetlab/scripts/` and sets `chmod +x`.
   * **CLI Registration**: Executes `azambasha-install-azam-features.sh`:
     * Purges legacy `azam-*` commands (`rm -f /usr/local/bin/azam-*`).
     * Installs canonical `/usr/local/bin/pnet-*` symlinks (`pnet-update`, `pnet-health`, `pnet-optimizer`, etc.).
   * **Ultra-KSM & Kernel Speed Optimization**: Executes `azambasha-speed-optimizer.sh`:
     * Configures 4KB page scanning (`pages_to_scan=2000`, `sleep=20ms`, `zero_pages=1`).
     * Engages PHP OPcache (256MB) and Apache Deflate compression.
     * Sets `vm.swappiness=10` and raises socket buffers to 16MB.
   * **Cgroups v2 Resource Governance**: Executes `azambasha-cgroups-v2-engine.sh`:
     * Establishes systemd slice isolation to prevent rogue virtual machines from starving the host OS.
   * **Permissions & Sockets**: Executes `azambasha-fix-permissions.sh` and `azambasha-fix-web-credentials.sh`.
7. **Service Finalization**: Reloads systemd and restarts Apache2 and Guacamole.

### 2.2 Satellite Node Execution Flow (`install-satellite.sh`)
```bash
sudo bash install/install-satellite.sh [--version <VERSION>]
```
Applies the identical Step 6 optimization pipeline configured specifically for satellite worker nodes (`--satellite`), ensuring distributed compute nodes operate with identical kernel tuning and `pnet-*` CLI commands.

---

## 3. Phase 2: In-Band Update Lifecycle (`pnet-update`)

On an active PNetLab host, updates are executed with a single command:
```bash
sudo pnet-update [--master | --satellite | --auto]
```

### What `pnet-update` Does Automatically:
1. **GitHub In-Band Pull**:
   * Connects to [`https://github.com/azambasha1987/PNET.git`](https://github.com/azambasha1987/PNET.git).
   * Pulls the latest commits and release packages into `/opt/pnet`.
2. **Version Detection & Deb Installation**:
   * Inspects `releases/channel-pointer.json` to identify the target release string.
   * If a new version exists in `releases/<VERSION>/debs/`, it installs the updated packages:
     ```bash
     dpkg -i /opt/pnet/releases/<VERSION>/debs/*.deb
     apt-get install -f -y
     ```
3. **Automatic Script Re-execution**:
   * Propagates updated scripts from `/opt/pnet/scripts/` to `/opt/unetlab/scripts/`.
   * Refreshes all `/usr/local/bin/pnet-*` CLI commands.
   * Re-applies Ultra-KSM memory deduplication, cgroups v2, and Apache FastCGI settings.
   * Re-aligns permissions and ensures zero regression.

---

## 4. Runbook: Ingesting an Upcoming Upstream Release

Follow this procedure whenever the upstream maintainer publishes a new release (e.g. `6.8.94resolute1`):

### Step 1: Create the Version Directory Structure
In your local repository root:
```bash
mkdir -p releases/6.8.94resolute1/{debs,assets,manifests,scripts}
```

### Step 2: Download the New Release Packages
Download the `.deb` files, core-assets archive, and manifests from the upstream package registry into the respective subfolders:
* `.deb` files & `debian-repository.key` &rarr; `releases/6.8.94resolute1/debs/`
* `pnetlab-core-assets-*.tar.zst` (+ `.sig`, `.sha256`) &rarr; `releases/6.8.94resolute1/assets/`
* `*-manifest.json` (+ `.sig`, `.sha256`) &rarr; `releases/6.8.94resolute1/manifests/`
* `*.sh` install scripts &rarr; `releases/6.8.94resolute1/scripts/`

### Step 3: Update the Channel Pointer
Update `releases/channel-pointer.json`:
```json
{
  "release": "6.8.94resolute1",
  "schema": 1,
  "type": "pnetlab-channel-pointer"
}
```

### Step 4: Verify and Push to GitHub
```bash
# 1. Run local verification
bash install/verify-packages.sh 6.8.94resolute1

# 2. Commit and push
git add releases/
git commit -m "Ingest PNetLab release 6.8.94resolute1"
git push origin main
```

### Step 5: Apply to Running Nodes
On any Ubuntu Master or Satellite host, simply run:
```bash
sudo pnet-update
```
`pnet-update` will automatically detect `6.8.94resolute1`, upgrade the debian packages, and immediately re-execute all hypervisor, memory, and performance scripts.

---

## 5. Verification Probes

To confirm that the scripts and optimizations have been successfully applied for your active release:

| Diagnostic Goal | Command | Expected Output |
| :--- | :--- | :--- |
| **System Health & Virtualization** | `sudo pnet-health` | All services green, `/dev/kvm` accessible, KSM active |
| **Ultra-KSM Deduplication** | `sudo pnet-optimizer --check` | `pages_sharing > 0`, `sleep_millisecs=20`, `pages_to_scan=2000` |
| **CLI Availability** | `which pnet-update pnet-health pnet-optimizer` | `/usr/local/bin/pnet-*` paths returned |
| **Integrity Audit** | `sudo pnet-audit` | File permissions, database integrity, and snapshots verified |
