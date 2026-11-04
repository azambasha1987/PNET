# PNetLab Custom-Customization Subsystem

The **`Custom-Customization`** pillar contains platform theming, futuristic Cyber-Glass login interface, 500+ CPU-tuned appliance templates, vector branding, and client workstation integration for **PNetLab v8**.

---

## 🎨 Subsystem Architecture

```
Custom-Customization/
├── apply-customization.sh            # Standalone idempotent deployment hook (+x)
├── README.md                         # This reference manual
├── scripts/                          # Customization, branding & template scripts (22 tools)
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
│   ├── 03_Permanent_Session_Never_Logout_Guide.md # 10-year session persistence guide
│   └── AzamLabs_Enterprise_Operations_Manual.pdf # PDF Enterprise Operations Manual
└── tests/                            # Automated template & theme tests
```

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
