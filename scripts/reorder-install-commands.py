import docx
from docx.shared import Pt

def reorder_commands():
    doc = docx.Document('Master-Proccess-Doc.docx')

    # We want to replace the blocks for Master Installer and Satellite Installer
    # Let's inspect paragraphs 58 to 95
    p_start = None
    p_end = None
    for i, p in enumerate(doc.paragraphs):
        if '• Script Location: The installation scripts are placed' in p.text:
            p_start = i
        elif 'Alternative 1-Command Universal Bootstrap Trigger:' in p.text:
            p_end = i + 2 # include the command after it
            break

    if p_start is None or p_end is None:
        raise ValueError("Could not find start/end of install commands section")

    print(f"Replacing paragraphs from {p_start} to {p_end}")

    # Build the target clean paragraphs to replace the entire range
    # Let's see what p_start to p_end looks like
    target_p = doc.paragraphs[p_start]

    new_blocks = [
        ("• Script Location: The installation scripts are placed directly inside the install/ subdirectory of the extracted repository:", 'List Paragraph', True, 9.5),
        ("  - Master Installer:", 'List Paragraph', True, 9.5),
        ("cd /opt/PNET", 'List Paragraph', False, 8.5),
        ("ln -sfn /opt/PNET /opt/pnet", 'List Paragraph', False, 8.5),
        ("chmod +x install/*.sh scripts/*.sh apply-all-custom.sh", 'List Paragraph', False, 8.5),
        ("sudo bash /opt/pnet/scripts/pnet-os-prerequisites.sh", 'List Paragraph', False, 8.5),
        ("bash install/install-master.sh", 'List Paragraph', False, 8.5),
        ("", 'Normal', False, 9.0),
        ("  - Satellite Installer:", 'List Paragraph', True, 9.5),
        ("cd /opt/PNET", 'List Paragraph', False, 8.5),
        ("ln -sfn /opt/PNET /opt/pnet", 'List Paragraph', False, 8.5),
        ("chmod +x install/*.sh scripts/*.sh apply-all-custom.sh", 'List Paragraph', False, 8.5),
        ("sudo bash /opt/pnet/scripts/pnet-os-prerequisites.sh", 'List Paragraph', False, 8.5),
        ("bash install/install-satellite.sh", 'List Paragraph', False, 8.5),
        ("", 'Normal', False, 9.0),
        ("  - Universal Bootstrap Trigger: /opt/pnet/scripts/pnet-bootstrap-and-install.sh", 'List Paragraph', False, 9.0),
        ("• What Script to Run on the Live VM:", 'List Paragraph', True, 9.5),
        ("  - For Standalone Master Node (Web-UI, MySQL DB, HTML5 Guacamole, Local Hypervisor, Tri-Pillars):", 'List Paragraph', False, 9.0),
        ("       cd /opt/PNET", 'List Paragraph', False, 8.5),
        ("       ln -sfn /opt/PNET /opt/pnet", 'List Paragraph', False, 8.5),
        ("       chmod +x install/*.sh scripts/*.sh apply-all-custom.sh", 'List Paragraph', False, 8.5),
        ("       sudo bash /opt/pnet/scripts/pnet-os-prerequisites.sh", 'List Paragraph', False, 8.5),
        ("       sudo bash install/install-master.sh", 'List Paragraph', False, 8.5),
        ("  - For Satellite Compute Worker Node (Worker host joining an existing Master cluster):", 'List Paragraph', False, 9.0),
        ("       cd /opt/PNET", 'List Paragraph', False, 8.5),
        ("       ln -sfn /opt/PNET /opt/pnet", 'List Paragraph', False, 8.5),
        ("       chmod +x install/*.sh scripts/*.sh apply-all-custom.sh", 'List Paragraph', False, 8.5),
        ("       sudo bash /opt/pnet/scripts/pnet-os-prerequisites.sh", 'List Paragraph', False, 8.5),
        ("       sudo bash install/install-satellite.sh", 'List Paragraph', False, 8.5),
        ("  - Alternative 1-Command Universal Bootstrap Trigger:", 'List Paragraph', False, 9.0),
        ("       sudo bash /opt/pnet/scripts/pnet-bootstrap-and-install.sh", 'List Paragraph', False, 8.5),
    ]

    # Insert new blocks before target_p
    for text, style, bold, size_pt in new_blocks:
        p = target_p.insert_paragraph_before()
        p.style = style
        p.paragraph_format.space_after = Pt(2.0) if text else Pt(4.0)
        if text:
            r = p.add_run(text)
            r.bold = bold
            r.font.size = Pt(size_pt)

    # Now remove the old paragraphs from p_start to p_end
    # Note: because we inserted before target_p, the old paragraphs are target_p and those after it
    old_paras = doc.paragraphs[p_start + len(new_blocks) : p_end + len(new_blocks)]
    for p in old_paras:
        p._element.getparent().remove(p._element)

    doc.save('Master-Proccess-Doc.docx')
    print("Master-Proccess-Doc.docx successfully updated with reordered commands.")

if __name__ == '__main__':
    reorder_commands()
