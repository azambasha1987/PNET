import docx
from docx.shared import Pt

doc = docx.Document('Master-Proccess-Doc.docx')

prompt_text = (
    '"Satellite worker node clustering has been successfully completed. Please initiate '
    'the Multi-Node Cluster Live VM verification protocol: verify satellite daemon connectivity '
    "('pnet-satd', 'pnet-brokerd') and host health in the Operations Center, execute distributed "
    "test labs for 'Custom Performance' (remote node compute density, Ultra-KSM on worker nodes), "
    "'Custom Features' (cross-node console proxying, cluster placement, SLA ping mesh), and "
    "'Custom Customization' (synchronized templates across cluster), capture and organize "
    'verification screenshots into their respective Desktop folders, and log all telemetry and '
    'test results into the Version-process/ directory."'
)

target_idx = None
for i, p in enumerate(doc.paragraphs):
    if 'After clustering the one or more satellite node' in p.text:
        target_idx = i
        break

if target_idx is None:
    raise RuntimeError("Target paragraph not found")

print(f"Found target paragraph at index {target_idx}")

# Set instruction paragraph
doc.paragraphs[target_idx].text = "After clustering one or more satellite nodes to the master node, the user then uses the below prompt for live VM testing:"
if doc.paragraphs[target_idx].runs:
    doc.paragraphs[target_idx].runs[0].font.size = Pt(10)

# Set prompt paragraph
prompt_para = doc.paragraphs[target_idx + 1]
prompt_para.text = ""
r = prompt_para.add_run(prompt_text)
r.font.size = Pt(10)
r.font.bold = True
r.font.italic = True

# Clean up empty paragraphs between prompt and Step 1
# Locate 'Step 1: Live VM Verification'
step1_idx = None
for j in range(target_idx + 2, min(len(doc.paragraphs), target_idx + 10)):
    if 'Step 1: Live VM Verification' in doc.paragraphs[j].text:
        step1_idx = j
        break

if step1_idx is not None:
    # We want exactly 1 empty paragraph between prompt and Step 1
    empty_paras = list(range(target_idx + 2, step1_idx))
    # Keep the first empty paragraph (target_idx + 2), remove the rest in reverse
    for p_i in reversed(empty_paras[1:]):
        p_elem = doc.paragraphs[p_i]._element
        p_elem.getparent().remove(p_elem)

doc.save('Master-Proccess-Doc.docx')
print("Saved Master-Proccess-Doc.docx successfully.")
