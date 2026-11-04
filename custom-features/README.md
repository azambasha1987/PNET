# PNetLab Custom Features Suite

The `custom-features/` directory provides enterprise-grade capabilities, high-density appliance templates, modern UI components, and automated hooks that extend pure PNetLab without modifying or breaking the core upstream Debian packages.

---

## ⚡ Key Capabilities & Directory Structure

```
custom-features/
├── apply-custom-features.sh   # Master idempotent execution hook
├── README.md                  # This documentation reference
├── templates/                 # 500+ CPU-tuned QEMU appliance templates
│   ├── intel/                 # Intel-optimized templates (AVX-512, VMX, ballooning)
│   └── amd/                   # AMD-optimized templates (Zen 3/4/5, SVM, TRIM discards)
├── web-ui/                    # Advanced interactive UI components
│   ├── ops-center/            # Docked Multi-Tab Console & CLI Syntax Highlighter
│   └── main/                  # PNet-Features navigation tab & theme engine CSS
├── session-engine/            # Session resilience engine
│   └── pnet-keepalive.js      # 180s sliding-auth heartbeat (prevents timeouts)
├── login-portal/              # Modern futuristic cyber-glass login interface
│   ├── index.html             # Animated dynamic login page
│   ├── login.css              # Cyber-glass design system
│   ├── login.js               # Auto-focus, console mode selector, auth handler
│   └── img/                   # Holographic logo and avatar assets
├── schema/                    # Database migrations and Guacamole tables
│   ├── pnet_features_db.sql   # Cluster hosts, placements, activity logging tables
│   └── guacdb.sql             # Apache Guacamole HTML5 optimization tables
├── assets/                    # Platform favicons, icons, and logos
└── tests/                     # Automated validation and architectural gate tests
```

---

## 🔄 Automatic Re-Application on New Releases

Whenever a new version of PNetLab is installed or updated:
1. **During Initial Setup**:
   - `install/install-master.sh` invokes `apply-custom-features.sh --master`
   - `install/install-satellite.sh` invokes `apply-custom-features.sh --satellite`
2. **During Upstream Upgrades (`pnet-update`)**:
   - `pnet-update` syncs code from the GitHub repository (`azambasha1987/PNET.git`).
   - Automatically detects release pointer updates (`releases/channel-pointer.json`) and installs new `.deb` packages.
   - **Immediately executes `apply-custom-features.sh`** to re-apply templates, UI integrations, keepalive scripts, login portal, database migrations, and CLI tools on top of the freshly installed release.
3. **Manual Re-application**:
   You can manually re-apply all custom features at any time:
   ```bash
   sudo pnet-custom-features
   # or
   sudo bash /opt/pnet/custom-features/apply-custom-features.sh
   ```

---

## 🛠️ Feature Details

### 1. High-Density CPU-Tuned Appliance Templates (`templates/`)
- Over 500 hardware-optimized QEMU appliance templates for routers, switches, firewalls, and cloud appliances.
- Auto-detects CPU architecture (`/proc/cpuinfo` / `lscpu`) to apply `intel` or `amd` profiles with memory ballooning (`virtio-balloon`), headless VGA (`-vga none` / `-vga virtio`), and disk TRIM discards.

### 2. Docked Multi-Tab Console & CLI Syntax Engine (`web-ui/ops-center/`)
- **Docked Console**: Multi-tab embedded terminal drawer inside the active lab canvas, allowing switching between node consoles without popup clutter.
- **CLI Syntax Engine**: Real-time syntax highlighting for Cisco IOS, Arista EOS, Juniper JunOS, and Linux CLI output inside the browser console.
- **Sequenced Console Launcher**: Launches batch node consoles in a staggered sequence to avoid browser throttling.

### 3. Session Engine (`session-engine/pnet-keepalive.js`)
- Sliding-auth heartbeat sent every 180 seconds to `/api/auth` with credentials.
- Completely prevents unexpected session timeouts and logouts during long simulation sessions.

### 4. Cyber-Glass Login Portal (`login-portal/`)
- Clean, responsive login page with console mode selector (Docked vs HTML5 Popup vs Native Putty/SecureCRT).
- Includes connection diagnostic error reporting and default credentials hint.

### 5. Cluster Schema & Guacamole Database (`schema/`)
- Extends `pnetlab_db` with `cluster_hosts`, `cluster_placements`, `node_sessions`, and `activity_log` tables.
- Pre-tunes Guacamole user connection limits for smooth HTML5 rendering.

### 6. Canonical CLI Tooling Integration
- Automatically links all 30 canonical tools into `/usr/local/bin/pnet-*`.
- Removes legacy vendor commands to ensure a clean, unified PNetLab environment.
