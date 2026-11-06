#!/usr/bin/env python3
"""
PNetLab Lab Header Modernizer: Option 2 Executive Titanium & Amber Gold (CCIE Elite)
Applies the executive dark-titanium frosted glass container card with solid amber gold top accent bar,
glowing uppercase title, gold pill badge, and silver subtitle across all labs.
"""

import os
import glob
import re
import shutil
import xml.etree.ElementTree as ET
from datetime import datetime

LABS_DIR = '/opt/unetlab/labs'

def get_badge(cat_raw, sub_raw=""):
    c = cat_raw.upper()
    s = sub_raw.upper() if sub_raw else ""
    
    if 'SDWAN' in c or 'SD-WAN' in c:
        prefix = "CISCO SD-WAN"
    elif 'INTERVIEW' in c:
        prefix = "CORE INTERVIEW"
    elif 'CCIE' in c or 'E I' in c:
        prefix = "CCIE ENTERPRISE"
    elif 'CCNA' in c or 'BASICS' in c:
        prefix = "CISCO CCNA"
    elif 'DC' in c or 'NEXUS' in c:
        prefix = "CISCO DATA CENTER"
    elif 'JUNIPER' in c:
        prefix = "JUNIPER NETWORKS"
    elif 'F5' in c:
        prefix = "F5 BIG-IP"
    elif 'SECURITY' in c or 'WIRELESS' in c:
        prefix = "SECURITY & WIRELESS"
    elif 'AUTOMATION' in c:
        prefix = "NETWORK AUTOMATION"
    elif 'AI' in c:
        prefix = "AI & MACHINE LEARNING"
    else:
        clean = re.sub(r'^\d+\s*[-_]\s*', '', cat_raw)
        clean = re.sub(r'-(Universal|Desktop)', '', clean, flags=re.IGNORECASE).strip(' -_')
        prefix = clean.upper()
        
    sub_clean = ""
    if s:
        sub_clean = re.sub(r'^\d+\s*[-_]\s*', '', sub_raw)
        sub_clean = sub_clean.replace('-', ' ').replace('_', ' ').strip(' -_').upper()
        sub_clean = re.sub(r'\s+', ' ', sub_clean)
        if sub_clean in prefix or prefix in sub_clean:
            sub_clean = ""
            
    if sub_clean:
        return f"{prefix} • {sub_clean}"
    return prefix

def parse_lab_metadata(lab_path, root):
    rel_path = os.path.relpath(lab_path, LABS_DIR)
    parts = rel_path.split(os.sep)
    
    # 1. Category Badge
    cat_raw = parts[0] if len(parts) > 1 else ""
    sub_raw = parts[1] if len(parts) > 2 else ""
    badge = get_badge(cat_raw, sub_raw)
    
    # 2. Lab Title
    filename = os.path.splitext(os.path.basename(lab_path))[0]
    title = filename
    title = re.sub(r'^[0-9]+[a-zA-Z]?\s*[-_]\s*', '', title)
    title = re.sub(r'^Lab\s*[-_0-9]*\s*[-_:]?\s*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'__+[0-9A-Fa-f]+$', '', title)
    title = re.sub(r'_\d{10,}$', '', title)
    title = title.replace('_', ' ').replace('-', ' ').strip()
    title = re.sub(r'\s+', ' ', title).strip()
    
    # 3. Contextual Subtitle
    p_lower = rel_path.lower()
    if 'bgp' in p_lower:
        subtitle = "Path Selection • Policy Enforcement • Autonomous System Interconnect"
    elif 'ospfv3' in p_lower:
        subtitle = "OSPFv3 IPv6 Routing • Multi-Area LSA Flooding • Adjacency Analysis"
    elif 'ospf' in p_lower:
        subtitle = "Link-State Routing • Multi-Area Architecture • LSA Convergence"
    elif 'sdwan' in p_lower or 'sd-wan' in p_lower:
        subtitle = "Cisco Catalyst SD-WAN Fabric • Control Plane & Data Plane Telemetry"
    elif 'switching' in p_lower or 'stp' in p_lower or 'trunk' in p_lower or 'etherchannel' in p_lower:
        subtitle = "Enterprise Layer 2 Switching • Loop Prevention & Port Aggregation"
    elif 'nexus' in p_lower or 'dc' in p_lower or 'vxlan' in p_lower:
        subtitle = "Cisco Nexus Datacenter Fabric • VXLAN EVPN & High Availability"
    elif 'ipv6' in p_lower:
        subtitle = "Next-Generation IPv6 Protocol Architecture & Dual-Stack Routing"
    elif 'eigrp' in p_lower:
        subtitle = "Advanced Distance Vector Routing • Named Mode • Convergence Optimization"
    elif 'mpls' in p_lower:
        subtitle = "Multi-Protocol Label Switching • L3VPN Architecture • Core Label Swapping"
    elif 'security' in p_lower or 'ise' in p_lower or 'asa' in p_lower:
        subtitle = "Enterprise Perimeter Security • Identity Management & Policy Enforcement"
    elif 'wireless' in p_lower:
        subtitle = "Enterprise Wireless LAN Architecture • WLC Controller & AP Telemetry"
    elif 'automation' in p_lower or 'python' in p_lower or 'ai' in p_lower:
        subtitle = "Network Automation Pipeline • Model-Driven Telemetry • RESTCONF & NETCONF"
    else:
        subtitle = "Topology Verification • Scenario Implementation • Enterprise Standards"
        
    return badge, title.upper(), subtitle

def extract_pos_from_style(style_str):
    top = 25
    left = 350
    top_match = re.search(r'top:\s*(-?\d+)px', style_str)
    if top_match:
        top = int(top_match.group(1))
    left_match = re.search(r'left:\s*(-?\d+)px', style_str)
    if left_match:
        left = int(left_match.group(1))
    return top, left

def calculate_lab_coords(root):
    nodes = root.findall('.//node')
    if not nodes:
        return 25, 400
    
    xs, ys = [], []
    for n in nodes:
        try:
            x = int(n.get('left', '0'))
            y = int(n.get('top', '0'))
            if x > 0 and y > 0:
                xs.append(x)
                ys.append(y)
        except ValueError:
            pass
            
    if not xs or not ys:
        return 25, 400
        
    min_x, max_x = min(xs), max(xs)
    min_y = min(ys)
    
    center_x = (min_x + max_x) // 2
    left = max(60, center_x - 300)
    top = max(18, min(75, min_y - 120)) if min_y >= 130 else 20
    return top, left

def generate_header_html(header_id, top, left, badge, title, subtitle):
    top = max(15, top)
    left = max(40, left)
    
    html = (
        f'<div id="customText{header_id}" class="customShape customText context-menu ck-content pnq-header-wrapper" '
        f'data-path="{header_id}" data-pnet-text="header" name="Lab_Header" '
        f'style="position:absolute; display:inline-block; top:{top}px; left:{left}px; cursor:move; z-index:1000; '
        f'padding:0; margin:0; background:transparent !important; border:none !important;">'
        f'<div class="pnq-executive-card" style="display:inline-block; text-align:center; box-sizing:border-box; '
        f'background:linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98)); '
        f'padding:16px 42px 18px 42px; border-radius:12px; border:1px solid rgba(245, 158, 11, 0.45); '
        f'border-top:3px solid #f59e0b; box-shadow:0 12px 32px -4px rgba(0, 0, 0, 0.8), 0 0 25px rgba(245, 158, 11, 0.15); '
        f'backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); min-width:480px; max-width:850px;">'
        f'<div class="pnq-card-badge-wrap" style="margin:0 0 6px 0; line-height:1;">'
        f'<span class="pnq-card-badge" style="display:inline-block; padding:3px 12px; border-radius:4px; '
        f'background:rgba(245, 158, 11, 0.12); border:1px solid rgba(245, 158, 11, 0.4); font-size:11px; '
        f'font-weight:700; color:#fbbf24; letter-spacing:1.5px; text-transform:uppercase; '
        f'font-family:\'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">{badge}</span>'
        f'</div>'
        f'<div class="pnq-card-title" style="font-size:24px; font-weight:800; color:#f8fafc; letter-spacing:0.8px; margin:0; '
        f'line-height:1.25; text-transform:uppercase; text-shadow:0 0 14px rgba(245, 158, 11, 0.4); '
        f'font-family:\'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">{title}</div>'
        f'<div class="pnq-card-subtitle" style="font-size:12px; font-weight:600; color:#94a3b8; margin:6px 0 0 0; '
        f'line-height:1.35; letter-spacing:0.4px; '
        f'font-family:\'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">{subtitle}</div>'
        f'</div>'
        f'</div>'
    )
    return html

def process_all_labs(dry_run=False):
    unl_files = sorted(glob.glob(f'{LABS_DIR}/**/*.unl', recursive=True))
    print(f"Total labs located: {len(unl_files)}")
    
    updated_count = 0
    error_count = 0
    
    for lab_path in unl_files:
        try:
            tree = ET.parse(lab_path)
            root = tree.getroot()
            
            badge, title, subtitle = parse_lab_metadata(lab_path, root)
            
            # Find objects container
            objects = root.find('objects')
            if objects is None:
                objects = ET.SubElement(root, 'objects')
            textobjects = objects.find('textobjects')
            if textobjects is None:
                textobjects = ET.SubElement(objects, 'textobjects')
                
            # Search for existing header
            header_to = None
            for to in textobjects.findall('textobject'):
                to_name = to.get('name', '').lower()
                to_id = to.get('id', '')
                to_type = to.get('type', '')
                data_elem = to.find('data')
                d_text = data_elem.text if data_elem is not None and data_elem.text else ''
                
                if to_name in ['lab_header', 'title banner', 'header', 'title'] or 'Lab_Header' in d_text:
                    header_to = to
                    break
                    
            if header_to is not None:
                header_id = header_to.get('id', '1')
                data_elem = header_to.find('data')
                existing_html = data_elem.text if data_elem is not None and data_elem.text else ''
                top, left = extract_pos_from_style(existing_html)
                if top < 10 or top > 150:
                    c_top, c_left = calculate_lab_coords(root)
                    top = c_top
                    
                new_html = generate_header_html(header_id, top, left, badge, title, subtitle)
                if not dry_run:
                    data_elem.text = new_html
                    header_to.set('name', 'Lab_Header')
                    header_to.set('type', 'text')
                updated_count += 1
            else:
                existing_ids = []
                for to in textobjects.findall('textobject'):
                    try:
                        existing_ids.append(int(to.get('id', '0')))
                    except ValueError:
                        pass
                next_id = 1 if 1 not in existing_ids else (max(existing_ids) + 1 if existing_ids else 1)
                
                top, left = calculate_lab_coords(root)
                new_html = generate_header_html(next_id, top, left, badge, title, subtitle)
                if not dry_run:
                    new_to = ET.SubElement(textobjects, 'textobject', {'id': str(next_id), 'name': 'Lab_Header', 'type': 'text'})
                    data_elem = ET.SubElement(new_to, 'data')
                    data_elem.text = new_html
                updated_count += 1
                
            if not dry_run:
                tree.write(lab_path, encoding='utf-8', xml_declaration=True)
                # Ensure permissions
                try:
                    import pwd, grp
                    uid = pwd.getpwnam('www-data').pw_uid
                    gid = grp.getgrnam('www-data').gr_gid
                    os.chown(lab_path, uid, gid)
                    os.chmod(lab_path, 0o664)
                except Exception:
                    pass
                    
        except Exception as e:
            error_count += 1
            print(f"Error on {lab_path}: {e}")
            
    print(f"\n--- BATCH COMPLETE ---")
    print(f"Total Labs Processed:     {len(unl_files)}")
    print(f"Labs Updated:             {updated_count}")
    print(f"Errors Encountered:       {error_count}")

if __name__ == '__main__':
    process_all_labs()
