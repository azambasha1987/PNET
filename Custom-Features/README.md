# PNetLab Custom-Features Subsystem

The **`Custom-Features`** pillar contains all advanced functional enhancements, automation daemons, interactive canvas tooling, and AI integration for **PNetLab v8**.

---

## ⚡ Subsystem Architecture

```
Custom-Features/
├── apply-features.sh                 # Standalone idempotent deployment hook (+x)
├── README.md                         # This reference manual
├── scripts/                          # Feature automation and daemon scripts (24 tools)
│   ├── pnet-ai-copilot.py            # Local Ollama AI Lab Assistant & MCP server
│   ├── pnet-setup-ollama.sh          # Ollama model downloader & runner
│   ├── pnet-setup-ollama-host.ps1    # Windows host Ollama bridge
│   ├── pnet-topology-doc.py          # Automated topology documentation generator
│   ├── pnet-topology-git.py          # Topology Git versioning & snapshot engine
│   ├── pnet-config-diff.py           # Device configuration backup, diff & rollback
│   ├── pnet-ping-mesh.py             # Automated SLA ping mesh & synthetic traffic generator
│   ├── pnet-cloud-bridge.py          # Real-LAN transit, NAT & WireGuard cloud bridge
│   ├── pnet-capture-stream.sh        # Live Wireshark streaming & packet capture
│   ├── pnet-sniffer.py               # TAP interface packet sniffer
│   ├── pnet-setup-windows-wireshark.ps1 # Wireshark live remote stream pipe
│   ├── pnet-scheduler.py             # Lab auto-shutdown & student quota engine
│   ├── pnet-setup-scheduler.sh       # Systemd timer installer for scheduler
│   ├── pnet-lab-grader.py            # Automated lab assessment & exam grading
│   ├── pnet-eve-lab-importer.py      # EVE-NG to PNetLab lab archive converter
│   ├── pnet-fix-export-and-apt.sh    # Multi-folder ZIP export engine
│   ├── pnet-fix-export-sort.py       # Lab export alphabetical sorting
│   ├── pnet-upload-and-docker-fix.sh # 512MB uploads & Docker CE engine
│   ├── pnet-ops-api.py               # Operations Center REST API daemon (:8889)
│   ├── pnet-gui-enhancements.sh      # Web UI features registration
│   ├── pnet-ui-enhancements.sh       # UI enhancements helper
│   ├── pnet-prep-frr.sh / pnet-config-frr.py # FRRouting BGP/OSPF lab setup
│   └── pnet-vpcs-mux.py              # VPCS console multiplexer
├── mcp/                              # Model Context Protocol (MCP) AI Subsystem
│   ├── pnet-mcp.py                   # Local MCP server bridge
│   ├── pnet-mcp.service              # MCP server background service
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
