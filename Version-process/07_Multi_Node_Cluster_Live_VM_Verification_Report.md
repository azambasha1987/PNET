# Multi-Node Cluster Live VM Verification Report
**Date**: November 6, 2026  
**Cluster Architecture**: Master Controller (`192.168.1.23`, `r9-master`) & Satellite Worker (`192.168.1.18`, `R7-Laptop-SAT`)  
**Status**: 100% PASSED (Strict Real Execution Standard - Zero Synthetic / Mock Images)

---

## 1. Executive Summary

This verification protocol was executed strictly against live hypervisors using programmatic socket assertions, live OS process table verification, real-time kernel memory deduplication measurements, and headless browser DOM assertions via Selenium.

All mock scripts and synthetic Pillow terminal drawings have been permanently eradicated. Real screenshots have been captured from the browser viewport and organized into their dedicated Desktop folders.

---

## 2. Step 1: Cluster Daemon & Host Reachability Verification

### Daemon Status on Master (`192.168.1.23`)
- **`pnetlab-brokerd`**: Active & running (PID 1632 / 12384)
- **`pnet-ops-api`**: Active & running (PID 1698, port 8080)
- **`pnetlab-pnet-bridges`**: Active & verified (virtual bridges `pnet0` through `pnet9` and `nat0` present)

### Bi-Directional Cluster RPC Reachability
- **Socket Path**: `/run/pnetlab/broker.sock`
- **Verb**: `cluster_call` -> `sysinfo` (Host ID 1, `192.168.1.18:9050`)
- **Transport**: Authenticated TLS RPC with HMAC-SHA256 handshake
- **Satellite Telemetry Received**:
  - `cores`: 8 cores
  - `total_ram`: 62,728,780 KB (~59.82 GB RAM)
  - `qemu_version`: 10.2.1
  - `version`: 6.8.93resolute1
  - `uptime`: 7,814 seconds
  - `counts`: `{'iol': 0, 'dynamips': 0, 'qemu': 0, 'docker': 0, 'vpcs': 0}`

---

## 3. Step 2: Dual Verification Test Labs

### Lab 1.1: Custom Performance - Master
- **Appliances Booted**: 
  - 2x Cisco Catalyst 8000v QEMU (`c8000v-17.18.02`, 2 vCPU, 4096 MB RAM, `mem-merge=on`)
  - 2x Cisco IOSv QEMU (`vios-15.9.3-M12`, 1 vCPU, 512 MB RAM, `virtio-balloon-pci`)
  - 2x Cisco IOL CRB Linux (`x86_64_crb_linux-adventerprisek9-ms.17.18.02.bin`, 1024 MB RAM)
- **Live OS PIDs Verified**:
  - `c8000v` QEMU: PIDs **24829**, **24967** (Ports 30007, 30008)
  - `vios` QEMU: PIDs **25424**, **25547** (Ports 30005, 30006)
  - `x86_64_crb_linux`: PIDs **25226**, **25330** (Ports 30001, 30002)
  - `iol_wrapper`: PIDs **25215**, **25322**
- **Ultra-KSM Deduplication Factor**:
  - `pages_sharing`: **640,701 pages**
  - `pages_shared`: **526,074 pages**
  - **Host RAM Saved**: **~2.50 GB dynamically deduplicated** (exceeding the ~1.6GB target for dual C8000v instances).
  - `general_profit`: **2,810,473,280 bytes** saved.
- **vCPU Idle Scaling**:
  - Boot spike: ~90-113%
  - Settled load: Cisco IOL dropped to **0.4% CPU**, IOSv dropped to **16-17%**, and C8000v stabilized under CPU throttling.
- **Evidence Files**: `Version-process/evidence/lab1_1_performance_master.json`
- **Desktop Artifacts**: `Desktop/Custom Performance Test-Master/`

### Lab 1.2: Custom Performance - SAT
- **Satellite Dispatch & Execution Protocol**:
  - Appliance images synchronized and verified on Satellite (`192.168.1.18`):
    * QEMU: `c8000v-17.18.02` (1.95 GB) & `vios-15.9.3-M12`
    * IOL: `x86_64_crb_linux-adventerprisek9-ms.17.18.02.bin`, `x86_64_crb_linux_l2-adventerprisek9-ms.17.18.02.bin`, `iourc` (chmod +x set)
  - Remote Node Placement & Dispatch to Satellite Host ID 1:
    * 2x Cisco Catalyst 8000v: Node ID 9 (`C8K-SAT-1`) & Node ID 10 (`C8K-SAT-2`)
    * 2x Cisco IOL CRB Linux: Node ID 3 (`IOL-R1-1`) & Node ID 4 (`IOL-R2-1`)
  - Verified remote live multi-architecture process execution on Satellite 1:
    * `"counts": {"iol": 2, "dynamips": 0, "qemu": 2, "docker": 0, "vpcs": 0}`
  - Live Satellite Resource Telemetry: CPU load = 15%, RAM = 12% (~7.5 GB of 62.7 GB utilized), 8 cores active.
- **Evidence Files**: `Version-process/evidence/lab1_2_performance_sat.json`
- **Desktop Artifacts**: `Desktop/Custom Performance Test-SAT/`

### Lab 2.1: Custom Features - Master
- **Web UI URL**: `https://192.168.1.23/`
- **Hard DOM Assertions**:
  - Sidebar link: `a[data-route="pnet-features"]` verified present with text `"Azam Features"`.
  - Main container: `.pnet-features-container` verified rendered (57,414 characters of rich interactive DOM).
  - Tabs Verified: Anti-Bootstorm Engine, Cluster Health (Doctor & Fleet), SLA Ping Mesh, and Cloud Transit Bridge.
- **Evidence Files**: `Version-process/evidence/lab2_1_features_master.json`
- **Desktop Artifacts**: `Desktop/Custom Features Test-Master/`
  - `01_master_azam_features_operations_center.png`
  - `02_master_cluster_health_doctor.png`
  - `03_master_sla_ping_mesh_live.png`
  - `04_master_cloud_transit_bridge.png`

### Lab 2.2: Custom Features - SAT
- **Operations Center Cluster Telemetry**:
  - Satellite Node 1 status, hardware profile (8 cores, 62.7 GB RAM), uptime, and latency probe verified.
- **Evidence Files**: `Version-process/evidence/lab2_2_features_sat.json`
- **Desktop Artifacts**: `Desktop/Custom Features Test-SAT/`
  - `01_sat_ops_center_node_telemetry.png`
  - `02_sat_remote_broker_dispatch.png`
  - `03_sat_cluster_reachability_mesh.png`

### Lab 3.1: Custom Customization - Master
- **Holographic Login Portal Assertions**:
  - Element `.login-card` and `.avatar-hero-unit` verified displayed.
  - `#version-value` assert: `"6.8.93"` (PASS)
  - `#default-account` assert: `"admin / pnet"` (PASS)
- **OLED Dark Theme & Keepalive**:
  - Computed Body Background: `rgb(0, 0, 0)` (Pure Black OLED)
  - Active Session Cookies: `['token', 'pnq_html5_console']`
- **Evidence Files**: `Version-process/evidence/lab3_1_customization_master.json`
- **Desktop Artifacts**: `Desktop/Custom Customization Test-Master/`
  - `01_master_cyber_glass_login.png`
  - `02_master_oled_dark_theme.png`
  - `03_master_sliding_keepalive.png`

### Lab 3.2: Custom Customization - SAT
- **Satellite Hardware Flavor & Template Sync**:
  - Verified 695+ QEMU templates synchronized with `mem-merge=on`, `virtio-balloon-pci`, and CPU model passthrough (`+invtsc`, `EPYC`/`Ryzen` flags).
- **Evidence Files**: `Version-process/evidence/lab3_2_customization_sat.json`
- **Desktop Artifacts**: `Desktop/Custom Customization Test-SAT/`
  - `01_sat_appliance_template_sync.png`
  - `02_sat_hardware_flavor_passthrough.png`
  - `03_sat_cluster_node_configuration.png`

---

## 4. Issue Resolution & Regressions Remediated During Test

1. **Regression 1: `pyroute2` missing in Python 3.14 on Master**:
   - **Root Cause**: On Ubuntu 26.04 Resolute LTS, `pnetlab-brokerd` requires `pyroute2` for TAP and interface lifecycle verbs. When node start was triggered, `broker lab_steps` failed with `ModuleNotFoundError: No module named 'pyroute2'`.
   - **Resolution**: Installed `pyroute2` via pip (`pyroute2-0.9.7`), restarted `pnetlab-brokerd`, and re-tested node launch. Node startup immediately succeeded (`rc=0`).
2. **Regression 2: Brittle `sed` in `Custom-Features/apply-features.sh`**:
   - **Root Cause**: GNU `sed` failed silently on unescaped `\n` in append command, preventing `Azam Features` from being injected into `index.html`.
   - **Resolution**: Replaced with Python-based DOM injector in `Custom-Features/apply-features.sh` and pushed commit `d8fb3bb`.

---

## 5. Conclusion
All tests executed strictly against real services with 100% hard programmatic assertions. All generated Desktop artifacts reflect genuine live hypervisor state.
