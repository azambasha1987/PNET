#!/usr/bin/env python3
"""
===============================================================================
build_how_to_use.py
Generates How-To-Use.docx and How-To-Use.md in:
  D:\\1. Study\\0. Labs, Emulators & Tools\\4. PNet Lab\\Custom-Features\\

Comprehensive operational manual for the One-Click Custom Push Engine.
===============================================================================
"""

import os
from pathlib import Path
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

TARGET_DIR = Path(r"D:\1. Study\0. Labs, Emulators & Tools\4. PNet Lab\Custom-Features")

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def add_title(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(20)
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

def add_body(doc, text, bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
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
    r_sym = p.add_run("• ")
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
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Inches(0.35)
    run = p.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor(0, 30, 60)

def generate_docs():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    docx_path = TARGET_DIR / "How-To-Use.docx"
    md_path = TARGET_DIR / "How-To-Use.md"

    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)

    add_title(doc, "PNETLAB ONE-CLICK CUSTOM PUSH ENGINE — HOW TO USE")
    add_subtitle(doc, "Complete Operational Manual & Workflow Reference | Offline, Zero-Git Customization Pipeline")

    add_heading1(doc, "1. OVERVIEW & PHILOSOPHY")
    add_body(doc, "This directory contains the completely decoupled, offline customization suite for your PNetLab virtualization environment. It allows you to run upstream PNetLab updates natively using official update methods without risk of Git merge conflicts, lost configurations, or broken dependencies.")
    add_bullet(doc, "Official Upstream Updates: Run updates normally via PNetLab's Web-UI or terminal commands.", "Step 1: ")
    add_bullet(doc, "One-Click Re-Application: Run push-custom.ps1 from Windows to push and execute your custom enhancements in under 5 seconds.", "Step 2: ")
    add_bullet(doc, "Complete Git Isolation: Your local Git and GitHub repositories remain 100% untouched.", "Zero-Git Safety: ")

    add_heading1(doc, "2. DIRECTORY FILE INVENTORY")
    add_body(doc, "The following files form your local offline customization suite:")

    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'
    hdr = table.rows[0].cells
    hdr[0].text = "Filename"
    hdr[1].text = "Type / Platform"
    hdr[2].text = "Purpose & Functionality"
    for c in hdr:
        set_cell_background(c, "003366")
        for p in c.paragraphs:
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(10)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)

    files_info = [
        ("push-custom.ps1", "PowerShell (Windows)", "The 1-click execution engine. Probes VM IP, fixes CRLF, uploads scripts via SCP, and executes them via SSH."),
        ("pnet-nodes.json", "JSON Config", "Central IP and SSH key configuration mapping for your Master Controller and Satellite worker hypervisors."),
        ("master-node.sh", "Bash (Linux VM)", "Standalone script that restores all Master Node features (UKSM, 0..9 export sort, recursive UUID stripper, Safe APT Guard, 512M upload limit, Cisco IOL shim)."),
        ("satellite-node.sh", "Bash (Linux VM)", "Standalone script that configures Satellite Worker hypervisors (cluster daemon pnet-satd, MTU 9000 bridges, compute-density UKSM)."),
        ("azam-custom.sh", "Bash (Linux VM)", "Standalone script that restores personal UI branding, custom application titles, logos, and Cyber-Glass styling."),
        ("Master-Node-Code.docx", "Word Doc (Reference)", "Comprehensive documentation covering all Master Controller features, architecture, and script code."),
        ("Satellite-Node-Code.docx", "Word Doc (Reference)", "Comprehensive documentation covering Satellite worker clustering, daemon security, and bridge tuning."),
        ("Azam-Custom-code.docx", "Word Doc (Reference)", "Comprehensive documentation covering personal branding, zero-touch APT DPkg hooks, and master orchestration."),
        ("How-To-Use.docx / .md", "Documentation", "This user guide and operational manual."),
    ]

    for fname, ftype, fdesc in files_info:
        row = table.add_row().cells
        row[0].text = fname
        row[1].text = ftype
        row[2].text = fdesc
        for c in row:
            for p in c.paragraphs:
                for r in p.runs:
                    r.font.name = "Calibri"
                    r.font.size = Pt(9.5)

    add_heading1(doc, "3. STEP-BY-STEP OPERATIONAL WORKFLOW")
    add_heading2(doc, "Step 1: Perform Upstream PNetLab Update")
    add_body(doc, "Whenever upstream PNetLab releases a new version, perform the update normally:")
    add_bullet(doc, "Via Web-UI: System -> System Upgrade -> Click 'Upgrade' or 'Update'.", "Option A: ")
    add_bullet(doc, "Via SSH Terminal: Run 'sudo pnetlab-update' or official upstream update script.", "Option B: ")
    add_body(doc, "Allow the upstream update to finish and reboot if required.")

    add_heading2(doc, "Step 2: Run One-Click Push from Windows")
    add_body(doc, "Once the PNetLab VM is back online, apply your custom enhancements from your Windows PC:")
    add_bullet(doc, "Open PowerShell in this directory: D:\\1. Study\\0. Labs, Emulators & Tools\\4. PNet Lab\\Custom-Features\\", "Action: ")
    add_bullet(doc, "Run the command: .\\push-custom.ps1", "Command: ")

    add_code_block(doc, ".\\push-custom.ps1")

    add_body(doc, "The interactive menu will appear:")
    add_code_block(doc, """============================================================
          AzamLabs PNetLab One-Click Custom Push            
============================================================
  [1] Master Node   (All Fixes + UKSM + Export Patch + APT Guard)
  [2] Satellite     (Worker Hypervisor + Bridge MTU 9000)
  [3] Azam Custom   (Enterprise Branding, Logo, Themes)
  [4] Full Stack    (Master Node Hardening + Custom Branding)
  [Q] Quit
------------------------------------------------------------
Select option [1-4, Q]:""")

    add_body(doc, "Type '1' (or '4' for Full Stack) and press Enter. The script will automatically:")
    add_bullet(doc, "Ping the VM (192.168.1.23) to verify it is online.", "1. Reachability Probe: ")
    add_bullet(doc, "Strip Windows CRLF line endings to prevent Linux bash syntax errors.", "2. Line Normalization: ")
    add_bullet(doc, "Securely upload the script to /tmp/ on the VM using native Windows SCP.", "3. Secure Upload: ")
    add_bullet(doc, "Execute the script via SSH and stream live status checkmarks [✔] to your Windows terminal.", "4. Remote Execution: ")
    add_bullet(doc, "Clean up the staging script from /tmp/ upon completion.", "5. Self-Cleaning: ")

    add_heading1(doc, "4. DIRECT CLI EXECUTION (NO INTERACTIVE PROMPTS)")
    add_body(doc, "If you prefer running a direct command without interacting with the menu:")
    add_bullet(doc, ".\\push-custom.ps1 -Target master", "Deploy to Master: ")
    add_bullet(doc, ".\\push-custom.ps1 -Target satellite -Ip 192.168.1.28", "Deploy to Satellite: ")
    add_bullet(doc, ".\\push-custom.ps1 -Target custom", "Deploy Branding Only: ")
    add_bullet(doc, ".\\push-custom.ps1 -Target all", "Deploy Full Stack: ")

    add_heading1(doc, "5. CONFIGURING IP ADDRESSES (pnet-nodes.json)")
    add_body(doc, "If your PNetLab VM receives a new IP address via DHCP or you change your static IP, simply update 'pnet-nodes.json' in this folder:")
    add_code_block(doc, """{
  "master": {
    "ip": "192.168.1.23",
    "user": "root",
    "key_path": "C:\\\\Users\\\\azamb\\\\.ssh\\\\azamlabs_vm",
    "description": "PNetLab Master Controller (Web-UI, DB, Hypervisor)"
  },
  "satellite": {
    "ip": "192.168.1.28",
    "user": "root",
    "key_path": "C:\\\\Users\\\\azamb\\\\.ssh\\\\azamlabs_vm",
    "description": "PNetLab Satellite Worker Node (Compute Hypervisor)"
  }
}""")

    add_heading1(doc, "6. TROUBLESHOOTING & COMMON SCENARIOS")
    add_heading2(doc, "Scenario A: 'REMOTE HOST IDENTIFICATION HAS CHANGED'")
    add_body(doc, "If your VM is reinstalled or the OS regenerates its SSH host keys, Windows OpenSSH will alert you that the host identification changed. Run this 1-line command in Windows PowerShell to refresh the host key:")
    add_code_block(doc, "ssh-keygen -R 192.168.1.23")

    add_heading2(doc, "Scenario B: SSH Key Authentication")
    add_body(doc, "The push engine is configured to use your personal key at C:\\Users\\azamb\\.ssh\\azamlabs_vm. If password authentication is required, SSH will prompt for the VM's root password (default: 'pnet').")

    add_heading2(doc, "Scenario C: Verifying Health on the PNetLab VM")
    add_body(doc, "To verify that your customizations are active on the VM after the push, run any of the following:")
    add_bullet(doc, "cat /sys/kernel/mm/ksm/run  (Returns '1' if UKSM memory deduplication is active)", "Memory Deduplication: ")
    add_bullet(doc, "sudo pnet-apt-guard --status  (Returns 'ACTIVE' for Safe APT Guard)", "APT Protection: ")
    add_bullet(doc, "head -n 20 /opt/unetlab/scripts/remove_uuid.sh  (Shows recursive sed stripper)", "Export Pipeline: ")

    doc.save(docx_path)
    print(f"Generated: {docx_path}")

    # Also generate markdown
    md_content = """# PNetLab One-Click Custom Push Engine — How to Use

**Operational Manual & Reference Guide | Offline, Zero-Git Customization Pipeline**  
*Location: `D:\\1. Study\\0. Labs, Emulators & Tools\\4. PNet Lab\\Custom-Features\\`*

---

## 1. Overview & Philosophy
This directory contains your completely decoupled, offline customization suite for PNetLab. It allows you to update PNetLab natively without risk of Git merge conflicts, lost configurations, or broken dependencies:
1. **Official Upstream Updates**: Run updates normally via PNetLab's Web-UI or terminal commands.
2. **One-Click Re-Application**: Run `push-custom.ps1` from Windows to push and execute your enhancements in under 5 seconds.
3. **Complete Git Isolation**: Your local Git and GitHub repositories remain 100% untouched.

---

## 2. Directory File Inventory

| Filename | Type / Platform | Purpose & Functionality |
| :--- | :--- | :--- |
| **`push-custom.ps1`** | PowerShell (Windows) | The 1-click execution engine. Probes VM IP, fixes CRLF, uploads scripts via SCP, and executes them via SSH. |
| **`pnet-nodes.json`** | JSON Config | Central IP and SSH key configuration mapping for your Master Controller and Satellite worker hypervisors. |
| **`master-node.sh`** | Bash (Linux VM) | Standalone script that restores all Master Node features (UKSM, 0..9 export sort, recursive UUID stripper, Safe APT Guard, 512M upload limit, Cisco IOL shim). |
| **`satellite-node.sh`** | Bash (Linux VM) | Standalone script that configures Satellite Worker hypervisors (cluster daemon `pnet-satd`, MTU 9000 bridges, compute-density UKSM). |
| **`azam-custom.sh`** | Bash (Linux VM) | Standalone script that restores personal UI branding, custom application titles, logos, and Cyber-Glass styling. |
| **`Master-Node-Code.docx`** | Word Doc (Reference) | Comprehensive documentation covering all Master Controller features, architecture, and script code. |
| **`Satellite-Node-Code.docx`** | Word Doc (Reference) | Comprehensive documentation covering Satellite worker clustering, daemon security, and bridge tuning. |
| **`Azam-Custom-code.docx`** | Word Doc (Reference) | Comprehensive documentation covering personal branding, zero-touch APT DPkg hooks, and master orchestration. |
| **`How-To-Use.docx` / `.md`** | Documentation | This user guide and operational manual. |

---

## 3. Step-by-Step Operational Workflow

### Step 1: Perform Upstream PNetLab Update
Whenever upstream PNetLab releases an update, update normally:
* **Via Web-UI**: System -> System Upgrade -> Click "Upgrade" or "Update".
* **Via SSH Terminal**: Run `sudo pnetlab-update` or the official update command.
Allow the update to complete and reboot the VM if required.

### Step 2: Run One-Click Push from Windows
Once the VM is back online, open PowerShell in this directory:
```powershell
cd "D:\\1. Study\\0. Labs, Emulators & Tools\\4. PNet Lab\\Custom-Features"
.\\push-custom.ps1
```

The interactive menu will appear:
```text
============================================================
          AzamLabs PNetLab One-Click Custom Push            
============================================================
  [1] Master Node   (All Fixes + UKSM + Export Patch + APT Guard)
  [2] Satellite     (Worker Hypervisor + Bridge MTU 9000)
  [3] Azam Custom   (Enterprise Branding, Logo, Themes)
  [4] Full Stack    (Master Node Hardening + Custom Branding)
  [Q] Quit
------------------------------------------------------------
Select option [1-4, Q]:
```
Type `1` (or `4` for Full Stack) and press **Enter**.

The script automatically:
1. Pings the VM (`192.168.1.23`) to verify reachability.
2. Normalizes Windows CRLF line endings to UNIX LF.
3. Securely uploads the script to `/tmp/` via Windows native `scp.exe`.
4. Executes the script over SSH with live colored status checkmarks `[✔]`.
5. Removes the temporary script from `/tmp/`.

---

## 4. Direct CLI Execution (No Interactive Prompts)

```powershell
# Deploy to Master
.\\push-custom.ps1 -Target master

# Deploy to Satellite
.\\push-custom.ps1 -Target satellite -Ip 192.168.1.28

# Deploy Branding Only
.\\push-custom.ps1 -Target custom

# Deploy Full Stack (Master + Branding)
.\\push-custom.ps1 -Target all
```

---

## 5. Configuring IP Addresses (`pnet-nodes.json`)

To update IP addresses or SSH key paths, edit [`pnet-nodes.json`](pnet-nodes.json):
```json
{
  "master": {
    "ip": "192.168.1.23",
    "user": "root",
    "key_path": "C:\\\\Users\\\\azamb\\\\.ssh\\\\azamlabs_vm",
    "description": "PNetLab Master Controller (Web-UI, DB, Hypervisor)"
  },
  "satellite": {
    "ip": "192.168.1.28",
    "user": "root",
    "key_path": "C:\\\\Users\\\\azamb\\\\.ssh\\\\azamlabs_vm",
    "description": "PNetLab Satellite Worker Node (Compute Hypervisor)"
  }
}
```

---

## 6. Troubleshooting

* **Host Key Identification Changed**:
  If the VM was reinstalled or regenerated SSH host keys, run:
  ```powershell
  ssh-keygen -R 192.168.1.23
  ```
* **Verify Memory Deduplication on VM**:
  ```bash
  cat /sys/kernel/mm/ksm/run  # Returns 1 when active
  ```
* **Verify Safe APT Guard on VM**:
  ```bash
  sudo pnet-apt-guard --status  # Returns ACTIVE
  ```
"""
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Generated: {md_path}")

if __name__ == "__main__":
    generate_docs()
