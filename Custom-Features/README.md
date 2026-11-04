# PNetLab Custom-Features Subsystem

The **`Custom-Features`** pillar contains all advanced functional enhancements, automation daemons, interactive canvas tooling, and AI integration for **PNetLab v8**.

---

## ⚡ Subsystem Architecture

```
Custom-Features/
├── apply-features.sh                 # Standalone idempotent deployment hook (+x)
├── README.md                         # This reference manual
├── scripts/                          # Feature automation and daemon scripts (24 tools)
│   ├── azambasha-ai-copilot.py       # Local Ollama AI Lab Assistant & MCP server
│   ├── setup-ollama.sh               # Ollama model downloader & runner
│   ├── setup-ollama-host.ps1         # Windows host Ollama bridge
│   ├── azambasha-topology-doc.py     # Automated topology documentation generator
│   ├── azambasha-topology-git.py     # Topology Git versioning & snapshot engine
│   ├── azambasha-config-diff.py      # Device configuration backup, diff & rollback
│   ├── azambasha-ping-mesh.py        # Automated SLA ping mesh & synthetic traffic generator
│   ├── azambasha-cloud-bridge.py     # Real-LAN transit, NAT & WireGuard cloud bridge
│   ├── azambasha-capture-stream.sh   # Live Wireshark streaming & packet capture
│   ├── azambasha-sniffer.py          # TAP interface packet sniffer
│   ├── setup-windows-wireshark.ps1   # Wireshark live remote stream pipe
│   ├── azambasha-scheduler.py        # Lab auto-shutdown & student quota engine
│   ├── azambasha-setup-scheduler.sh  # Systemd timer installer for scheduler
│   ├── azambasha-lab-grader.py       # Automated lab assessment & exam grading
│   ├── azambasha-eve-lab-importer.py # EVE-NG to PNetLab lab archive converter
│   ├── azambasha-fix-export-and-apt.sh # Multi-folder ZIP export engine
│   ├── azambasha-fix-export-sort.py  # Lab export alphabetical sorting
│   ├── azambasha-upload-and-docker-fix.sh # 512MB uploads & Docker CE engine
│   ├── azambasha-ops-api.py          # Operations Center REST API daemon (:8889)
│   ├── azambasha-gui-enhancements.sh # Web UI features registration
│   ├── azambasha-ui-enhancements.sh  # UI enhancements helper
│   ├── prep_frr.sh / config_frr.py   # FRRouting BGP/OSPF lab setup
│   └── vpcs_mux.py                   # VPCS console multiplexer
├── mcp/                              # Model Context Protocol (MCP) AI Subsystem
│   ├── azamlabs-mcp.py               # Local MCP server bridge
│   ├── azamlabs-mcp.service          # MCP server background service
│   ├── ai_lab_agent.py               # Autonomous AI lab architect agent
│   ├── ai_plans.py                   # Automated topology execution plans
│   ├── ai_ledger.py                  # Token usage & interaction ledger
│   └── ai_efficiency.py              # LLM inference metrics
├── web-ui/                           # Interactive Web UI Components
│   ├── ops-center/                   # Docked Console, CLI Syntax Highlighter, Sequenced Launcher
│   │   ├── pnet-docked-console.js    # Multi-tab embedded terminal drawer
│   │   ├── pnet-cli-syntax.js        # Real-time Cisco/Juniper/Arista syntax highlighter
│   │   ├── pnet-sequenced-console.js # Anti-throttling staggered console launcher
│   │   ├── pnet-features.js          # In-canvas ⚡ PNet-Features sidebar modal
│   │   └── index.html                # Operations Center dashboard modal
│   └── main/                         # Main Dashboard integration
│       ├── pnet-features.js          # Top navigation tab hook
│       └── icons.js                  # Extended device & vendor icon definitions
├── schema/                           # Database Schema Migrations & Extensions
│   ├── pnet_features_db.sql          # Cluster hosts, placements, activity logging tables
│   ├── guacdb.sql                    # Apache Guacamole HTML5 optimization tables
│   ├── frr.yml                       # Routing schema definitions
│   └── openbmp.yml                   # BGP Monitoring Protocol schema
├── docs/                             # Subsystem Documentation
│   ├── AI_Lab_Builder_Ollama_Guide.md # Ollama LLM integration runbook
│   └── 04_Lab_Export_and_APT_Guard_Guide.md # Multi-folder export runbook
└── tests/                            # Automated verification test harness
```

---

## 🚀 Execution & Deployment

Deploy all components in this pillar independently:
```bash
sudo bash /opt/pnet/Custom-Features/apply-features.sh
```
Or via the unified master orchestrator:
```bash
sudo bash /opt/pnet/apply-all-custom.sh
```

---

## 🛠️ Canonical CLI Commands Mapped
- `pnet-ai`: Launches the interactive AI copilot connected to local Ollama LLMs.
- `pnet-cloud-bridge`: Manages WireGuard / NAT / Cloud transit bridges.
- `pnet-config-diff`: Snapshots, compares, and rolls back multi-vendor device configurations.
- `pnet-ping-mesh`: Executes automated full-mesh latency and packet loss matrices.
- `pnet-scheduler`: Configures automated lab sleep schedules and student resource quotas.
- `pnet-topology-doc`: Auto-generates Markdown / HTML network topology documentation.
- `pnet-topology-git`: Takes Git snapshots of active topologies with visual diffing.
- `pnet-lab-importer`: Automatically converts EVE-NG `.unl` packages into PNetLab.
