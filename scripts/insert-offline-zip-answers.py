import docx
from docx.shared import Pt

def insert_offline_answers():
    doc = docx.Document('Master-Proccess-Doc.docx')

    # Find the two question paragraphs
    q1_p = None
    q2_p = None
    prereq_p = None

    for i, p in enumerate(doc.paragraphs):
        text = p.text.strip()
        if 'Which specific folder should you zip / copy into the Live VM?' in text and i > 40:
            q1_p = p
        elif 'What script to run to install PNETLAB and where is it placed?' in text and i > 40:
            q2_p = p
        elif text == 'Prerequisites & System Requirements' and i > 40:
            prereq_p = p

    if not q1_p or not q2_p or not prereq_p:
        raise ValueError("Could not find question paragraphs in document")

    # Helper function to add run with styling
    def make_p_before(target, text, style='List Paragraph', bold=False, size_pt=9.5, space_after=2):
        p = target.insert_paragraph_before()
        p.style = style
        p.paragraph_format.space_after = Pt(space_after)
        if text:
            r = p.add_run(text)
            r.bold = bold
            r.font.size = Pt(size_pt)
        return p

    def make_labeled_p_before(target, label, text, style='List Paragraph', label_bold=True, size_pt=9.5, space_after=2):
        p = target.insert_paragraph_before()
        p.style = style
        p.paragraph_format.space_after = Pt(space_after)
        r1 = p.add_run(label)
        r1.bold = label_bold
        r1.font.size = Pt(size_pt)
        if text:
            r2 = p.add_run(text)
            r2.font.size = Pt(size_pt)
        return p

    # Bold the question headers so they read nicely as prompts
    for r in q1_p.runs:
        r.bold = True
    for r in q2_p.runs:
        r.bold = True

    # 1. Insert answers to Q1 right before q2_p
    make_labeled_p_before(q2_p, "• What to Zip: ", "Zip the entire PNET repository root directory, excluding the large .git/ version history folder to keep the package compact, clean, and fast to transfer.", size_pt=9.5)
    make_labeled_p_before(q2_p, "  - Essential Subfolders & Files Included:", "", size_pt=9.5)
    make_p_before(q2_p, "    1. releases/ — Contains channel-pointer.json and active version folder (e.g. 6.8.93resolute1/) holding debs, assets, manifests, and scripts.", size_pt=9.0)
    make_p_before(q2_p, "    2. install/ — Contains install-master.sh, install-satellite.sh, and verify-packages.sh.", size_pt=9.0)
    make_p_before(q2_p, "    3. scripts/ — Contains all runtime daemons, modern Netplan generators, watchdog, and cluster scripts.", size_pt=9.0)
    make_p_before(q2_p, "    4. Custom-Features/, Custom-Customization/, Custom-Performance/ — Contains all Tri-Pillar enterprise subsystems.", size_pt=9.0)
    make_p_before(q2_p, "    5. apply-all-custom.sh — The unified master injection engine.", size_pt=9.0)

    make_labeled_p_before(q2_p, "• Command to Create the Offline Zip on Workstation (from E:\\PNET):", "", size_pt=9.5)
    make_labeled_p_before(q2_p, "  - Git Archive (Recommended - Cleanest): ", "git archive --format=zip --output=pnet-offline.zip HEAD", size_pt=9.5)
    make_labeled_p_before(q2_p, "  - Windows PowerShell (Alternative): ", "Compress-Archive -Path * -DestinationPath pnet-offline.zip", size_pt=9.5)
    make_labeled_p_before(q2_p, "  - Linux / macOS Bash: ", "zip -r pnet-offline.zip . -x \"*.git*\"", size_pt=9.5)

    make_labeled_p_before(q2_p, "• Where to Place on the Live VM:", " Transfer pnet-offline.zip to the isolated Ubuntu 26.04 server and extract it into /opt/pnet (or ~/PNET):", size_pt=9.5)
    make_labeled_p_before(q2_p, "  - Step 1 (Copy via SCP or USB): ", "scp pnet-offline.zip <USER>@<UBUNTU_26_IP>:/tmp/", size_pt=9.5)
    make_labeled_p_before(q2_p, "  - Step 2 (Extract on Live VM): ", "mkdir -p /opt/pnet && cd /opt/pnet && unzip /tmp/pnet-offline.zip", size_pt=9.5)
    make_labeled_p_before(q2_p, "  - Step 3 (Set Execution Permissions): ", "chmod +x install/*.sh scripts/*.sh", size_pt=9.5)
    make_p_before(q2_p, "", style='Normal', space_after=4)

    # 2. Insert answers to Q2 right before prereq_p
    make_labeled_p_before(prereq_p, "• Script Location:", " The installation scripts are placed directly inside the install/ subdirectory of the extracted repository:", size_pt=9.5)
    make_p_before(prereq_p, "  - Master Installer: /opt/pnet/install/install-master.sh", size_pt=9.0)
    make_p_before(prereq_p, "  - Satellite Installer: /opt/pnet/install/install-satellite.sh", size_pt=9.0)
    make_p_before(prereq_p, "  - Universal Bootstrap Trigger: /opt/pnet/scripts/pnet-bootstrap-and-install.sh", size_pt=9.0)

    make_labeled_p_before(prereq_p, "• What Script to Run on the Live VM:", "", size_pt=9.5)
    make_labeled_p_before(prereq_p, "  - For Standalone Master Node (Web-UI, MySQL DB, HTML5 Guacamole, Local Hypervisor, Tri-Pillars):", "", size_pt=9.5)
    make_p_before(prereq_p, "       cd /opt/pnet", size_pt=9.0)
    make_p_before(prereq_p, "       sudo bash install/install-master.sh", size_pt=9.0)
    make_labeled_p_before(prereq_p, "  - For Satellite Compute Worker Node (Worker host joining an existing Master cluster):", "", size_pt=9.5)
    make_p_before(prereq_p, "       cd /opt/pnet", size_pt=9.0)
    make_p_before(prereq_p, "       sudo bash install/install-satellite.sh", size_pt=9.0)
    make_labeled_p_before(prereq_p, "  - Alternative 1-Command Universal Bootstrap Trigger:", "", size_pt=9.5)
    make_p_before(prereq_p, "       sudo bash /opt/pnet/scripts/pnet-bootstrap-and-install.sh", size_pt=9.0)
    make_p_before(prereq_p, "", style='Normal', space_after=4)

    # Remove any stray empty paragraphs between questions if desired
    doc.save('Master-Proccess-Doc.docx')
    print("Successfully inserted answers and CLI examples underneath both questions in Master-Proccess-Doc.docx.")

if __name__ == '__main__':
    insert_offline_answers()
