#!/usr/bin/env python3
"""
===============================================================================
build_all_process_docs.py
Generates the complete set of 4 specialized, decoupled engineering documents:
  1. Process Docs/0. Custom Details.docx
  2. Process Docs/1.1. Version Control.docx
  3. Process Docs/1.2 Version Control Testing.docx
  4. Process Docs/2. Offline Install.docx
===============================================================================
"""

import os
import re
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pathlib import Path

PROCESS_DOCS_DIR = Path("Process Docs")
PROCESS_DOCS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Styling Helpers
# ---------------------------------------------------------------------------
def add_title(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(18)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0, 51, 102)

def add_subtitle(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(14)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(11)
    run.font.italic = True
    run.font.color.rgb = RGBColor(90, 90, 90)

def add_toc_heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0, 51, 102)

def add_heading1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0, 51, 102)

def add_heading2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 30, 30)

def add_heading3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(11)
    run.font.bold = True
    run.font.color.rgb = RGBColor(60, 60, 60)

def add_body(doc, text, bold_prefix="", indent_level=0):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    if indent_level > 0:
        p.paragraph_format.left_indent = Inches(0.25 * indent_level)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(11)
        r_pre.font.bold = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(11)

def add_bullet(doc, text, bold_prefix="", indent_level=0):
    p = doc.add_paragraph(style='List Paragraph')
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.left_indent = Inches(0.25 * (indent_level + 1))
    bullet_symbol = "• " if indent_level == 0 else "- "
    r_sym = p.add_run(bullet_symbol)
    r_sym.font.name = "Calibri"
    r_sym.font.size = Pt(11)
    r_sym.font.bold = True
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(11)
        r_pre.font.bold = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(11)

def add_code_block(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Inches(0.35)
    run = p.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(20, 20, 20)

# ---------------------------------------------------------------------------
# 1. BUILD: Process Docs/0. Custom Details.docx
# ---------------------------------------------------------------------------
def build_doc_0():
    print("Generating: Process Docs/0. Custom Details.docx...")
    src_doc_path = PROCESS_DOCS_DIR / "0. Custom Details.docx"
    
    # Read existing paragraphs from 0. Custom Details.docx
    existing_doc = docx.Document(src_doc_path)
    paras = [p.text.strip() for p in existing_doc.paragraphs if p.text.strip()]
    
    doc = docx.Document()
    add_title(doc, "PNET - CUSTOM PILLARS & ARCHITECTURAL SPECIFICATION")
    add_subtitle(doc, "Comprehensive Architectural Reference for Custom-Features, Custom-Customization, and Custom-Performance Subsystems")

    add_toc_heading(doc, "CONTENTS")
    add_bullet(doc, "Custom Features", bold_prefix="1. ")
    feature_names = [
        "Anti-Bootstorm Staggered Node Startup Engine",
        "Topology Git Versioning & Automated Snapshot Engine",
        "Multi-Vendor Configuration Backup, Diff & Rollback",
        "Automated SLA Ping Mesh & Synthetic Traffic Generator",
        "Real-LAN Transit, NAT & WireGuard Cloud Bridge",
        "Lab Auto-Shutdown, Sleep Scheduling & Quota Engine",
        "Multi-Folder ZIP Lab Export & Natural Sorting Engine",
        "Large File Uploads (512MB) & Docker Container Subsystem",
        "Operations Center Web-UI & Docked Interactive Consoles",
        "Dynamic Canvas Viewport & UI Persistence Hook",
        "VPCS Console Multiplexer Engine",
        "Database Schema Extensions & HTML5 Guacamole Acceleration",
        "Standalone Custom-Features Deployment Hook"
    ]
    for idx, fn in enumerate(feature_names, 1):
        add_bullet(doc, f"{idx}. {fn}", indent_level=1)

    add_bullet(doc, "Custom Customization", bold_prefix="2. ")
    customization_names = [
        "CPU-Optimized Appliance Templates (500+ Intel AVX-512 & AMD Zen)",
        "Futuristic Cyber-Glass Login Portal & Console Mode Selector",
        "Pure Black OLED Dark Theme Engine & Vector Branding",
        "Sliding Session Keepalive Heartbeat Engine (10-Year Resilience)",
        "Local AI Lab Builder & Ollama MCP Integration"
    ]
    for idx, cn in enumerate(customization_names, 1):
        add_bullet(doc, f"{idx}. {cn}", indent_level=1)

    add_bullet(doc, "Custom Performance", bold_prefix="3. ")
    performance_names = [
        "Ultra-KSM 4KB RAM Deduplication & C-Engine Memory Merger",
        "Cisco IOL Micro-Footprint Dynamic Memory C-Shim (<64MB)",
        "Dynamic Cgroups v2 Resource Accounting & Memory Ceilings",
        "Autonomous Dynamic CPU Frequency Scaling Governor",
        "Heavy Node Multi-Core Optimizer (Cisco Cat8000v / C8000)",
        "Silicon Dataplane Fast-Path (MTU 9000 Jumbo Frames) & Soft-RoCE",
        "Dynamic Link Quality Impairment & Telemetry Engine (tc netem)",
        "QCOW2 Virtual Disk Health Doctor & Zero-Cluster Reclaimer",
        "24/7 Autonomous Zombie QEMU Watchdog & Node Crash Monitor",
        "Cluster Headroom & Concurrent Node Capacity Calculator",
        "Modern Netplan v2 Generator & Permanent Management Anchoring",
        "Automated Dry-Run Test & Validation Suite (10-Probe Health Check)",
        "Standalone Custom-Performance Deployment Hook"
    ]
    for idx, pn in enumerate(performance_names, 1):
        add_bullet(doc, f"{idx}. {pn}", indent_level=1)

    # Now parse the actual body entries from existing text and write them with unified numbering
    # Find start of features in paras
    feat_start = -1
    for i, t in enumerate(paras):
        if "CUSTOM FEATURES" in t:
            feat_start = i
            break

    if feat_start != -1:
        body_paras = paras[feat_start:]
        current_section = ""
        for p_text in body_paras:
            if "CUSTOM FEATURES" in p_text:
                add_heading1(doc, "1. CUSTOM FEATURES")
                current_section = "1"
            elif "CUSTOM CUSTOMIZATION" in p_text:
                add_heading1(doc, "2. CUSTOM CUSTOMIZATION")
                current_section = "2"
            elif "CUSTOM PERFORMANCE" in p_text:
                add_heading1(doc, "3. CUSTOM PERFORMANCE")
                current_section = "3"
            elif re.match(r'^[234]\.\d+\s+', p_text):
                # Subheading: renumber based on current section
                match = re.match(r'^[234]\.(\d+)\s+(.*)', p_text)
                sub_num = match.group(1)
                sub_title = match.group(2)
                add_heading2(doc, f"{current_section}.{sub_num} {sub_title}")
            elif p_text.startswith("• Engine / Script:"):
                add_bullet(doc, p_text.replace("• Engine / Script:", "").strip(), bold_prefix="Engine / Script: ")
            elif p_text.startswith("• Target Path:"):
                add_bullet(doc, p_text.replace("• Target Path:", "").strip(), bold_prefix="Target Path: ")
            elif p_text.startswith("• Description:"):
                add_bullet(doc, p_text.replace("• Description:", "").strip(), bold_prefix="Description: ")
            elif p_text.startswith("• Release Ingestion:"):
                add_bullet(doc, p_text.replace("• Release Ingestion:", "").strip(), bold_prefix="Release Ingestion: ")
            elif p_text.startswith("• Verification:"):
                add_bullet(doc, p_text.replace("• Verification:", "").strip(), bold_prefix="Verification: ")
            else:
                add_body(doc, p_text)

    dest = PROCESS_DOCS_DIR / "0. Custom Details.docx"
    doc.save(dest)
    print(f"Saved: {dest}")

# ---------------------------------------------------------------------------
# 2. BUILD: Process Docs/1.1. Version Control.docx
# ---------------------------------------------------------------------------
def build_doc_1_1():
    print("Generating: Process Docs/1.1. Version Control.docx...")
    doc = docx.Document()
    add_title(doc, "PNET - RELEASE INGESTION, HARDENING & VERSION CONTROL PIPELINE")
    add_subtitle(doc, "Standard Operating Procedure for Ingesting Upstream Releases, Changelog Auditing, Injecting Tri-Pillar Customizations, Automated Dry-Testing, and Fleet Deployment")

    add_toc_heading(doc, "CONTENTS")
    add_bullet(doc, "1. Architecture & Release Pipeline Philosophy")
    add_bullet(doc, "2. Upstream Release Ingestion Architecture (releases/<version>/)")
    add_bullet(doc, "3. Step-by-Step Operator Workflow (When New Upstream Version Is Available)")
    add_bullet(doc, "3.1 Turnkey AI Assistant Trigger Prompt", indent_level=1)
    add_bullet(doc, "3.2 Turnkey CLI Ingestion Command", indent_level=1)
    add_bullet(doc, "3.3 Step 1: Upstream Release Ingestion & Staging", indent_level=1)
    add_bullet(doc, "3.4 Step 1b: Upstream Changelog Harvester & Semantic Collision Radar", indent_level=1)
    add_bullet(doc, "3.5 Step 2: Tri-Pillar Customization & Hardening Injection", indent_level=1)
    add_bullet(doc, "3.6 Step 3: Debian Repacking, Manifest Generation & Signing", indent_level=1)
    add_bullet(doc, "3.7 Step 4: Code-Level Automated Dry Tests (Gatekeeper)", indent_level=1)
    add_bullet(doc, "3.8 Step 5: User Manual Live VM Deployment (sudo pnet-update)", indent_level=1)
    add_bullet(doc, "4. Upstream Changelog Ingestion & Automated Repository Ledger (CHANGELOG.md)")
    add_bullet(doc, "4.1 Automated Extraction from Staged Debian Packages", indent_level=1)
    add_bullet(doc, "4.2 Semantic Collision Matrix (Protected Core & Subsystem Shield)", indent_level=1)
    add_bullet(doc, "4.3 Automated Dual-Layer Entry Generation in CHANGELOG.md", indent_level=1)
    add_bullet(doc, "5. Process for Injecting Custom-Features into Upstream Releases")
    add_bullet(doc, "6. Process for Injecting Custom-Performance & C-Shims into Upstream Releases")
    add_bullet(doc, "7. Process for Injecting Custom-Customization into Upstream Releases")
    add_bullet(doc, "8. Cumulative Bugfix & Efficiency Guard Registry")
    add_bullet(doc, "9. Single-Command Fleet Distribution & Rollback Safeguards")

    add_heading1(doc, "1. ARCHITECTURE & RELEASE PIPELINE PHILOSOPHY")
    add_body(doc, "The PNetLab release engineering architecture enforces two foundational principles:")
    add_bullet(doc, "100% Upstream Parity: When upstream PNetLab publishes a weekly update, every single upstream bugfix, template, PHP controller, and asset is captured cleanly without omissions.", bold_prefix="Principle 1 — ")
    add_bullet(doc, "100% Custom Preservation: All enterprise enhancements (Ultra-KSM 4KB C-shims, Cgroups v2 ceilings, Cyber-Glass login, docked interactive consoles, and cumulative historical bugfixes) are automatically overlaid on top of the upstream base.", bold_prefix="Principle 2 — ")
    add_body(doc, "Under this decoupled architecture, administrators never perform manual code merges or fragile in-place copy-pasting. The automated Release Ingestion Engine handles staging, changelog harvesting, semantic collision detection, C-compilation, packaging, manifest signing, and dry-run testing autonomously.")

    add_heading1(doc, "2. UPSTREAM RELEASE INGESTION ARCHITECTURE (releases/<version>/)")
    add_body(doc, "When a new upstream release is published, packages are staged into the authoritative repository hierarchy under releases/<version>/:")
    add_bullet(doc, "releases/<version>/debs/ — Houses raw and repacked Debian binary archives (pnetlab_<version>_amd64.deb, pnetlab-satellite_<version>_amd64.deb, and dependency packages).")
    add_bullet(doc, "releases/<version>/assets/ — Houses core asset bundles (pnetlab-core-assets-<version>.tar.zst) and branding archives.")
    add_bullet(doc, "releases/<version>/scripts/ — Houses runtime scripts, satellite join scripts, and network installation entrypoints.")
    add_bullet(doc, "releases/<version>/manifests/ — Houses authoritative cryptographic manifests (pnetlab-<version>-manifest.json) containing SHA256 hashes, file size ledgers, and upstream-changelog.txt.")
    add_bullet(doc, "releases/channel-pointer.json — The global pointer directing all Live VMs to the current production release version.")

    add_heading1(doc, "3. STEP-BY-STEP OPERATOR WORKFLOW (WHEN NEW UPSTREAM VERSION IS AVAILABLE)")
    add_body(doc, "Whenever upstream PNetLab releases a new version, operators execute the following streamlined workflow:")

    add_heading2(doc, "3.1 Turnkey AI Assistant Trigger Prompt")
    add_body(doc, "When working with the AI coding assistant, copy and paste the following canonical prompt:")
    add_code_block(doc, '"New upstream PNetLab release <VERSION> is available. Please ingest the upstream packages into releases/<VERSION>/, audit upstream changelog for subsystem collisions, apply the Tri-Pillar customizations (Custom-Performance, Custom-Features, Custom-Customization), compile native C-shims, repack the Debian packages with SHA256 manifests, run full code-level dry-tests, and prepare the release for live VM deployment via sudo pnet-update."')

    add_heading2(doc, "3.2 Turnkey CLI Ingestion Command")
    add_body(doc, "Alternatively, operators can execute the complete end-to-end pipeline in a single terminal command:")
    add_code_block(doc, "python scripts/pnet-release-ingestion-engine.py pipeline --version <VERSION>\n\n# Or with a local directory containing downloaded upstream debs:\npython scripts/pnet-release-ingestion-engine.py pipeline --version <VERSION> --source-dir /path/to/debs")

    add_heading2(doc, "3.3 Step 1: Upstream Release Ingestion & Staging")
    add_bullet(doc, "Engine / Script: scripts/pnet-release-ingestion-engine.py / scripts/pnet-ingest-release.sh", bold_prefix="Tooling: ")
    add_bullet(doc, "Action: Automatically downloads or imports upstream Debian binary packages (pnetlab_<version>_amd64.deb and pnetlab-satellite_<version>_amd64.deb), staging them into releases/<version>/debs/, assets into releases/<version>/assets/, and scripts into releases/<version>/scripts/.", bold_prefix="Execution: ")

    add_heading2(doc, "3.4 Step 1b: Upstream Changelog Harvester & Semantic Collision Radar")
    add_bullet(doc, "Engine / Script: scripts/pnet-release-ingestion-engine.py (ingest_upstream_changelog)", bold_prefix="Tooling: ")
    add_bullet(doc, "Action: Extracts the upstream changelog from staged Debian packages (or upstream-changelog.txt) and parses the release notes. Evaluates modified upstream components against our protected Tri-Pillar zones using keyword and pattern matching.", bold_prefix="Execution: ")
    add_bullet(doc, "Outcome: Automatically alerts operator to any overlapping modifications (e.g., login styling, templates, folder exports) and stages the raw changelog into releases/<version>/manifests/upstream-changelog.txt.", bold_prefix="Output: ")

    add_heading2(doc, "3.5 Step 2: Tri-Pillar Customization & Hardening Injection")
    add_body(doc, "The engine unpacks the upstream Debian archives in an isolated staging workspace and automatically injects all three modular pillars:")
    add_bullet(doc, "Custom-Performance: Compiles Ultra-KSM 4KB RAM deduplication C-shims (pnet-iol-shim.c, pnet-ksm-merge-exec.c) with gcc -O3, injects Cgroups v2 memory limits (pnetlab.slice), dynamic CPU frequency governor, heavy node optimizer, MTU 9000 dataplane, and 24/7 watchdog.", bold_prefix="Pillar 1: ")
    add_bullet(doc, "Custom-Features: Overlays Operations Center web-UI modal, docked multi-tab terminal drawer, syntax highlighter, topology Git versioning, config diffing, SLA ping mesh, cloud bridge, scheduler, and MariaDB schema migrations (pnet_features_db.sql, guacdb.sql).", bold_prefix="Pillar 2: ")
    add_bullet(doc, "Custom-Customization: Injects 528 CPU-optimized appliance templates (Intel AVX-512 & AMD Zen), overlays Futuristic Cyber-Glass login portal & branding avatars, applies Pure Black OLED dark theme, configures 10-year sliding session keepalive, and integrates Local AI / Ollama MCP copilot.", bold_prefix="Pillar 3: ")

    add_heading2(doc, "3.6 Step 3: Debian Repacking, Manifest Generation & Signing")
    add_bullet(doc, "Repacks the hardened tree into production Debian packages using bsdtar --zstd compression (pure-Python cross-platform fallback supported).")
    add_bullet(doc, "Computes authoritative SHA256 checksums for every deb, asset, and script.")
    add_bullet(doc, "Generates official release manifest (releases/<version>/manifests/pnetlab-<version>-manifest.json).")
    add_bullet(doc, "Updates releases/channel-pointer.json and VERSION to point to the new release version.")

    add_heading2(doc, "3.7 Step 4: Code-Level Automated Dry Tests (Gatekeeper)")
    add_body(doc, "Prior to any live fleet deployment, automated dry tests must pass 100% cleanly:")
    add_code_block(doc, "# 1. Run 10-Probe Architectural Health Suite:\npython Custom-Performance/scripts/pnet-dry-test.py\n\n# 2. Run Complete Subsystem Unit Test Suite:\npython -m unittest discover tests")
    add_body(doc, "All 10/10 probes and all 50 unit test cases must pass. If any check fails, packaging is aborted.")

    add_heading2(doc, "3.8 Step 5: User Manual Live VM Deployment (sudo pnet-update)")
    add_body(doc, "The operator connects to the Live VMs (Master Controller and Satellite Workers) and triggers the single canonical update command:")
    add_code_block(doc, "sudo pnet-update")
    add_body(doc, "The update engine takes an atomic safety snapshot, downloads the new hardened package from the local/remote channel pointer, installs the package, runs non-destructive database migrations, registers CLI binaries in /usr/local/bin/, and hot-reloads services with zero simulation interruption.")

    add_heading1(doc, "4. UPSTREAM CHANGELOG INGESTION & AUTOMATED REPOSITORY LEDGER (CHANGELOG.md)")
    add_body(doc, "The changelog integration pipeline turns human-readable upstream release notes into actionable intelligence and automated repository documentation:")

    add_heading2(doc, "4.1 Automated Extraction from Staged Debian Packages")
    add_body(doc, "During the ingestion stage, the engine automatically extracts usr/share/doc/pnetlab/changelog.Debian.gz or parses release metadata. It extracts entries corresponding to the new version and saves them to releases/<version>/manifests/upstream-changelog.txt.")

    add_heading2(doc, "4.2 Semantic Collision Matrix (Protected Core & Subsystem Shield)")
    add_body(doc, "The engine scans extracted changelog entries against our protected architectural zones:")
    add_bullet(doc, "Login / Theming Keywords ('login', 'theme', 'avatar', 'css'): Automatically flags web login changes, ensuring our Cyber-Glass portal and Pure Black OLED theme are preserved and re-anchored.", bold_prefix="Shield 1 — ")
    add_bullet(doc, "Folder & Export Keywords ('export', 'folder', 'sort', 'svelte', 'labs'): Automatically flags export logic changes, verifying our Natural Ascending Sort (0..9, A..Z) patch is re-applied cleanly.", bold_prefix="Shield 2 — ")
    add_bullet(doc, "Appliance Template Keywords ('template', 'qemu', 'cpu', 'intel', 'amd'): Automatically imports new upstream vendor templates additively, without overwriting existing AVX-512 and AMD Zen acceleration flags.", bold_prefix="Shield 3 — ")
    add_bullet(doc, "Cisco IOL & Memory Keywords ('iol', 'wrapper', 'memory', 'ram', 'ksm'): Automatically verifies that our Ultra-KSM C-shim (<64MB RAM) remains compiled and active in /usr/local/bin/.", bold_prefix="Shield 4 — ")
    add_bullet(doc, "Kernel Bridge Keywords ('bridge', 'pnet', 'network'): Automatically asserts that bridges pnet0 through pnet9 remain untouched, maintaining 100% lab topology portability.", bold_prefix="Shield 5 — ")

    add_heading2(doc, "4.3 Automated Dual-Layer Entry Generation in CHANGELOG.md")
    add_body(doc, "The engine automatically updates the authoritative CHANGELOG.md in the root of the repository, creating a dual-layer ledger for every version:")
    add_bullet(doc, "Layer 1: Upstream Features & Fixes (100% Ingested) — Lists all upstream enhancements and bugfixes.", bold_prefix="Layer 1: ")
    add_bullet(doc, "Layer 2: Tri-Pillar Hardening & Enterprise Enhancements — Lists Ultra-KSM status, Cgroups v2 ceilings, Cyber-Glass login, docked consoles, and cumulative bugfixes.", bold_prefix="Layer 2: ")
    add_bullet(doc, "Layer 3: Semantic Collision Radar Ledger — Records all verified protection shields applied during the build.", bold_prefix="Layer 3: ")

    add_heading1(doc, "5. PROCESS FOR INJECTING CUSTOM-FEATURES INTO UPSTREAM RELEASES")
    add_body(doc, "The release ingestion engine automatically unpacks the upstream debian archive and injects:")
    add_bullet(doc, "Web-UI & Operations Center: Overlays Custom-Features/web-ui/main/ into opt/unetlab/html/main/ (canvas hooks, icons) and Custom-Features/web-ui/ops-center/ into opt/unetlab/html/ops-center/ (Docked Terminal Drawer, CLI Syntax Highlighter, Sequenced Console Launcher).")
    add_bullet(doc, "Feature Daemons: Overlays all automation scripts from Custom-Features/scripts/ into opt/unetlab/scripts/ with 0755 executable permissions and links them to canonical /usr/local/bin/ commands.")
    add_bullet(doc, "Database Schema Migrations: Packages schema updates from Custom-Features/schema/ (pnet_features_db.sql and guacdb.sql) into package control postinst with IF NOT EXISTS safeguards.")
    add_bullet(doc, "Service Units: Configures systemd units (pnet-ops-api.service on port 8889, pnet-scheduler.timer) for automatic background enablement.")

    add_heading1(doc, "6. PROCESS FOR INJECTING CUSTOM-PERFORMANCE INTO UPSTREAM RELEASES")
    add_body(doc, "The Custom-Performance pillar hardens the hypervisor virtualization layer during packaging:")
    add_bullet(doc, "Native C-Shims: Compiles pnet-ksm-merge-exec.c and pnet-iol-shim.c with gcc -O3 optimization flags, packaging the compiled binaries into /usr/local/bin/ and /usr/local/lib/ for instantaneous execution.")
    add_bullet(doc, "Sysctl & Kernel Tunings: Stages hypervisor kernel configurations (/etc/sysctl.d/99-pnet-speed.conf) establishing 4KB Ultra-KSM scanning, 256MB PHP OPcache memory buffers, Apache Deflate compression, and 16MB network socket queues.")
    add_bullet(doc, "Cgroups v2 & Governor: Deploys pnetlab.slice, pnet-cpu-governor.service, and pnet-heavy-optimizer.service to autonomously scale vCPU frequency profiles and manage node execution affinities.")
    add_bullet(doc, "Dataplane Fast-Path: Packages MTU 9000 jumbo frame scripts, Soft-RoCE RXE kernel module controllers, and bridge optimization routines.")
    add_bullet(doc, "Air-Gapped Watchdog: Injects 24/7 autonomous watchdog scripts (pnet-watchdog.py) monitoring QEMU zombie processes, hung virtual instances, and kernel memory pressure.")

    add_heading1(doc, "7. PROCESS FOR INJECTING CUSTOM-CUSTOMIZATION INTO UPSTREAM RELEASES")
    add_body(doc, "The Custom-Customization pillar provides enterprise branding and hardware-specific optimizations:")
    add_bullet(doc, "528 CPU Templates: Injects Intel AVX-512 and AMD Zen appliance templates into opt/unetlab/html/templates/ with mem-merge=on deduplication flags.")
    add_bullet(doc, "Cyber-Glass Portal: Replaces stock login with dynamic holographic glass styling, circular avatar branding, and HTML5 console mode selectors.")
    add_bullet(doc, "OLED Dark Theme: Injects pure black zero-glare styling across web UI, terminal, and SVG canvas.")
    add_bullet(doc, "Sliding Session Keepalive: Injects 180-second heartbeat script into HTML headers, extending PHP session lifetimes to 10 years (315,360,000s) to eliminate simulation dropouts.")

    add_heading1(doc, "8. CUMULATIVE BUGFIX & EFFICIENCY GUARD REGISTRY")
    add_body(doc, "All historical bugs caught and resolved in prior releases are permanently cataloged and applied automatically during ingestion:")
    add_bullet(doc, "Natural Ascending Sort: Enforces 0..9, A..Z natural alphanumeric sorting across api_folders.php, labs.js, and modern Svelte islands (labs-workspace*.js).")
    add_bullet(doc, "512MB File Uploads: Adjusts PHP upload_max_filesize and post_max_size and Nginx client_max_body_size thresholds.")
    add_bullet(doc, "Kernel Bridge Invariants: Audits code to guarantee bridges pnet0 through pnet9 are preserved with zero destructive renaming.")
    add_bullet(doc, "Multi-Session PHP Token Pooling: Prevents single-user forced logouts across simultaneous browser tabs.")

    add_heading1(doc, "9. SINGLE-COMMAND FLEET DISTRIBUTION & ROLLBACK SAFEGUARDS")
    add_body(doc, "Deploying updates to live hypervisors is completely turnkey:")
    add_code_block(doc, "# Auto-detect node role and upgrade:\nsudo pnet-update\n\n# Explicit Master upgrade:\nsudo pnet-update --master\n\n# Explicit Satellite upgrade:\nsudo pnet-update --satellite\n\n# Instant rollback to previous checkpoint if needed:\nsudo pnet-update --rollback")
    add_body(doc, "The rollback engine restores system configs, database tables, and binaries in under 15 seconds, guaranteeing zero hypervisor corruption.")

    dest = PROCESS_DOCS_DIR / "1.1. Version Control.docx"
    doc.save(dest)
    print(f"Saved: {dest}")


def build_doc_1_2():
    print("Generating: Process Docs/1.2 Version Control Testing.docx...")
    doc = docx.Document()
    add_title(doc, "PNET - LIVE VM & MULTI-NODE CLUSTER VERIFICATION PROTOCOL")
    add_subtitle(doc, "Standard Operating Procedure for Post-Update Live Testing, Performance Assertions, DOM Verification, Screenshot Cataloging, and Hotfix Logging")

    add_toc_heading(doc, "CONTENTS")
    add_bullet(doc, "1. Live VM Verification Philosophy & Quality Gates")
    add_bullet(doc, "2. Post-Update Verification Trigger (Canonical Prompt)")
    add_bullet(doc, "3. Standalone Master Node Test Labs (Labs 1, 2, 3)")
    add_bullet(doc, "3.1 Lab 1: Custom Performance (IOSv & C8000v KSM Assertions)", indent_level=1)
    add_bullet(doc, "3.2 Lab 2: Custom Features (Operations Center, Docked Consoles, Ping Mesh)", indent_level=1)
    add_bullet(doc, "3.3 Lab 3: Custom Customization (Cyber-Glass, OLED Themes, Keepalive)", indent_level=1)
    add_bullet(doc, "4. Multi-Node Satellite Cluster Live VM Verification Protocol")
    add_bullet(doc, "4.1 Canonical Multi-Node Cluster Prompt", indent_level=1)
    add_bullet(doc, "4.2 Cluster Daemon & Host Reachability Verification (/run/pnetlab/broker.sock)", indent_level=1)
    add_bullet(doc, "4.3 Dual Performance Verification: Lab 1.1 (Master) & Lab 1.2 (Satellite)", indent_level=1)
    add_bullet(doc, "4.4 Dual Features Verification: Lab 2.1 (Master) & Lab 2.2 (Satellite)", indent_level=1)
    add_bullet(doc, "4.5 Dual Customization Verification: Lab 3.1 (Master) & Lab 3.2 (Satellite)", indent_level=1)
    add_bullet(doc, "5. Screenshot & Evidence Capture Standards")
    add_bullet(doc, "5.1 Desktop Directory Organization", indent_level=1)
    add_bullet(doc, "5.2 Live JSON Metric Assertion Evidence", indent_level=1)
    add_bullet(doc, "6. Issue Resolution, Hotfix & Regression Ledger (Version-process/)")

    add_heading1(doc, "1. LIVE VM VERIFICATION PHILOSOPHY & QUALITY GATES")
    add_body(doc, "The Live VM Verification Protocol provides empirical, indisputable proof that an update was deployed successfully without degrading hypervisor throughput or breaking enterprise user features:")
    add_bullet(doc, "Zero Simulated Evidence: Strictly zero Pillow-drawn, mock, or fake screenshots. All captures must originate from live Chromium browser instances and live terminal sessions.", bold_prefix="Gate 1 — ")
    add_bullet(doc, "Hard Programmatic Assertions: Performance metrics must meet non-negotiable kernel thresholds (Ultra-KSM memory deduplication >= 1.6 GB RAM saved, IOL idle CPU < 2%).", bold_prefix="Gate 2 — ")
    add_bullet(doc, "End-to-End DOM Validation: All custom Web-UI elements (Operations Center, docked terminal drawer, Cyber-Glass login) must render and respond to interaction.", bold_prefix="Gate 3 — ")

    add_heading1(doc, "2. POST-UPDATE VERIFICATION TRIGGER (CANONICAL PROMPT)")
    add_body(doc, "After executing sudo pnet-update on the Live VM, the operator triggers verification using the following prompt:")
    add_code_block(doc, '"The release update \'sudo pnet-update\' has been completed on the Live VM. Please initiate the Live VM verification protocol: execute test labs for \'Custom Performance\' (IOSv, C8000v), \'Custom Features\' (Operations Center, docked consoles, ping mesh), and \'Custom Customization\' (Cyber-Glass portal, keepalive, themes), capture and organize verification screenshots into their respective Desktop folders, and log any findings or fixes into the Version-process/ directory."')

    add_heading1(doc, "3. STANDALONE MASTER NODE TEST LABS (LABS 1, 2, 3)")

    add_heading2(doc, "3.1 Lab 1: Custom Performance (IOSv & C8000v KSM Assertions)")
    add_bullet(doc, "Test Appliances: Boot 2x Cisco IOL (x86_64_crb_linux), 2x Cisco IOSv (vios-15.9.3-M12), and 2x Cisco Catalyst 8000v (c8000v-17.18.02, 4096MB RAM).")
    add_bullet(doc, "PID Verification: Confirm all 6 virtual node processes are active via ps aux | grep -E '(iol_wrapper|qemu-system-x86_64)'.")
    add_bullet(doc, "Hard Assertion: Read /sys/kernel/mm/ksm/pages_sharing and assert pages_sharing >= 400,000 (>= 1.6 GB host RAM deduplicated across identical image pages).")
    add_bullet(doc, "CPU Assertion: Confirm settled idle CPU utilization on Cisco IOL nodes remains < 2%.")
    add_bullet(doc, "Screenshot Capture: Save full desktop verification capture into Desktop/Custom Performance Test/.")

    add_heading2(doc, "3.2 Lab 2: Custom Features (Operations Center, Docked Consoles, Ping Mesh)")
    add_bullet(doc, "Docked Multi-Tab Console: Open docked bottom terminal drawer, connect to virtual nodes, and verify multi-tab session switching.")
    add_bullet(doc, "CLI Syntax Highlighting: Execute show ip int brief and show version; verify Cisco IOS syntax highlighting is dynamically applied.")
    add_bullet(doc, "Operations Center Modal: Open in-canvas Operations modal (port 8889), inspect live system telemetry HUD, and verify cluster health doctor.")
    add_bullet(doc, "SLA Ping Mesh: Trigger full-mesh synthetic ping test and confirm latency/jitter matrix renders cleanly.")
    add_bullet(doc, "Screenshot Capture: Save verification captures into Desktop/Custom Features Test/.")

    add_heading2(doc, "3.3 Lab 3: Custom Customization (Cyber-Glass, OLED Themes, Keepalive)")
    add_bullet(doc, "Cyber-Glass Portal: Load https://<MASTER_IP>/login/; verify holographic glass styling, animated branding avatar, and console mode selector.")
    add_bullet(doc, "Pure Black OLED Theme: Verify active theme applies pure black (#000000) styling to sidebar, header, and canvas background.")
    add_bullet(doc, "Session Keepalive: Inspect browser console and verify window.__azamKeepaliveActive heartbeat pulses every 180 seconds.")
    add_bullet(doc, "Screenshot Capture: Save verification captures into Desktop/Custom Customization Test/.")

    add_heading1(doc, "4. MULTI-NODE SATELLITE CLUSTER LIVE VM VERIFICATION PROTOCOL")

    add_heading2(doc, "4.1 Canonical Multi-Node Cluster Prompt")
    add_body(doc, "When verifying clustered satellite compute nodes, operators use the following prompt:")
    add_code_block(doc, '"Satellite worker node clustering has been successfully completed. Please initiate the Multi-Node Cluster Live VM verification protocol using programmatic assertions and real live captures (strictly zero simulated/Pillow-drawn images):\\n'
                   '1. Cluster Daemon & Host Reachability Verification (broker.sock, TLS 9050, bridges pnet0-pnet9).\\n'
                   '2. Dual Verification Test Labs (Performance Master vs SAT, Features Master vs SAT, Customization Master vs SAT).\\n'
                   '3. Capture screenshots to Desktop/\'Custom * Test-Master\' and Desktop/\'Custom * Test-SAT\' and log evidence into Version-process/."')

    add_heading2(doc, "4.2 Cluster Daemon & Host Reachability Verification")
    add_bullet(doc, "Query /run/pnetlab/broker.sock on Master using verb cluster_call (verb: sysinfo, host: 1). Confirm live JSON response from Satellite daemon (pnet-satd on TLS 9050) returning remote cores and total RAM.")
    add_bullet(doc, "Verify active systemd status for pnetlab-brokerd, pnet-ops-api, and virtual bridges pnet0 through pnet9.")

    add_heading2(doc, "4.3 Dual Performance Verification (Master vs SAT)")
    add_bullet(doc, "Lab 1.1 (Performance - Master): Boot 2x IOL, 2x IOSv, 2x C8000v. Assert /sys/kernel/mm/ksm/pages_sharing >= 400,000 pages (>= 1.6 GB deduplicated). Save screenshots to Desktop/Custom Performance Test-Master/.", bold_prefix="Master: ")
    add_bullet(doc, "Lab 1.2 (Performance - SAT): Sync x86_64_crb_linux and c8000v images to Satellite Host ID 1. Dispatch and boot 2x IOL and 2x C8000v on Satellite. Assert broker query returns counts: {iol: 2, qemu: 2}. Save screenshots to Desktop/Custom Performance Test-SAT/.", bold_prefix="Satellite: ")

    add_heading2(doc, "4.4 Dual Features Verification (Master vs SAT)")
    add_bullet(doc, "Lab 2.1 (Features - Master): Log into Master Web UI. Assert DOM elements a[data-route=\"pnet-features\"] and .pnet-features-container render. Save captures of Operations Center, Cluster Health Doctor, and Cloud Transit Bridge to Desktop/Custom Features Test-Master/.", bold_prefix="Master: ")
    add_bullet(doc, "Lab 2.2 (Features - SAT): In Operations Center, verify Satellite Host ID 1 telemetry card, remote node count, and inter-node latency probe (avg < 2ms). Save screenshots to Desktop/Custom Features Test-SAT/.", bold_prefix="Satellite: ")

    add_heading2(doc, "4.5 Dual Customization Verification (Master vs SAT)")
    add_bullet(doc, "Lab 3.1 (Customization - Master): Assert DOM elements for Cyber-Glass portal, OLED theme, and sliding session keepalive. Save captures to Desktop/Custom Customization Test-Master/.", bold_prefix="Master: ")
    add_bullet(doc, "Lab 3.2 (Customization - SAT): Verify Satellite appliance template synchronization and CPU flavor passthrough (+invtsc, EPYC/Ryzen flags). Save captures to Desktop/Custom Customization Test-SAT/.", bold_prefix="Satellite: ")

    add_heading1(doc, "5. SCREENSHOT & EVIDENCE CAPTURE STANDARDS")
    add_body(doc, "All screenshots must be organized systematically on the operator's Desktop:")
    add_bullet(doc, "Desktop/Custom Performance Test/ (or -Master / -SAT for clusters)")
    add_bullet(doc, "Desktop/Custom Features Test/ (or -Master / -SAT for clusters)")
    add_bullet(doc, "Desktop/Custom Customization Test/ (or -Master / -SAT for clusters)")
    add_body(doc, "Metric evidence is stored in JSON format within Version-process/evidence/ (e.g. step1_daemon_reachability.json, lab1_1_performance_master.json).")

    add_heading1(doc, "6. ISSUE RESOLUTION, HOTFIX & REGRESSION LEDGER (Version-process/)")
    add_body(doc, "If any bug or regression is detected during verification, engineers follow the 5-step resolution loop:")
    add_bullet(doc, "Log: Record issue details, symptoms, and failure logs in Version-process/v<VERSION>_live_test_report.md under Section 5.", bold_prefix="Step 1 — ")
    add_bullet(doc, "Fix: Implement root-cause fix directly in the codebase (Custom-Features/, Custom-Customization/, or Custom-Performance/).", bold_prefix="Step 2 — ")
    add_bullet(doc, "Dry-Test: Re-execute python Custom-Performance/scripts/pnet-dry-test.py and unittest discovery until 100% pass.", bold_prefix="Step 3 — ")
    add_bullet(doc, "Repack: Re-execute the release engine to repack the Debian packages and update SHA256 checksums.", bold_prefix="Step 4 — ")
    add_bullet(doc, "Re-verify: Deploy to Live VM via sudo pnet-update, confirm resolution, and mark [RESOLVED] with screenshot attached.", bold_prefix="Step 5 — ")

    dest = PROCESS_DOCS_DIR / "1.2 Version Control Testing.docx"
    doc.save(dest)
    print(f"Saved: {dest}")

# ---------------------------------------------------------------------------
# 4. BUILD: Process Docs/2. Offline Install.docx
# ---------------------------------------------------------------------------
def build_doc_2():
    print("Generating: Process Docs/2. Offline Install.docx...")
    doc = docx.Document()
    add_title(doc, "PNET - OFFLINE INSTALLATION & AIR-GAPPED DEPLOYMENT GUIDE")
    add_subtitle(doc, "Standard Operating Procedure for Packaging, Transferring, and Installing PNetLab on Standalone Master and Satellite Nodes in Air-Gapped Environments")

    add_toc_heading(doc, "CONTENTS")
    add_bullet(doc, "1. Offline & Air-Gapped Deployment Architecture")
    add_bullet(doc, "2. How to Zip from Local Git Folder for Offline Deployment")
    add_bullet(doc, "2.1 What to Zip & What to Exclude", indent_level=1)
    add_bullet(doc, "2.2 Essential Subfolders and Files Checklist", indent_level=1)
    add_bullet(doc, "2.3 CLI Zipping Commands (PowerShell & Linux)", indent_level=1)
    add_bullet(doc, "3. Target Extraction on Live VM (/opt/PNET & /opt/pnet)")
    add_bullet(doc, "4. Prerequisites & System Requirements (OS, Virtualization, Sudo)")
    add_bullet(doc, "5. Standalone Master Node Installation Procedure (Step-by-Step)")
    add_bullet(doc, "6. Satellite Compute Worker Installation Procedure (Step-by-Step)")
    add_bullet(doc, "7. Universal 1-Command Bootstrap Trigger (pnet-bootstrap-and-install.sh)")
    add_bullet(doc, "8. Post-Installation Verification & Health Diagnostic Check")

    add_heading1(doc, "1. OFFLINE & AIR-GAPPED DEPLOYMENT ARCHITECTURE")
    add_body(doc, "PNetLab supports 100% air-gapped, offline installations without requiring outbound internet access during deployment. All required Debian binary archives, systemd services, web assets, templates, and runtime dependencies are self-contained within the repository bundle.")

    add_heading1(doc, "2. HOW TO ZIP FROM LOCAL GIT FOLDER FOR OFFLINE DEPLOYMENT")

    add_heading2(doc, "2.1 What to Zip & What to Exclude")
    add_body(doc, "From your local git PNET directory, zip the entire repository root directory, strictly excluding version history (.git/) and temporary IDE/agent caches (.gemini/, __pycache__/) to keep the package lean, fast to transfer, and clean.")

    add_heading2(doc, "2.2 Essential Subfolders & Files Included")
    add_bullet(doc, "releases/ — Contains channel-pointer.json and active version folder (e.g. 6.8.93/) holding debs, assets, manifests, and scripts.")
    add_bullet(doc, "install/ — Contains install-master.sh, install-satellite.sh, and verify-packages.sh.")
    add_bullet(doc, "scripts/ — Contains all runtime daemons, modern Netplan generators, watchdog, and cluster sync scripts.")
    add_bullet(doc, "Custom-Features/, Custom-Customization/, Custom-Performance/ — Contains all Tri-Pillar enterprise subsystems.")
    add_bullet(doc, "apply-all-custom.sh — The unified master injection orchestrator.")

    add_heading2(doc, "2.3 CLI Zipping Commands")
    add_body(doc, "Execute one of the following commands in the root of your local PNET repository:")
    add_code_block(doc, "# Windows PowerShell:\nCompress-Archive -Path * -DestinationPath ..\\pnet-offline-bundle.zip -Force\n\n# Linux Bash / Git Bash:\nzip -r ../pnet-offline-bundle.zip . -x \"*.git*\" -x \"*.gemini*\" -x \"*__pycache__*\" -x \"*.venv*\"")

    add_heading1(doc, "3. TARGET EXTRACTION ON LIVE VM (/opt/PNET & /opt/pnet)")
    add_body(doc, "Transfer the zip archive to the target Live VM and extract it directly into /opt/PNET, establishing the canonical symlink /opt/pnet:")
    add_code_block(doc, "sudo mkdir -p /opt/PNET\nsudo unzip -q /path/to/pnet-offline-bundle.zip -d /opt/PNET/\nsudo ln -sfn /opt/PNET /opt/pnet\ncd /opt/PNET\nsudo chmod +x install/*.sh scripts/*.sh apply-all-custom.sh")

    add_heading1(doc, "4. PREREQUISITES & SYSTEM REQUIREMENTS")
    add_bullet(doc, "Operating System: Ubuntu 24.04 LTS or Ubuntu 26.04 LTS (x86_64 server architecture).")
    add_bullet(doc, "Hardware Virtualization: Intel VT-x or AMD-V enabled in physical BIOS / nested hypervisor settings (verify via egrep -c '(vmx|svm)' /proc/cpuinfo >= 1).")
    add_bullet(doc, "Privileges: Superuser root access (sudo).")
    add_bullet(doc, "Network Adapter: Dedicated management interface (eth0 / ens160 / pnet0) configured with static IP or DHCP lease.")

    add_heading1(doc, "5. STANDALONE MASTER NODE INSTALLATION PROCEDURE (STEP-BY-STEP)")
    add_body(doc, "For a standalone Master node (providing Web-UI, MariaDB database, HTML5 Guacamole gateway, local KVM hypervisor, and all Tri-Pillars):")
    add_code_block(doc, "cd /opt/PNET\nln -sfn /opt/PNET /opt/pnet\nchmod +x install/*.sh scripts/*.sh apply-all-custom.sh\nsudo bash /opt/pnet/scripts/pnet-os-prerequisites.sh\nsudo bash install/install-master.sh")
    add_body(doc, "The master installer automatically packages local debs, applies MariaDB schema migrations, configures Apache and Guacamole, sets up bridges pnet0-pnet9, and overlays all Tri-Pillar enhancements.")

    add_heading1(doc, "6. SATELLITE COMPUTE WORKER INSTALLATION PROCEDURE (STEP-BY-STEP)")
    add_body(doc, "For a Satellite Compute Worker node joining an existing Master cluster:")
    add_code_block(doc, "cd /opt/PNET\nln -sfn /opt/PNET /opt/pnet\nchmod +x install/*.sh scripts/*.sh apply-all-custom.sh\nsudo bash /opt/pnet/scripts/pnet-os-prerequisites.sh\nsudo bash install/install-satellite.sh")
    add_body(doc, "The satellite installer configures KVM, launches the pnet-satd daemon on TLS port 9050, tunes sysctl parameters, and connects to the cluster broker daemon.")

    add_heading1(doc, "7. UNIVERSAL 1-COMMAND BOOTSTRAP TRIGGER")
    add_body(doc, "Alternatively, operators can execute the universal turnkey bootstrap script which automatically detects system posture and launches installation:")
    add_code_block(doc, "sudo bash /opt/pnet/scripts/pnet-bootstrap-and-install.sh")

    add_heading1(doc, "8. POST-INSTALLATION VERIFICATION & HEALTH DIAGNOSTIC CHECK")
    add_body(doc, "Immediately following installation, confirm system health and service readiness:")
    add_code_block(doc, "# 1. Run Complete Platform Health Diagnostic Check:\nsudo bash /opt/pnet/scripts/pnet-health-check.sh\n\n# 2. Run 10-Probe Architectural Health Suite:\npython3 /opt/pnet/Custom-Performance/scripts/pnet-dry-test.py")
    add_body(doc, "Access the Web-UI via https://<MASTER_IP>/ with default credentials: username admin, password pnet (or admin / azam).")

    dest = PROCESS_DOCS_DIR / "2. Offline Install.docx"
    doc.save(dest)
    print(f"Saved: {dest}")

if __name__ == "__main__":
    build_doc_0()
    build_doc_1_1()
    build_doc_1_2()
    build_doc_2()
    print("All 4 Process Documents successfully built and saved in 'Process Docs/'!")
