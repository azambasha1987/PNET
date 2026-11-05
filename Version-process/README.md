# Version-process / Live VM Verification Directory

This directory stores authoritative Live VM verification runbooks, test evidence logs, screenshot catalogs, and issue resolution records for each PNetLab release version.

---

## Purpose & Protocol

As specified in [`Master-Proccess-Doc.docx`](../Master-Proccess-Doc.docx), whenever a new release is ingested, hardened, and deployed to live VMs via `sudo pnet-update`, engineers execute the **Live VM Verification Protocol**.

### The 3 Core Test Labs:
1. **Lab 1: "Custom Performance"**
   - Boot IOSv and Cisco C8000v virtual appliances.
   - Verify Ultra-KSM memory deduplication (<64MB for IOL via `pnet-iol-shim`, ~1.6GB for C8000v) and dynamic CPU scaling.
   - Verify Cgroups v2 memory ceilings, Soft-RoCE, and Netem link impairment.
   - Save desktop snapshots into: `~/Desktop/Custom Performance Test/`
2. **Lab 2: "Custom Features"**
   - Boot virtual nodes and test Operations Center modal, docked multi-tab console drawer, and syntax highlighter.
   - Verify automated topology Git snapshots, multi-vendor backup/diff, and synthetic SLA ping mesh generator.
   - Verify WireGuard real-LAN bridge and Docker container subsystem.
   - Save desktop snapshots into: `~/Desktop/Custom Features Test/`
3. **Lab 3: "Custom Customization"**
   - Verify Cyber-Glass holographic login portal & console mode selector.
   - Verify Pure Black OLED dark theme and custom vector branding.
   - Verify 10-year sliding session keepalive heartbeat (zero session timeouts).
   - Verify CPU-optimized appliance templates (528 Intel AVX-512 / AMD Zen definitions) and Ollama local AI lab builder.
   - Save desktop snapshots into: `~/Desktop/Custom Customization Test/`

---

## File Naming Convention

| File / Folder | Purpose |
| :--- | :--- |
| `LIVE_VM_TEST_RUNBOOK_TEMPLATE.md` | Master blank template to copy for any upcoming release verification. |
| `v<VERSION>_live_test_report.md` | Active, filled report for specific release version (e.g. `v6.8.93resolute1_live_test_report.md`). |
| `issues/` | Detailed post-mortem logs, crash dumps, or multi-step hotfix patches if needed. |

---

## Issue Resolution & Hotfix Workflow

If any bug, performance bottleneck, or UI regression is identified during Live VM testing:
1. **Log**: Record the issue in the release runbook under **Section 5: Issue Resolution & Hotfix Ledger**.
2. **Fix**: Implement the fix directly in the codebase (`Custom-Features/`, `Custom-Customization/`, or `Custom-Performance/`).
3. **Dry-Test**: Re-run the automated dry-test suite:
   ```bash
   python Custom-Performance/scripts/pnet-dry-test.py
   python -m unittest discover tests
   ```
4. **Repack & Redeploy**: Repack the Debian archive, commit and push the fix, and update the live VM.
5. **Verify**: Mark the issue as **[RESOLVED]** with screenshot proof attached.
