# Local / Offline Installation Guide for PNetLab on Ubuntu

This repository contains full offline-capable release packages and helper scripts to install **PNetLab v8** on Ubuntu hosts (Ubuntu 24.04 LTS / Ubuntu 26.04 LTS) without relying on live network pulls from Codeberg.

---

## 1. Prerequisites

- 64-bit Ubuntu host (bare-metal or VM with nested virtualization enabled: Intel VT-x or AMD-V).
- At least 4 vCPU, 8 GB RAM, and 40 GB free disk space.
- Superuser (`sudo`) access.

---

## 2. Quick Start

### Step 1: Clone this Repository on your Ubuntu Machine
```bash
git clone https://github.com/azambasha1987/PNET.git
cd PNET
```

### Step 2: Verify Package Integrity (Optional but Recommended)
Run the verification script to check SHA256 checksums across all release packages:
```bash
bash install/verify-packages.sh
```

---

## 3. Installation Options

### Option A: Install as Master Node (Web UI + Database + Local Labs)
To configure a standalone server or Master cluster node:
```bash
sudo bash install/install-master.sh
```

**What this script does:**
1. Validates all packages against signed release manifests.
2. Enrolls the repository security signing key.
3. Installs core Ubuntu dependencies (`apache2`, `mysql-server`, `php-fpm`, `docker.io`, `bridge-utils`, `qemu-kvm`).
4. Extracts core assets to `/opt/unetlab/`.
5. Installs the Master Debian packages (`pnetlab`, `pnetlab-schema`, `pnetlab-guacd`, `pnetlab-qemu`, `pnetlab-docker`, `pnetlab-vpcs`, `pnetlab-bridge-dkms`).
6. Automatically deploys and executes the enterprise optimization suite (Ultra-KSM 4KB RAM deduplication, cgroups v2, OPcache, permissions, and canonical `pnet-*` CLI toolchains).
7. Starts and enables background services.

**Accessing PNetLab:**
- Open your browser at: `https://<server-ip>/` or `https://localhost/`
- Default Username: `admin`
- Default Password: `pnet`

---

### Option B: Install as Satellite Node (Distributed Compute Worker)
To configure an additional compute host that joins an existing Master:
```bash
sudo bash install/install-satellite.sh
```

**What this script does:**
1. Installs hypervisor and container dependencies (`qemu-kvm`, `docker.io`, `bridge-utils`).
2. Installs the Satellite agent packages (`pnetlab-satellite`, `pnetlab-docker`, `pnetlab-qemu`, `pnetlab-vpcs`, `pnetlab-bridge-dkms`).
3. Automatically applies satellite hypervisor optimizations and canonical `pnet-*` CLI commands.
4. Prepares the node to join your cluster.

**Connecting to Master:**
1. In your Master Web UI, navigate to **System** &rarr; **Satellite Management** &rarr; **Add Satellite**.
2. Run the join command displayed on the Master UI on this satellite host.

---

## 4. Managing Future Releases

Releases are stored in versioned folders under `releases/<version>/`:

```
releases/
├── channel-pointer.json              # Points to the active release
└── 6.8.93resolute1/                  # Specific version assets
    ├── debs/
    ├── assets/
    ├── manifests/
    └── scripts/
```

To add an upcoming release (e.g. `6.8.94resolute1`):
1. Create `releases/6.8.94resolute1/` following the same subfolder structure.
2. Update `releases/channel-pointer.json` with the new version string.
3. Commit and push to GitHub:
   ```bash
   git add releases/
   git commit -m "Add PNetLab release 6.8.94resolute1"
   git push origin main
   ```
4. On your Ubuntu hosts, update and apply the new release:
   - **Either via local git**:
     ```bash
     git pull
     sudo bash install/install-master.sh
     ```
   - **Or via in-band update command**:
     ```bash
     sudo pnet-update
     ```
   *The update process automatically detects new release `.deb` packages, upgrades them, and re-applies the complete enterprise optimization scripts suite.*
