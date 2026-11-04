# PNetLab Technical Documentation & Operational Guides

Welcome to the comprehensive technical documentation for **PNetLab v8 (`6.8.93resolute1`)**. This documentation covers automated cluster installation, enterprise administration, hyper-density performance tuning, local AI integration, and benchmark analysis.

---

## 📚 Documentation Pillars & Quick Navigation

```
docs/
├── README.md                                         # This central documentation index
├── LOCAL_INSTALLATION.md                             # [Pillar 1] Offline & Cluster Ubuntu Installer Runbook
│
├── administration/                                   # [Pillar 2] Enterprise Cluster Administration
│   ├── 01_CLI_Admin_Toolkit_Reference.md             # Canonical pnet-* CLI tools and operation
│   ├── 02_One_Step_Update_Runbook.md                 # Automated in-band fleet update procedures
│   ├── 03_Permanent_Session_Never_Logout_Guide.md    # 10-year sliding session configuration
│   └── 04_Lab_Export_and_APT_Guard_Guide.md          # Multi-folder ZIP export and kernel APT protection
│
├── performance/                                      # [Pillar 3] High-Density Performance Tuning
│   ├── 01_System_Speed_and_Resource_Tuning.md        # Ultra-KSM, PHP OPcache & socket buffers
│   ├── 02_High_Density_Cisco_Router_Tuning.md        # Cisco IOL memory c-shim & bootstorm mitigation
│   ├── 03_Dataplane_JumboFrames_and_Impairment.md    # MTU 9000 fast-path & packet loss/jitter netem
│   └── 04_Universal_Hypervisor_and_Device_Optimization.md # QEMU headless VRAM & USB polling elimination
│
├── ai-integration/                                   # [Pillar 4] Artificial Intelligence Lab Builder
│   └── AI_Lab_Builder_Ollama_Guide.md                # Local Ollama LLM integration via Model Context Protocol (MCP)
│
├── benchmarks/                                       # [Pillar 5] Architecture & Performance Benchmarks
│   └── Benchmark_AzamLabs_vs_PNETLab_vs_EVENG.md     # Side-by-side feature & RAM matrix (PNetLab vs EVE-NG Pro)
│
├── manuals/                                          # [Pillar 6] Enterprise Operations Manual
│   └── AzamLabs_Enterprise_Operations_Manual.pdf     # Downloadable PDF operations and architecture reference
│
├── new-version-fix/                                  # [Pillar 7] Automated Script Ingestion Engine
│   ├── README.md                                     # Overview of version fixes and autonomous tuning
│   └── Automatic_Script_Application_Guide.md         # Full runbook for auto-applying scripts on install & update
│
└── img/                                              # Visual assets and topology screenshot gallery
```

---

### Pillar 1: Installation & Deployment
* **[Local / Offline Installation Guide](LOCAL_INSTALLATION.md)**:
  Hands-off installer runbook for fresh Ubuntu 24.04 / 26.04 LTS servers. Covers Master Controller node setup, Satellite worker compute node enrollment, package SHA256 integrity verification, and pre-bundled offline releases.

---

### Pillar 7: Version Ingestion & Automatic Script Pipeline
* **[Automatic Script Application Guide](new-version-fix/Automatic_Script_Application_Guide.md)**:
  Details how all enterprise optimization scripts, Ultra-KSM deduplication, cgroups v2 resource governance, and canonical `pnet-*` CLI commands are automatically executed during installations and re-applied autonomously during `pnet-update` upgrades without manual intervention.

### Pillar 2: Enterprise Administration & Operations
* **[CLI Admin Toolkit Reference](administration/01_CLI_Admin_Toolkit_Reference.md)**:
  Comprehensive manual for the first-class `pnet-*` CLI commands (`pnet-update`, `pnet-health`, `pnet-optimizer`, `pnet-backup`, `pnet-audit`, `pnet-cluster`, etc.) located in `/usr/local/bin/`.
* **[One-Step Update & Operations Runbook](administration/02_One_Step_Update_Runbook.md)**:
  Safe in-band updates with automated pre-flight checks, atomic safety snapshots, and 19-stage master/satellite pipelines.
* **[Permanent Session & "Never-Logout" Guide](administration/03_Permanent_Session_Never_Logout_Guide.md)**:
  How to configure 10-year sliding session persistence and eliminate unexpected web-UI logouts during long simulation runs.
* **[Lab Export & APT Guard Guide](administration/04_Lab_Export_and_APT_Guard_Guide.md)**:
  Configures robust multi-level ZIP packaging and installs APT Guard to protect 32-bit IOL libraries and kernel modules from unwanted upstream overrides.

---

### Pillar 3: High-Density Performance Tuning
* **[System Speed and Resource Tuning](performance/01_System_Speed_and_Resource_Tuning.md)**:
  Four-layer resource optimization: Ultra-KSM 4KB RAM deduplication, 256MB PHP OPcache, Apache Deflate compression, and 16MB socket queues.
* **[High-Density Cisco Router Tuning](performance/02_High_Density_Cisco_Router_Tuning.md)**:
  Reduces Cisco IOL memory footprint below 64 MB per router using a dynamic C-shim, and mitigates bootstorms with 3-tier staggered startups.
* **[Dataplane Jumbo Frames & Impairment](performance/03_Dataplane_JumboFrames_and_Impairment.md)**:
  Silicon dataplane fast-path configuration, MTU 9000 jumbo frames, and symmetric link impairment (delay, jitter, bandwidth loss).
* **[Universal Hypervisor & Virtual Device Optimization](performance/04_Universal_Hypervisor_and_Device_Optimization.md)**:
  QEMU performance architecture eliminating 1000Hz USB tablet spinloops, stripping unneeded VGA framebuffers, and enabling zero-overhead memory merging.

---

### Pillar 4: AI Lab Builder & Local LLM Integration
* **[AI Lab Builder & Ollama Integration Guide](ai-integration/AI_Lab_Builder_Ollama_Guide.md)**:
  Step-by-step setup to connect PNetLab with local Ollama LLMs (e.g. `qwen2.5:14b-instruct`) using Model Context Protocol (MCP) over streamable SSE transports.

---

### Pillar 5: Architecture & Performance Benchmarks
* **[Side-by-Side Architectural Benchmark](benchmarks/Benchmark_AzamLabs_vs_PNETLab_vs_EVENG.md)**:
  Comprehensive comparative matrix comparing **PNetLab v8 (Optimized)** against stock community PNetLab and commercial EVE-NG Pro across hypervisor density, memory efficiency, bootstorm handling, and protocol latency.

---

### Pillar 6: Enterprise Operations Manual
* **[Enterprise Operations Manual (PDF)](manuals/AzamLabs_Enterprise_Operations_Manual.pdf)**:
  Standalone PDF manual covering deployment patterns, security policies, backup routines, and hardware sizing recommendations.
