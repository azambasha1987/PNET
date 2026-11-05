import docx
from docx.shared import Pt

def fix_satellite_commands():
    doc = docx.Document('Master-Proccess-Doc.docx')

    # 1. Locate paragraph 66 ('  - Satellite Installer: /opt/pnet/install/install-satellite.sh')
    sat_p = None
    for i, p in enumerate(doc.paragraphs):
        if 'Satellite Installer: /opt/pnet/install/install-satellite.sh' in p.text:
            sat_p = p
            break

    if not sat_p:
        raise ValueError("Could not find Satellite Installer line in document")

    # Helper to insert before sat_p
    def insert_before(text, style='List Paragraph', size_pt=8.0):
        p = sat_p.insert_paragraph_before()
        p.style = style
        if text:
            r = p.add_run(text)
            r.font.size = Pt(size_pt)
        return p

    # Insert the formatted satellite block before sat_p
    insert_before("  - Satellite Installer: ", style='List Paragraph', size_pt=9.0)
    insert_before("", style='List Paragraph')
    insert_before("cd /opt/PNET", style='List Paragraph', size_pt=8.0)
    insert_before("ln -sfn /opt/PNET /opt/pnet", style='List Paragraph', size_pt=8.0)
    insert_before("chmod +x install/*.sh apply-all-custom.sh", style='List Paragraph', size_pt=8.0)
    insert_before("bash install/install-satellite.sh", style='List Paragraph', size_pt=8.0)
    insert_before("", style='List Paragraph')

    # Now remove the old sat_p
    sat_p._element.getparent().remove(sat_p._element)

    # 2. Also update under '• What Script to Run on the Live VM:'
    # Let's check paragraphs for 'For Satellite Compute Worker Node'
    for i, p in enumerate(doc.paragraphs):
        if 'For Satellite Compute Worker Node' in p.text:
            # Check following paragraphs
            p1 = doc.paragraphs[i+1]
            p2 = doc.paragraphs[i+2]
            if 'cd /opt/pnet' in p1.text:
                p1.text = '       cd /opt/PNET'
                if p1.runs:
                    p1.runs[0].font.size = Pt(9.0)
            if 'install-satellite.sh' in p2.text:
                # Add symlink and chmod before running
                p_ln = p2.insert_paragraph_before()
                p_ln.style = 'List Paragraph'
                r = p_ln.add_run('       ln -sfn /opt/PNET /opt/pnet')
                r.font.size = Pt(9.0)
                
                p_chmod = p2.insert_paragraph_before()
                p_chmod.style = 'List Paragraph'
                r = p_chmod.add_run('       chmod +x install/*.sh apply-all-custom.sh')
                r.font.size = Pt(9.0)
            break

    # Also normalize Master node under '• What Script to Run on the Live VM:' for consistency
    for i, p in enumerate(doc.paragraphs):
        if 'For Standalone Master Node' in p.text:
            p1 = doc.paragraphs[i+1]
            p2 = doc.paragraphs[i+2]
            if 'cd /opt/pnet' in p1.text:
                p1.text = '       cd /opt/PNET'
                if p1.runs:
                    p1.runs[0].font.size = Pt(9.0)
            if 'install-master.sh' in p2.text:
                p_ln = p2.insert_paragraph_before()
                p_ln.style = 'List Paragraph'
                r = p_ln.add_run('       ln -sfn /opt/PNET /opt/pnet')
                r.font.size = Pt(9.0)
                
                p_chmod = p2.insert_paragraph_before()
                p_chmod.style = 'List Paragraph'
                r = p_chmod.add_run('       chmod +x install/*.sh apply-all-custom.sh')
                r.font.size = Pt(9.0)
            break

    doc.save('Master-Proccess-Doc.docx')
    print("Master-Proccess-Doc.docx updated successfully with satellite commands.")

if __name__ == '__main__':
    fix_satellite_commands()
