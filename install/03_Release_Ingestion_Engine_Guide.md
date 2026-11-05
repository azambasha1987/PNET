# PNetLab Release Ingestion Engine & Upstream Lifecycle Guide

**Master Release Automation & Fleet Distribution Pipeline | PNetLab v8**  
*Reference: `Master-Proccess-Doc.docx` • Platform: Cross-Platform (Windows, Linux, macOS) & Ubuntu 26.04 Resolute*

---

## 1. Architectural Overview

The **Release Ingestion Engine** automates the entire upstream release lifecycle of PNetLab as specified in `Master-Proccess-Doc.docx`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THOUGHT PROCESS & LIFECYCLE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Upstream Discovery & Download:                                           │
│    When a new version is released in upstream PNetLab, download and stage   │
│    the packages into the 'releases/<version>/' directory hierarchy.         │
│                                                                             │
│ 2. Tri-Pillar Customization & Hardening:                                    │
│    Apply Custom-Performance, Custom-Features, Custom-Customization,         │
│    canonical administrative scripts, and tests to the release payload.      │
│                                                                             │
│ 3. Repackaging & Manifest Generation:                                       │
│    Unpack, inject, and repack Debian packages (pnetlab & pnetlab-satellite) │
│    with SHA256 checksums and release manifest generation.                   │
│                                                                             │
│ 4. Single-Command Fleet Distribution:                                       │
│    Publish to channel-pointer.json so all Live VMs update seamlessly        │
│    via the single update command: `sudo pnet-update`                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure (`releases/`)

Each release in the repository is structured as an isolated, verified release bundle:

```
releases/
├── channel-pointer.json                  # Active channel pointer pointing to current release
├── channel-pointer.json.sha256           # Cryptographic checksum of channel pointer
├── pnetlab-network-install-latest.sh     # Network bootstrap installer for current release
├── pnetlab-network-install-latest.sh.sha256
└── <version>/                            # e.g., 6.8.93resolute1, 6.8.94resolute1
    ├── assets/                           # Core assets tarballs (pnetlab-core-assets-*.tar.zst)
    ├── debs/                             # Debian packages (master, satellite, docker, etc.)
    ├── manifests/                        # pnetlab-<version>-manifest.json and .sha256
    └── scripts/                          # Network and satellite installer scripts
```

---

## 3. The Customization Injection Matrix

When applying customizations to a release (`pnet-release-engine apply` or `pipeline`), the engine automatically injects:

1. **Custom-Performance**:
   - High-performance binary wrappers (`azam-iol-shim.so`, `ksm_merge_exec`, `unl_wrapper`)
   - Heavy Node Optimizer (`pnet-heavy-node-optimizer.sh`, `pnet-apply-heavy-node-optimizer.sh`)
   - Automated system test probe suite (`pnet-dry-test.py`)
   - cgroups v2 resource throttle engine (`pnet-cgroups-v2-engine.sh`)
   - CPU governor dynamic scaling (`pnet-cpu-governor.py`)

2. **Custom-Features**:
   - Anti-Bootstorm 3-tier staggered startup engine (`pnet-bootstorm.py`)
   - Sequenced docked consoles (`pnet-sequenced-console.js`, `pnet-docked-console.js`)
   - Operations Center & enhanced web-ui toolbar (`pnet-features.js`)
   - Satellite broker daemons (`pnet-satd.py`, `pnet-brokerd.py`)

3. **Custom-Customization**:
   - 500+ vendor node templates for AMD and Intel platforms (`templates/amd/*.yml`, `templates/intel/*.yml`)
   - Cyber-Glass login portal with jumping holographic avatar and default credentials
   - 10 Enterprise Themes Engine (`theme-engine.css`, `default/index.html`)
   - Multi-Session PHP token pooling & natural ascending sort (`api_folders.php`, `labs.js`)

4. **Canonical Administrative Scripts**:
   - All `pnet-*` utilities installed into `/opt/unetlab/scripts/`
   - Canonical `/usr/local/bin/pnet-*` symlinks registered in `DEBIAN/postinst`

5. **Test Gates**:
   - Regression and package parity test suites staged in `/opt/unetlab/tests/`

---

## 4. CLI Syntax & Usage Reference

The engine can be invoked via Python or the shell wrapper:

```bash
# Python direct invocation
python scripts/pnet-release-ingestion-engine.py [COMMAND] [OPTIONS]

# Canonical shell wrapper
sudo pnet-ingest-release [COMMAND] [OPTIONS]
```

### 4.1 Turnkey End-to-End Pipeline
Executes all 5 steps in a single automated pass:
```bash
python scripts/pnet-release-ingestion-engine.py pipeline --version 6.8.94resolute1
```

### 4.2 Staging an Upstream Release
Downloads or stages packages into `releases/<version>/`:
```bash
# From a local directory of downloaded upstream packages:
python scripts/pnet-release-ingestion-engine.py stage --version 6.8.94resolute1 --source-dir /tmp/upstream_debs

# Or seeded from the previous active release:
python scripts/pnet-release-ingestion-engine.py stage --version 6.8.94resolute1 --base-version 6.8.93resolute1
```

### 4.3 Injecting Custom Layers & Repacking Packages
Injects the Tri-Pillar Customizations, scripts, and tests into the `.deb` packages:
```bash
python scripts/pnet-release-ingestion-engine.py apply --version 6.8.94resolute1
```

### 4.4 Generating Release Manifests & Checksums
Calculates SHA256 checksums for all debs, assets, and scripts, generating the official manifest:
```bash
python scripts/pnet-release-ingestion-engine.py manifest --version 6.8.94resolute1
```

### 4.5 Publishing to Channel Pointer
Updates `releases/channel-pointer.json`, `pnetlab-network-install-latest.sh`, and root `VERSION`:
```bash
python scripts/pnet-release-ingestion-engine.py publish --version 6.8.94resolute1
```

### 4.6 Pushing to Live Fleet VMs
Pushes the update across the fleet by executing the Single Update Command (`sudo pnet-update`):
```bash
# Remote fleet push via SSH:
python scripts/pnet-release-ingestion-engine.py push --hosts 192.168.1.23,192.168.1.24 --user root --password azam

# Local execution on live appliance:
sudo pnet-update --auto
```

---

## 5. Live VM Single Update Command Reference

On any live Master or Satellite appliance, the new release is applied via the canonical single command:

```bash
# Automatic role detection (Master vs Satellite):
sudo pnet-update

# Explicit Master node upgrade:
sudo pnet-update --master

# Explicit Satellite node upgrade:
sudo pnet-update --satellite
```

When `pnet-update` executes:
1. It fetches the latest Git code from the repository.
2. Reads `releases/channel-pointer.json` to identify the active release.
3. Automatically installs all newly packaged `.deb` files from `releases/<version>/debs/`.
4. Executes `apply-all-custom.sh` to synchronize Custom-Performance, Custom-Features, and Custom-Customization.
5. Verifies permissions, restarts daemons, and performs self-reexec to run the latest updated engine.
