# Live VM Test Runbook & Verification Ledger: Release v<VERSION>

> **Document Status**: Draft / In-Progress / Verified / Released  
> **Release Version**: `v<VERSION>`  
> **Live VM Target**: `<IP or Hostname>` (Master Controller / Satellite)  
> **OS & Kernel**: Ubuntu 26.04 LTS (Resolute) / Ubuntu 24.04 LTS (`uname -r`)  
> **Test Date**: `YYYY-MM-DD`  
> **Lead Engineer / Tester**: `<Engineer Name>`  
> **Master Reference**: [`Master-Proccess-Doc.docx`](../Master-Proccess-Doc.docx)

---

## 1. Pre-Flight Verification & Update Execution

Prior to opening the test labs, confirm that the live VM update command has finished without errors.

```bash
# Execute on the Live VM terminal
sudo pnet-update
```

### Pre-Flight Checklist:
- [ ] `sudo pnet-update` completed with exit code `0`.
- [ ] Safe snapshot taken prior to package unpacking (`/opt/unetlab/backups/`).
- [ ] Database migrations executed non-destructively (`pnet_features_db.sql` & `guacdb.sql`).
- [ ] Services reloaded and active (`systemctl is-active pnetlab.service guacd.service pnet-cpu-governor.service`).
- [ ] CLI binaries registered in `/usr/local/bin/` (`pnet-perf`, `pnet-feat`, `pnet-watchdog`).

```bash
# Verification Command:
systemctl status pnet-cpu-governor.service --no-pager
pnet-perf --check
pnet-feat --status
```

*Pre-Flight Output Notes / Observations:*
```text
<Paste pre-flight CLI output here>
```

---

## 2. Lab 1: "Custom Performance" Verification

* **Lab Name**: `Custom Performance`
* **Node Types Tested**: Cisco IOSv / IOL, Cisco Catalyst 8000v (C8000v)
* **Desktop Snapshot Directory**: `~/Desktop/Custom Performance Test/`

### 2.1 IOSv / Cisco IOL Micro-Footprint (<64MB)
- [ ] Create and power on an IOL / IOSv node in lab `Custom Performance`.
- [ ] Verify `pnet-iol-shim.so` intercept via `LD_PRELOAD`.
- [ ] Check process Resident Set Size (RSS) memory footprint.
  ```bash
  ps -eo pid,cmd,rss | grep -E "(wrapper-iol|wrapper-linux)"
  ```
- [ ] **Expected Result**: Memory footprint strictly stabilized under **64 MB** per IOL instance (reduced from stock ~250MB+).
- [ ] Snapshot saved: `~/Desktop/Custom Performance Test/01_iol_memory_footprint.png`

### 2.2 Cisco Cat8000v Multi-Core Scaling & KSM Deduplication
- [ ] Power on Cisco C8000v (QEMU virtual node with 4 vCPUs, 8GB RAM).
- [ ] Check dynamic CPU frequency scaling governor status:
  ```bash
  cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor | head -n 4
  ```
- [ ] Check Ultra-KSM deduplication statistics across running QEMU nodes:
  ```bash
  cat /sys/kernel/mm/ksm/pages_sharing
  cat /sys/kernel/mm/ksm/pages_shared
  ```
- [ ] Check Cgroups v2 memory limits under `pnetlab.slice`:
  ```bash
  systemd-cgls /pnetlab.slice
  ```
- [ ] **Expected Result**: Active KSM page sharing > 0, idle vCPU usage scaled down, C8000v boots without memory thrashing (~1.6GB effective deduplicated footprint).
- [ ] Snapshot saved: `~/Desktop/Custom Performance Test/02_cat8000v_ksm_scaling.png`

### 2.3 Silicon Dataplane Fast-Path & Netem Impairment
- [ ] Verify MTU 9000 Jumbo Frames on internal bridge interfaces (`pnetbr0`, `vnet*`).
- [ ] Run link quality impairment simulation:
  ```bash
  pnet-perf --telemetry
  ```
- [ ] **Expected Result**: Interfaces report `mtu 9000`, netem drops/delays accurately reflected.
- [ ] Snapshot saved: `~/Desktop/Custom Performance Test/03_dataplane_netem.png`

---

## 3. Lab 2: "Custom Features" Verification

* **Lab Name**: `Custom Features`
* **Components Tested**: Operations Center, Terminal Drawer, Topology Git Snapshots, SLA Ping Mesh, Real-LAN Bridge
* **Desktop Snapshot Directory**: `~/Desktop/Custom Features Test/`

### 3.1 Operations Center Modal & Docked Console Drawer
- [ ] Access Web-UI at `https://<VM_IP>/`.
- [ ] Open lab `Custom Features` and launch multiple nodes.
- [ ] Press shortcut `Ctrl + Shift + O` (or click top navigation toolbar) to launch the **Operations Center**.
- [ ] Verify multi-tab docked interactive terminal drawer connects to active node serial consoles via HTML5 Guacamole / WebSockets.
- [ ] **Expected Result**: Multi-tab docked console drawer opens smoothly without page redirection; syntax highlighting active.
- [ ] Snapshot saved: `~/Desktop/Custom Features Test/01_ops_center_docked_console.png`

### 3.2 Topology Git Versioning & Automated Snapshots
- [ ] In the canvas, modify node positions and add a new link.
- [ ] Trigger manual or scheduled snapshot:
  ```bash
  pnet-feat --snapshot-now
  ```
- [ ] Verify Git commit in `/opt/unetlab/labs/git/`:
  ```bash
  git -C /opt/unetlab/labs/git log -n 3 --oneline
  ```
- [ ] **Expected Result**: Clean JSON/YAML topology commit created with timestamp and author metadata.
- [ ] Snapshot saved: `~/Desktop/Custom Features Test/02_topology_git_history.png`

### 3.3 SLA Ping Mesh & Real-LAN Transit
- [ ] Configure IP addresses on 3 virtual nodes.
- [ ] Trigger synthetic SLA traffic generator mesh:
  ```bash
  pnet-feat --run-sla-mesh
  ```
- [ ] Verify latency and packet delivery matrix displayed in Operations Center telemetry tab.
- [ ] Verify WireGuard real-LAN bridge (`wg0`) transit connection status.
- [ ] **Expected Result**: 100% telemetry matrix displayed with RTT latency and jitter.
- [ ] Snapshot saved: `~/Desktop/Custom Features Test/03_sla_ping_mesh.png`

---

## 4. Lab 3: "Custom Customization" Verification

* **Lab Name**: `Custom Customization`
* **Components Tested**: Cyber-Glass Holographic Portal, OLED Dark Theme, Sliding Session Keepalive, Appliance Templates
* **Desktop Snapshot Directory**: `~/Desktop/Custom Customization Test/`

### 4.1 Futuristic Cyber-Glass Login Portal & Branding
- [ ] Open an incognito browser window and navigate to `https://<VM_IP>/login.html`.
- [ ] Verify Cyber-Glass holographic glassmorphic UI, animated backdrop, and custom vector logos.
- [ ] Switch console mode toggle (HTML5 / Native Telnet).
- [ ] **Expected Result**: Fast, responsive 60 FPS glassmorphic portal renders with zero visual artifacts.
- [ ] Snapshot saved: `~/Desktop/Custom Customization Test/01_cyber_glass_login.png`

### 4.2 Pure Black OLED Dark Theme & Canvas Usability
- [ ] Log into Web-UI as `admin`.
- [ ] Verify Pure Black OLED theme (`#000000` / `#0a0a0f`) across sidebar, canvas, device context menus, and node status widgets.
- [ ] Toggle theme modes if applicable.
- [ ] **Expected Result**: High-contrast, zero-eyestrain OLED styling applied across all canvas elements.
- [ ] Snapshot saved: `~/Desktop/Custom Customization Test/02_oled_dark_theme.png`

### 4.3 10-Year Sliding Session Keepalive Heartbeat
- [ ] Open browser DevTools (`F12`) $\rightarrow$ Network tab.
- [ ] Observe background heartbeat requests (`/api/keepalive` or `/api/auth/heartbeat`) every 300 seconds.
- [ ] Leave session idle for > 30 minutes.
- [ ] Interact with canvas / nodes after idle period.
- [ ] **Expected Result**: Session remains authenticated without unexpected logout or 401 Unauthorized redirects.
- [ ] Snapshot saved: `~/Desktop/Custom Customization Test/03_sliding_keepalive.png`

### 4.4 CPU-Optimized Appliance Templates & Ollama AI
- [ ] Right-click canvas $\rightarrow$ "Add an Object" $\rightarrow$ "Node".
- [ ] Search for modern appliances (e.g. Cisco Cat8000v, Arista vEOS, Fortinet FortiGate, Juniper vSRX).
- [ ] Verify CPU optimization flags (`-cpu host` or AVX-512 flags) present in node template settings.
- [ ] Open Local AI Lab Builder assistant modal.
- [ ] **Expected Result**: 528+ optimized appliance definitions present; AI lab builder assistant responds.
- [ ] Snapshot saved: `~/Desktop/Custom Customization Test/04_templates_ai_builder.png`

---

## 5. Issue Resolution & Hotfix Ledger

Record any issues, anomalies, or regressions encountered during the Live VM tests.

| Issue ID | Affected Pillar | Description / Symptoms | Root Cause | Code Fix Applied | Dry-Test & Verification Proof | Status |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| *ISSUE-01* | *Performance* | *Example: IOL shim LD_PRELOAD not inherited* | *wrapper permissions* | *Updated wrapper-iol permissions in deb postinst* | *pnet-dry-test probe 10 passed* | **[RESOLVED]** |
| *ISSUE-02* | *Features* | *None observed* | *-* | *-* | *-* | **[PASSED]** |

### Detailed Resolution Notes:
*(If any code fixes were applied, document commit hash, modified files, and re-test logs here)*

```text
<Paste resolution and diff logs here>
```

---

## 6. Final Sign-off & Release Verdict

- [ ] **Lab 1: Custom Performance**: All verification probes PASSED.
- [ ] **Lab 2: Custom Features**: All verification probes PASSED.
- [ ] **Lab 3: Custom Customization**: All verification probes PASSED.
- [ ] **Desktop Snapshots**: All 3 snapshot folders captured and archived.
- [ ] **Code Repository**: Any runtime hotfixes committed and pushed to `main`.
- [ ] **Release Verdict**: **APPROVED FOR PRODUCTION FLEET DEPLOYMENT**

**Sign-off By**: ______________________ &nbsp;&nbsp;&nbsp;&nbsp; **Date**: _______________
