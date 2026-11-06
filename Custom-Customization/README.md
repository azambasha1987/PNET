# PNetLab Custom-Customization Subsystem

The **`Custom-Customization`** pillar contains platform theming, futuristic Cyber-Glass login interface, 500+ CPU-tuned appliance templates, vector branding, Local AI Lab Builder & Ollama MCP integration, and client workstation integration for **PNetLab v8**.

---

## 🎨 Subsystem Architecture

```
Custom-Customization/
├── apply-customization.sh            # Standalone idempotent deployment hook (+x)
├── README.md                         # This reference manual
├── mcp/                              # Model Context Protocol (MCP) AI Subsystem (Port 5701)
│   ├── pnet-mcp.py                   # Canonical MCP Streamable SSE Server
│   ├── pnet-mcp.service              # Systemd unit for pnetlab-mcp daemon
│   ├── ai_lab_agent.py               # Natural language network topology synthesizer
│   ├── ai_plans.py                   # Multi-vendor configuration provisioning engine
│   ├── ai_efficiency.py              # Lab resource & hypervisor optimizer
│   └── ai_ledger.py                  # Audit & change ledger tracking
├── scripts/                          # Customization, branding, AI & template scripts (25 tools)
│   ├── pnet-ai-copilot.py            # Local Ollama AI terminal copilot & topology builder
│   ├── pnet-fix-export-sort.py       # Natural ascending (0..9, A..Z) export sequence enforcer
│   ├── pnet-setup-ollama.sh          # VM-side Ollama host linker & systemd MCP daemon installer
│   ├── pnet-setup-ollama-host.ps1    # Windows host 1-click Ollama firewall & external bind setup
│   ├── pnet-apply-branding.sh        # Platform branding & favicon installer
│   ├── pnet-deploy-homelogo.sh       # Dynamic avatar logo injector
│   ├── pnet-dark-theme.sh            # Pure Black OLED Dark Theme Engine
│   ├── pnet-disable-logout.sh        # 10-year sliding session persistence
│   ├── pnet-fix-web-credentials.sh   # Canonical web & cluster credentials
│   ├── pnet-update-banner.sh         # Console login dynamic telemetry banner
│   ├── pnet-fix-boot-and-banner.sh   # Ubuntu bootloader & console branding
│   ├── pnet-sync-gui-version.sh      # Web UI release version synchronizer
│   ├── pnet-ssl.sh                   # SSL IP-SAN certificate generator
│   ├── pnet-setup-windows-securecrt.ps1 # 1-Click SecureCRT telnet protocol registration
│   ├── pnet-setup-windows-ssl-trust.ps1 # Windows Root CA & SSL trust generator
│   ├── pnet-cisco-iou-keygen.py      # Cisco IOL license generator
│   ├── pnet-cisco-heavy-node-tuning.cfg # Cisco appliance baseline configuration
│   ├── export-ova.ps1 / export-ova.bat # 1-Click Golden Master OVA appliance exporter
│   ├── pnet-make-standalone-bundle.sh # Standalone offline package bundler
│   ├── pnet-airgap-pack.sh           # Offline air-gap bundle packager
│   └── pnet-generate-manual-pdf.py   # PDF Operations manual compiler
├── login-portal/                     # Futuristic Cyber-Glass Dynamic Login Portal
│   ├── index.html                    # Modern cyber-glass interface with console mode selector
│   ├── login.css                     # Holographic circular avatar & dynamics
│   ├── login.js                      # Smooth authentication controller & error diagnostics
│   ├── version.php                   # Release version endpoint
│   └── img/pnet_home_avatar.png      # Platform branding avatar
├── templates/                        # 500+ Hardware-Tuned Appliance Templates
│   ├── intel/                        # 250+ Intel-optimized QEMU templates (AVX-512, ballooning)
│   └── amd/                          # 250+ AMD Zen-optimized QEMU templates (SVM, TRIM discards)
├── assets/                           # Favicons, vector logos, and marks
│   ├── favicon.ico
│   ├── favicon.png
│   ├── logo.png
│   └── logo-icon.png
├── session-engine/                   # Session persistence engine
│   └── pnet-keepalive.js             # 180s sliding-auth keepalive heartbeat
├── docs/                             # Subsystem Documentation
│   ├── AI_Lab_Builder_Ollama_Guide.md # Local Ollama LLM integration via Model Context Protocol
│   ├── 03_Permanent_Session_Never_Logout_Guide.md # 10-year session persistence guide
│   └── AzamLabs_Enterprise_Operations_Manual.pdf # PDF Enterprise Operations Manual
└── tests/                            # Automated template & theme tests
```

---

## 🤖 Local AI Lab Builder & Ollama MCP Integration

The **Model Context Protocol (MCP)** subsystem integrates local LLMs (e.g., `qwen2.5:14b-instruct`, `llama3.1:8b`) with PNetLab without cloud dependencies or subscription APIs:
- **`pnet-mcp.py`**: Runs a dedicated FastMCP streamable HTTP/SSE server on port `5701` managed by `pnetlab-mcp.service`.
- **`pnet-ai` (`pnet-ai-copilot.py`)**: Terminal AI copilot for natural language network lab generation, multi-vendor node interconnect calculation, and live telemetry querying.
- **`pnet-ollama` (`pnet-setup-ollama.sh`)**: Automated linker that provisions required Python dependencies (`mcp==1.29.1`, `httpx`), sets up token-based bearer authentication in `/opt/unetlab/data/ai/config.json`, and links the host machine's Ollama instance.
- **Full Guide**: See [`docs/AI_Lab_Builder_Ollama_Guide.md`](docs/AI_Lab_Builder_Ollama_Guide.md).

---

## 🚀 Execution & Deployment

Deploy all components in this pillar independently:
```bash
sudo bash /opt/pnet/Custom-Customization/apply-customization.sh
```
Or via the unified master orchestrator:
```bash
sudo bash /opt/pnet/apply-all-custom.sh
```

---

## 🛠️ Canonical CLI Commands Mapped
- `pnet-dark`: Toggles the Pure Black OLED theme engine across Web-UI and lab canvas.
- `pnet-credentials`: Re-asserts canonical admin credentials (`admin / pnet`) across web and database.
- `pnet-ssl`: Generates and binds valid IP-SAN SSL certificates with auto-trust.
- `pnet-templates`: Applies CPU-optimized appliance templates (`intel` vs `amd`).
- `pnet-ai`: Interactive AI terminal copilot & natural language lab topology builder.
- `pnet-ollama`: 1-click linker connecting PNetLab with local/remote Ollama endpoints.
