# PNetLab Technical Documentation & Operational Guides

Welcome to the comprehensive technical documentation for **PNetLab v8 (`6.8.93resolute1`)**. This documentation covers automated cluster installation, enterprise administration, hyper-density performance tuning, local AI integration, and benchmark analysis across the three modular subsystems.

---

## 📚 Documentation Architecture & Quick Navigation

```
PNET/
├── docs/                                             # Central documentation and screenshots
│   ├── README.md                                     # This central documentation index
│   ├── LOCAL_INSTALLATION.md                         # Offline & Cluster Ubuntu Installer Runbook
│   └── img/                                          # Screenshot gallery & visual UI assets
│
├── install/                                          # Appliance Installation & Fleet Operations
│   ├── 01_CLI_Admin_Toolkit_Reference.md             # Canonical pnet-* CLI tools and operation
│   ├── 02_One_Step_Update_Runbook.md                 # Automated in-band fleet update procedures
│   ├── 03_Release_Ingestion_Engine_Guide.md          # Upstream release ingestion & distribution engine
│   ├── install-master.sh                             # Master Controller node installer
│   ├── install-satellite.sh                          # Satellite Worker compute node installer
│   └── verify-packages.sh                            # SHA256 package verification suite
│
├── Custom-Customization/docs/                        # Pillar 2: Theming, Templates & Identity
│   ├── AI_Lab_Builder_Ollama_Guide.md                # Local Ollama LLM integration via Model Context Protocol
│   ├── 03_Permanent_Session_Never_Logout_Guide.md    # 10-year sliding session configuration
│   └── AzamLabs_Enterprise_Operations_Manual.pdf     # Downloadable PDF operations and architecture reference
│
├── Custom-Features/docs/                             # Pillar 1: Features & Automation
│   ├── Anti_Bootstorm_Engine_Guide.md                # Anti-Bootstorm Staggered Startup Runbook
│   └── 04_Lab_Export_and_APT_Guard_Guide.md          # Multi-folder ZIP export and kernel APT protection
│
└── Custom-Performance/docs/                          # Pillar 3: Ultra-KSM, Dataplane & Hypervisor
    ├── 01_System_Speed_and_Resource_Tuning.md        # Ultra-KSM, PHP OPcache & socket buffers
    ├── 02_High_Density_Cisco_Router_Tuning.md        # Cisco IOL memory C-shim & bootstorm mitigation
    ├── 03_Dataplane_JumboFrames_and_Impairment.md    # MTU 9000 fast-path & packet loss/jitter netem
    ├── 04_Universal_Hypervisor_and_Device_Optimization.md # QEMU headless VRAM & USB polling elimination
    └── Benchmark_AzamLabs_vs_PNETLab_vs_EVENG.md     # Comparative matrix (PNetLab vs EVE-NG Pro)
```

---

### 🚀 1. Installation & Fleet Operations (`install/`)
* **[Local / Offline Installation Guide](LOCAL_INSTALLATION.md)**:
  Hands-off installer runbook for fresh Ubuntu 24.04 / 26.04 LTS servers. Covers Master Controller node setup, Satellite worker compute node enrollment, package SHA256 integrity verification, and pre-bundled offline releases.
* **[CLI Admin Toolkit Reference](../install/01_CLI_Admin_Toolkit_Reference.md)**:
  Comprehensive manual for the first-class `pnet-*` CLI commands (`pnet-update`, `pnet-health`, `pnet-optimizer`, `pnet-backup`, `pnet-audit`, `pnet-cluster`, etc.) located in `/usr/local/bin/`.
* **[One-Step Update & Operations Runbook](../install/02_One_Step_Update_Runbook.md)**:
  Safe in-band updates with automated pre-flight checks, atomic safety snapshots, and 19-stage master/satellite pipelines.
* **[Release Ingestion Engine Guide](../install/03_Release_Ingestion_Engine_Guide.md)**:
  Automated ingestion of upstream PNetLab releases, Tri-Pillar customization application, Debian package repacking, manifest publishing, and fleet push.

---

### 🎨 2. Custom-Customization Subsystem (`Custom-Customization/`)
* **[Custom-Customization Overview](../Custom-Customization/README.md)**:
  Complete guide for theming, branding, templates, and local AI: Futuristic Cyber-Glass login interface, Pure Black OLED dark mode engine, 500+ AMD Zen & Intel CPU-tuned appliance templates, vector branding, Local AI Lab Builder & Ollama MCP integration, and Windows client tools (SecureCRT, Wireshark, SSL trust).
* **[AI Lab Builder & Ollama Integration Guide](../Custom-Customization/docs/AI_Lab_Builder_Ollama_Guide.md)**:
  Step-by-step setup to connect PNetLab with local Ollama LLMs (e.g. `qwen2.5:14b-instruct`) using Model Context Protocol (MCP) over streamable SSE transports.
* **[Permanent Session & "Never-Logout" Guide](../Custom-Customization/docs/03_Permanent_Session_Never_Logout_Guide.md)**:
  How to configure 10-year sliding session persistence and eliminate unexpected web-UI logouts during long simulation runs.
* **[Enterprise Operations Manual (PDF)](../Custom-Customization/docs/AzamLabs_Enterprise_Operations_Manual.pdf)**:
  Standalone PDF manual covering deployment patterns, security policies, backup routines, and hardware sizing recommendations.

---

### ⚡ 3. Custom-Features Subsystem (`Custom-Features/`)
* **[Custom-Features Overview](../Custom-Features/README.md)**:
  Full documentation for functional enhancements: Operations Center modal, Quantum docked multi-tab terminal console, line-speed syntax highlighter, topology Git versioning, config diffing, ping mesh, cloud bridge, and database extensions.
* **[Anti-Bootstorm Staggered Node Startup Guide](../Custom-Features/docs/Anti_Bootstorm_Engine_Guide.md)**:
  Three-tier automated startup orchestration (Heavy, Medium, Light) eliminating 100% vCPU lockups, disk I/O saturation, and OOM panics during mass lab boot.
* **[Lab Export & APT Guard Guide](../Custom-Features/docs/04_Lab_Export_and_APT_Guard_Guide.md)**:
  Configures robust multi-level ZIP packaging and installs APT Guard to protect 32-bit IOL libraries and kernel modules from unwanted upstream overrides.

---

### 🏎️ 4. Custom-Performance Subsystem (`Custom-Performance/`)
* **[Custom-Performance Overview](../Custom-Performance/README.md)**:
  Extreme high-density hypervisor architecture: Ultra-KSM 4KB RAM deduplication C-engine, Cisco IOL memory C-shim (<64MB), Cgroups v2 dynamic resource governor, autonomous CPU frequency scaling, Cat8000v heavy node multi-core optimizer, silicon dataplane fast-path (MTU 9000), and 24/7 watchdog.
* **[System Speed and Resource Tuning](../Custom-Performance/docs/01_System_Speed_and_Resource_Tuning.md)**:
  Four-layer resource optimization: Ultra-KSM 4KB RAM deduplication, 256MB PHP OPcache, Apache Deflate compression, and 16MB socket queues.
* **[High-Density Cisco Router Tuning](../Custom-Performance/docs/02_High_Density_Cisco_Router_Tuning.md)**:
  Reduces Cisco IOL memory footprint below 64 MB per router using a dynamic C-shim, and mitigates bootstorms with 3-tier staggered startups.
* **[Dataplane Jumbo Frames & Impairment](../Custom-Performance/docs/03_Dataplane_JumboFrames_and_Impairment.md)**:
  Silicon dataplane fast-path configuration, MTU 9000 jumbo frames, and symmetric link impairment (delay, jitter, bandwidth loss).
* **[Universal Hypervisor & Virtual Device Optimization](../Custom-Performance/docs/04_Universal_Hypervisor_and_Device_Optimization.md)**:
  QEMU performance architecture eliminating 1000Hz USB tablet spinloops, stripping unneeded VGA framebuffers, and enabling zero-overhead memory merging.
* **[Side-by-Side Architectural Benchmark](../Custom-Performance/docs/Benchmark_AzamLabs_vs_PNETLab_vs_EVENG.md)**:
  Comparative benchmark comparing **PNetLab v8** against stock community PNetLab and commercial EVE-NG Pro across hypervisor density, memory efficiency, bootstorm handling, and protocol latency.
