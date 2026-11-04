# New Version Fix & Automatic Script Application

This folder documents the **Automatic Script Application Engine** implemented in PNetLab v8. It details how enterprise scripts, hypervisor tunings, memory deduplications, and canonical `pnet-*` CLI commands are automatically applied during initial installations and preserved across upcoming releases and updates.

---

## 📑 Documents in this Directory

* **[Automatic Script Application Guide (Full Runbook)](Automatic_Script_Application_Guide.md)**:
  * **Theory of Operation**: Preventing stock `.deb` overwrites from wiping out custom tunings.
  * **Installation Lifecycle**: How Step 6 of `install-master.sh` and `install-satellite.sh` automatically executes the optimization pipeline.
  * **In-Band Updates**: How `pnet-update` pulls new code, upgrades packages, and re-tunes the host autonomously.
  * **Upcoming Version Runbook**: Step-by-step procedure to ingest new upstream releases (e.g. `6.8.94resolute1`).
  * **Diagnostic Probes**: Verifying active Ultra-KSM, cgroups v2, and `pnet-*` commands.
