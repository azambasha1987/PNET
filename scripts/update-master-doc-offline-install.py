import docx
from docx.shared import Pt, RGBColor

def update_master_doc():
    doc = docx.Document('Master-Proccess-Doc.docx')

    # 1. Update Table of Contents under 'offline Install'
    # Find paragraph with text 'offline Install'
    toc_idx = None
    for i, p in enumerate(doc.paragraphs[:10]):
        if p.text.strip().lower() == 'offline install':
            toc_idx = i
            break
    
    if toc_idx is None:
        raise ValueError("Could not find 'offline Install' in Table of Contents")

    # The paragraph right after toc_idx
    target_toc_next = doc.paragraphs[toc_idx + 1]

    toc_subitems = [
        "   • Prerequisites & System Requirements",
        "   • Package Integrity & Cryptographic Verification (verify-packages.sh)",
        "   • Standalone Master Node Installation (install-master.sh)",
        "   • Distributed Satellite Worker Installation (install-satellite.sh)",
        "   • Air-Gapped Network Bootstrapping & Tri-Pillar Auto-Injection",
    ]

    for item in toc_subitems:
        p_sub = target_toc_next.insert_paragraph_before()
        p_sub.style = 'List Paragraph'
        run = p_sub.add_run(item)
        run.font.size = Pt(10.0)

    # 2. Find where body starts: paragraph with text '1. THOUGHT PROCESS & RELEASE PIPELINE'
    body_target = None
    for i, p in enumerate(doc.paragraphs):
        if '1. THOUGHT PROCESS & RELEASE PIPELINE' in p.text:
            body_target = p
            break

    if body_target is None:
        raise ValueError("Could not find '1. THOUGHT PROCESS & RELEASE PIPELINE'")

    # Define the body content for Offline Installation
    # We will insert paragraphs before body_target in order
    
    # Helper to insert
    def add_p(text, style='Normal', bold=False, size_pt=10.0, space_after=None):
        p = body_target.insert_paragraph_before()
        p.style = style
        if space_after is not None:
            p.paragraph_format.space_after = Pt(space_after)
        if text:
            r = p.add_run(text)
            r.bold = bold
            r.font.size = Pt(size_pt)
        return p

    def add_labeled_p(label, text, style='List Paragraph', label_bold=True, size_pt=9.5):
        p = body_target.insert_paragraph_before()
        p.style = style
        r1 = p.add_run(label)
        r1.bold = label_bold
        r1.font.size = Pt(size_pt)
        if text:
            r2 = p.add_run(text)
            r2.font.size = Pt(size_pt)
        return p

    # Main Heading
    add_p("OFFLINE INSTALLATION & AIR-GAPPED DEPLOYMENT", style='Normal', bold=True, size_pt=14.0, space_after=6)
    
    # Overview
    add_p(
        "The PNetLab enterprise architecture is engineered for 100% air-gapped, offline deployment without "
        "requiring live network connectivity to Codeberg, GitHub, or public package mirrors during installation. "
        "All Debian binary packages, systemd unit definitions, core assets, database schemas, and Tri-Pillar "
        "enhancements are self-contained locally within the repository under releases/<version>/ and install/.",
        style='Normal', bold=False, size_pt=10.0, space_after=4
    )

    # Section: Prerequisites
    add_p("Prerequisites & System Requirements", style='Normal', bold=True, size_pt=11.0, space_after=2)
    add_p("• Supported Operating Systems: 64-bit Ubuntu Server or Desktop (Ubuntu 20.04 LTS, Ubuntu 22.04 LTS, Ubuntu 24.04 LTS).", style='List Paragraph', size_pt=10.0)
    add_p("• Virtualization Support: Bare-metal hardware or Virtual Machine with Nested Virtualization enabled (Intel VT-x / AMD-V / SVM). Verify via kvm-ok.", style='List Paragraph', size_pt=10.0)
    add_p("• Hardware Minimums (Lightweight Labs): 4 vCPUs, 8 GB RAM, 40 GB storage.", style='List Paragraph', size_pt=10.0)
    add_p("• Hardware Recommended (Enterprise Cluster): 16+ vCPUs, 64+ GB RAM, NVMe SSD storage for heavy multi-vendor simulations (Cisco Cat8000v, XRv9k, Arista vEOS).", style='List Paragraph', size_pt=10.0)
    add_p("• Privileges: Root superuser access (sudo).", style='List Paragraph', size_pt=10.0, space_after=4)

    # Subsection 1
    add_p("1. Package Integrity & Cryptographic SHA256 Verification", style='Normal', bold=True, size_pt=11.0, space_after=2)
    add_p(
        "Before launching installation, all local release packages and assets are verified against signed SHA256 "
        "checksums to ensure zero archive corruption:",
        style='Normal', size_pt=10.0, space_after=2
    )
    add_labeled_p("• Verification Command: ", "bash install/verify-packages.sh [<VERSION>]", size_pt=9.5)
    add_labeled_p("• Execution Pipeline:", "", size_pt=9.5)
    add_labeled_p("  1. Version Resolution: ", "Automatically reads the active version pointer from releases/channel-pointer.json if no version argument is supplied.", size_pt=9.5)
    add_labeled_p("  2. Debian Package Verification: ", "Validates SHA256 checksums across all Master and Satellite Debian packages (pnetlab, pnetlab-schema, pnetlab-guacd, pnetlab-qemu, pnetlab-docker, pnetlab-vpcs, pnetlab-bridge-dkms, pnetlab-satellite).", size_pt=9.5)
    add_labeled_p("  3. Core Asset Verification: ", "Validates compressed asset archives (pnetlab-core-assets-<version>.tar.zst) and repository security signing keys.", size_pt=9.5)
    add_labeled_p("  4. Fail-Fast Safety: ", "Halts installation immediately with exit code 1 if any checksum mismatch or archive corruption is detected.", size_pt=9.5)
    add_p("", style='Normal', space_after=2)

    # Subsection 2
    add_p("2. Standalone Master Node Installation (Controller Role)", style='Normal', bold=True, size_pt=11.0, space_after=2)
    add_p(
        "Configures a complete standalone PNetLab Master Controller hosting the Apache/PHP Web-UI, MySQL database "
        "schema, HTML5 Guacamole proxy, local simulation hypervisor, and all Tri-Pillar enhancements:",
        style='Normal', size_pt=10.0, space_after=2
    )
    add_labeled_p("• Installation Command: ", "sudo bash install/install-master.sh [<VERSION>]", size_pt=9.5)
    add_labeled_p("• Execution Pipeline:", "", size_pt=9.5)
    add_labeled_p("  1. Integrity Validation: ", "Invokes verify-packages.sh to guarantee zero package corruption.", size_pt=9.5)
    add_labeled_p("  2. Repository Keyring Enrollment: ", "Installs repository GPG signing key to /usr/share/keyrings/pnetlab-local.gpg.", size_pt=9.5)
    add_labeled_p("  3. Local Dependencies: ", "Installs base Ubuntu hypervisor dependencies (apache2, mysql-server, php-fpm, bridge-utils, cpu-checker, tar, zstd, curl, git, libvirt, qemu-kvm).", size_pt=9.5)
    add_labeled_p("  4. Core Asset Extraction: ", "Extracts pnetlab-core-assets-<version>.tar.zst into /opt/unetlab/ via zstd decompression.", size_pt=9.5)
    add_labeled_p("  5. Debian Package Installation: ", "Installs all 7 Master Debian packages via dpkg -i with automatic apt dependency resolution.", size_pt=9.5)
    add_labeled_p("  6. Tri-Pillar Master Application: ", "Automatically executes apply-all-custom.sh --master, injecting Custom-Performance (Ultra-KSM 4KB RAM deduplication C-shim, Cgroups v2 ceilings, dynamic CPU governor), Custom-Customization (528 CPU templates, Cyber-Glass login portal, OLED dark theme, sliding keepalive), and Custom-Features (Operations Center modal, docked console drawer, syntax engine, SLA ping mesh).", size_pt=9.5)
    add_labeled_p("  7. Service Finalization: ", "Secures /opt/unetlab/wrappers permissions (755), reloads systemd daemons, and restarts web/API services.", size_pt=9.5)
    add_labeled_p("• Accessing Master: ", "Open browser at https://<server-ip>/ or https://localhost/ (Default: admin / pnet)", size_pt=9.5)
    add_labeled_p("• CLI Management: ", "Run pnet-health, pnet-perf --check, or pnet-feat --status to verify subsystem health.", size_pt=9.5)
    add_p("", style='Normal', space_after=2)

    # Subsection 3
    add_p("3. Distributed Satellite Worker Installation (Compute Role)", style='Normal', bold=True, size_pt=11.0, space_after=2)
    add_p(
        "Configures a dedicated compute host (Satellite) that offloads heavy QEMU and IOL virtual node execution "
        "while reporting telemetry back to an existing Master Controller:",
        style='Normal', size_pt=10.0, space_after=2
    )
    add_labeled_p("• Installation Command: ", "sudo bash install/install-satellite.sh [<VERSION>]", size_pt=9.5)
    add_labeled_p("• Execution Pipeline:", "", size_pt=9.5)
    add_labeled_p("  1. Package Verification: ", "Confirms SHA256 integrity of satellite Debian packages.", size_pt=9.5)
    add_labeled_p("  2. Worker Dependencies: ", "Installs hypervisor and container runtimes (qemu-kvm, docker.io, bridge-utils, libvirt-daemon-system).", size_pt=9.5)
    add_labeled_p("  3. Satellite Package Installation: ", "Installs pnetlab-satellite, pnetlab-bridge-dkms, pnetlab-qemu, pnetlab-docker, and pnetlab-vpcs.", size_pt=9.5)
    add_labeled_p("  4. Tri-Pillar Satellite Application: ", "Executes apply-all-custom.sh --satellite, injecting Ultra-KSM memory merger, dynamic CPU frequency scaling, QEMU multi-core templates, and watchdog daemons.", size_pt=9.5)
    add_labeled_p("  5. Service Startup: ", "Reloads systemd daemons and enables background worker services.", size_pt=9.5)
    add_labeled_p("• Joining Satellite to Master Cluster:", "", size_pt=9.5)
    add_labeled_p("  1. Token Generation: ", "In Master Web-UI, navigate to System -> Satellite Management -> Add Satellite.", size_pt=9.5)
    add_labeled_p("  2. Cluster Join Command: ", "Run on the satellite host: sudo /opt/unetlab/scripts/pnet-satellite-join.sh --token <CLUSTER_TOKEN> --master <MASTER_IP>", size_pt=9.5)
    add_p("", style='Normal', space_after=2)

    # Subsection 4
    add_p("4. Air-Gapped Network & Local Bootstrap Runner", style='Normal', bold=True, size_pt=11.0, space_after=2)
    add_p(
        "For environments with zero external network connectivity, the unified bootstrap runner auto-detects "
        "local repository roots and triggers the appropriate installation workflow:",
        style='Normal', size_pt=10.0, space_after=2
    )
    add_labeled_p("• Bootstrap Command: ", "sudo bash scripts/pnet-bootstrap-and-install.sh", size_pt=9.5)
    add_labeled_p("• Post-Installation Verification Probes:", "", size_pt=9.5)
    add_labeled_p("  - Hypervisor & KSM Status: ", "sudo pnet-perf --check", size_pt=9.5)
    add_labeled_p("  - Custom Feature Daemons: ", "sudo pnet-feat --status", size_pt=9.5)
    add_labeled_p("  - 10-Probe Dry-Run Suite: ", "python /opt/unetlab/scripts/pnet-dry-test.py (All 10/10 probes must pass)", size_pt=9.5)
    add_p("", style='Normal', space_after=6)

    doc.save('Master-Proccess-Doc.docx')
    print("Master-Proccess-Doc.docx updated successfully.")

if __name__ == '__main__':
    update_master_doc()
