import docx
from docx.shared import Pt

def add_zip_instructions():
    doc = docx.Document('Master-Proccess-Doc.docx')

    # Find target paragraph: 'Prerequisites & System Requirements'
    target_p = None
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip() == 'Prerequisites & System Requirements' and i > 40:
            target_p = p
            break

    if target_p is None:
        raise ValueError("Could not find 'Prerequisites & System Requirements' paragraph in body")

    def add_p(text, style='Normal', bold=False, size_pt=10.0, space_after=None):
        p = target_p.insert_paragraph_before()
        p.style = style
        if space_after is not None:
            p.paragraph_format.space_after = Pt(space_after)
        if text:
            r = p.add_run(text)
            r.bold = bold
            r.font.size = Pt(size_pt)
        return p

    def add_labeled_p(label, text, style='List Paragraph', label_bold=True, size_pt=9.5):
        p = target_p.insert_paragraph_before()
        p.style = style
        r1 = p.add_run(label)
        r1.bold = label_bold
        r1.font.size = Pt(size_pt)
        if text:
            r2 = p.add_run(text)
            r2.font.size = Pt(size_pt)
        return p

    # Insert Section Heading
    add_p("How to Zip from Local GIT Folder for Offline Deployment", style='Normal', bold=True, size_pt=11.0, space_after=2)

    # Overview description
    add_p(
        "To deploy PNetLab into an air-gapped or restricted network environment, the administrator packages the local repository into a self-contained offline deployment bundle from their workstation (which holds the cloned repository) and transfers it to the target Ubuntu host:",
        style='Normal', size_pt=10.0, space_after=2
    )

    # Method 1
    add_labeled_p("• Method 1: Git-Native Clean Archive (Recommended):", "", size_pt=9.5)
    add_p(
        "  Generates a clean, compact deployment bundle containing all tracked release binaries, Debian packages, scripts, and templates while stripping the large .git/ version history database:",
        style='List Paragraph', size_pt=9.5
    )
    add_labeled_p("  - Command (Windows PowerShell / Linux / macOS): ", "git archive --format=zip --output=pnet-offline.zip HEAD", size_pt=9.5)

    # Method 2
    add_labeled_p("• Method 2: Standard Archive (Including Untracked Local Assets):", "", size_pt=9.5)
    add_p(
        "  If custom appliance images, qemu images, or additional Debian packages have been placed into releases/ or assets/ without being committed to Git:",
        style='List Paragraph', size_pt=9.5
    )
    add_labeled_p("  - Linux / macOS Bash: ", "zip -r pnet-offline.zip . -x \"*.git*\"", size_pt=9.5)
    add_labeled_p("  - Windows PowerShell: ", "Compress-Archive -Path * -DestinationPath pnet-offline.zip", size_pt=9.5)
    add_labeled_p("  - Multiplatform Tar (Alternative): ", "tar --exclude='.git' -czvf pnet-offline.tar.gz .", size_pt=9.5)

    # Transfer
    add_labeled_p("• Transfer to Air-Gapped Target:", "", size_pt=9.5)
    add_p(
        "  Transfer pnet-offline.zip to the isolated Ubuntu 26.04 server via USB storage drive, external SSD, or local SCP over an internal management network:",
        style='List Paragraph', size_pt=9.5
    )
    add_labeled_p("  - SCP Transfer Example: ", "scp pnet-offline.zip <USER>@<UBUNTU_26_IP>:/tmp/", size_pt=9.5)

    # Extraction & Execution
    add_labeled_p("• Extraction & Offline Installation on Ubuntu 26.04 Host:", "", size_pt=9.5)
    add_p(
        "  On the target host, unpack the archive into /opt/pnet or ~/PNET and trigger the Master or Satellite offline installer:",
        style='List Paragraph', size_pt=9.5
    )
    add_labeled_p("  - Unpack Archive: ", "mkdir -p ~/PNET && cd ~/PNET && unzip /tmp/pnet-offline.zip", size_pt=9.5)
    add_labeled_p("  - Set Script Permissions: ", "chmod +x install/*.sh scripts/*.sh", size_pt=9.5)
    add_labeled_p("  - Execute Master Install: ", "sudo bash install/install-master.sh", size_pt=9.5)
    add_labeled_p("  - Execute Satellite Install: ", "sudo bash install/install-satellite.sh", size_pt=9.5)
    add_p("", style='Normal', space_after=4)

    doc.save('Master-Proccess-Doc.docx')
    print("Master-Proccess-Doc.docx updated successfully with How to Zip instructions.")

if __name__ == '__main__':
    add_zip_instructions()
