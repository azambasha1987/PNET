import docx
from docx.shared import Pt

doc = docx.Document('Master-Proccess-Doc.docx')

prompt_text = (
    '"Satellite worker node clustering has been successfully completed. Please initiate '
    'the Multi-Node Cluster Live VM verification protocol: verify satellite daemon connectivity '
    "('pnet-satd', 'pnet-brokerd') and host health in the Operations Center. Execute dual verification "
    "test labs across both Master and Satellite nodes for 'Custom Performance' (Lab 1.1 Master vs Lab 1.2 SAT; "
    "Ultra-KSM memory deduplication and vCPU scaling), 'Custom Features' (Lab 2.1 Master vs Lab 2.2 SAT; "
    "Operations Center, docked consoles, syntax highlighter, SLA ping mesh), and 'Custom Customization' "
    "(Lab 3.1 Master vs Lab 3.2 SAT; Cyber-Glass portal, OLED dark theme, keepalive, templates). Capture and "
    "organize verification screenshots into their respective Desktop folders ('Custom Performance Test-Master'/"
    "'Custom Performance Test-SAT', 'Custom Features Test-Master'/'Custom Features Test-SAT', and "
    "'Custom Customization Test-Master'/'Custom Customization Test-SAT'), and log all findings and "
    'verification evidence into the Version-process/ directory."'
)

# 1. Update the prompt paragraph
for i, p in enumerate(doc.paragraphs):
    if "After clustering one or more satellite nodes to the master node" in p.text:
        # Prompt is the next paragraph
        prompt_para = doc.paragraphs[i + 1]
        prompt_para.text = ""
        r = prompt_para.add_run(prompt_text)
        r.font.size = Pt(10)
        r.font.bold = True
        r.font.italic = True
        print(f"Updated prompt at paragraph {i + 1}")
        break

# 2. Locate and rebuild the Satellite Step 1 & Step 2 section
# Find the second occurrence of 'Step 1: Live VM Verification & Test Labs'
step1_indices = [idx for idx, p in enumerate(doc.paragraphs) if 'Step 1: Live VM Verification & Test Labs' in p.text]
print("Step 1 indices:", step1_indices)

if len(step1_indices) >= 2:
    sat_step1_idx = step1_indices[1]
    # Locate where the next section starts, which is '1.2 Upstream Release Ingestion Architecture'
    next_sec_idx = None
    for j in range(sat_step1_idx, len(doc.paragraphs)):
        if "1.2 Upstream Release Ingestion Architecture" in doc.paragraphs[j].text:
            next_sec_idx = j
            break
    
    print(f"Satellite Step 1 starts at {sat_step1_idx}, next section at {next_sec_idx}")
    
    # Target content to replace all paragraphs between sat_step1_idx and next_sec_idx - 1
    polished_lines = [
        ("Step 1: Live VM Verification & Test Labs", True, False, 10.0),
        ("  • Action: The user performs live verification across dedicated test labs covering both Master and Satellite compute nodes:", False, False, 10.0),
        ('    1.1 Lab 1.1: "Custom Performance-Master": Boot IOSv and Cisco C8000v appliances. Verify Ultra-KSM memory deduplication (<64MB for IOL, ~1.6GB for C8000v) and vCPU idle scaling on Master node. Capture a screenshot and save it on the Desktop in the folder "Custom Performance Test-Master".', False, False, 10.0),
        ('    1.2 Lab 1.2: "Custom Performance-SAT": Boot IOSv and Cisco C8000v appliances. Verify Ultra-KSM memory deduplication (<64MB for IOL, ~1.6GB for C8000v) and vCPU idle scaling on Satellite nodes. Capture a screenshot and save it on the Desktop in the folder "Custom Performance Test-SAT".', False, False, 10.0),
        ('    2.1 Lab 2.1: "Custom Features-Master": Boot virtual nodes and test Operations Center, docked multi-tab console drawer, syntax highlighting, SLA ping mesh, and cloud bridge on Master node. Capture a screenshot and save it on the Desktop in the folder "Custom Features Test-Master".', False, False, 10.0),
        ('    2.2 Lab 2.2: "Custom Features-SAT": Boot virtual nodes and test Operations Center, docked multi-tab console drawer, syntax highlighting, SLA ping mesh, and cloud bridge on Satellite nodes. Capture a screenshot and save it on the Desktop in the folder "Custom Features Test-SAT".', False, False, 10.0),
        ('    3.1 Lab 3.1: "Custom Customization-Master": Verify the Cyber-Glass holographic login portal, Pure Black OLED dark theme, sliding session keepalive, and Ollama MCP copilot on Master node. Capture a screenshot and save it on the Desktop in the folder "Custom Customization Test-Master".', False, False, 10.0),
        ('    3.2 Lab 3.2: "Custom Customization-SAT": Verify the Cyber-Glass holographic login portal, Pure Black OLED dark theme, sliding session keepalive, and Ollama MCP copilot on Satellite nodes. Capture a screenshot and save it on the Desktop in the folder "Custom Customization Test-SAT".', False, False, 10.0),
        ("Step 2: Issue Resolution & Documentation", True, False, 10.0),
        ("  • Action: If any issues, bugs, or regressions are identified during the live tests, the engineer fixes the code, re-runs dry tests, redeploys, and documents the root cause, fix, and verification steps in the Version-process/ folder.", False, False, 10.0),
        ("", False, False, 10.0),
    ]

    # Remove existing paragraphs from sat_step1_idx to next_sec_idx - 1 (in reverse)
    for p_i in reversed(range(sat_step1_idx, next_sec_idx)):
        p_elem = doc.paragraphs[p_i]._element
        p_elem.getparent().remove(p_elem)

    # Insert polished paragraphs right before next_sec_idx's element
    next_elem = doc.paragraphs[sat_step1_idx]._element  # After deletion, sat_step1_idx is now the next section element

    for text, bold, italic, size_pt in polished_lines:
        p = doc.add_paragraph()
        if text:
            r = p.add_run(text)
            r.font.bold = bold
            r.font.italic = italic
            r.font.size = Pt(size_pt)
        # Move new paragraph element before next_elem
        next_elem.addprevious(p._element)

doc.save('Master-Proccess-Doc.docx')
print("Successfully polished Master-Proccess-Doc.docx!")
