#!/usr/bin/env python3
"""
PNetLab Lab Header Modernizer: Option 2 Executive Titanium & Amber Gold (CCIE Elite)
Standardized Compact 280px x 50px Footprint & Geometric Topology-Alignment Engine
"""

import os
import sys
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

def parse_shape_box(shape_elem):
    data = shape_elem.find('data')
    if data is None or not data.text:
        return None
    txt = data.text
    tm = re.search(r'top:\s*(-?\d+)px', txt)
    lm = re.search(r'left:\s*(-?\d+)px', txt)
    wm = re.search(r'width:\s*(-?\d+)px', txt)
    hm = re.search(r'height:\s*(-?\d+)px', txt)
    if tm and lm:
        t = int(tm.group(1))
        l = int(lm.group(1))
        w = int(wm.group(1)) if wm else 0
        h = int(hm.group(1)) if hm else 0
        return {'top': t, 'left': l, 'width': w, 'height': h, 'right': l + w, 'bottom': t + h, 'name': shape_elem.get('name', '')}
    return None

def calculate_lab_coords(root):
    nodes = root.findall('.//node')
    networks = root.findall('.//network')
    shapes = [parse_shape_box(s) for s in root.findall('.//textobject') if s.get('type') == 'shape']
    shapes = [s for s in shapes if s is not None and s['width'] > 0 and s['height'] > 0]
    
    xs = []
    ys = []
    for n in nodes:
        try:
            x = int(n.get('left', '0'))
            y = int(n.get('top', '0'))
            if x > 0: xs.append(x)
            if y > 0: ys.append(y)
        except ValueError:
            pass
    for net in networks:
        try:
            x = int(net.get('left', '0'))
            y = int(net.get('top', '0'))
            if x > 0: xs.append(x)
            if y > 0: ys.append(y)
        except ValueError:
            pass
            
    min_node_y = min(ys) if ys else 9999
    min_node_x = min(xs) if xs else 9999
    max_node_x = max(xs) if xs else 0
    
    # 1. Check for perimeter enclosing container shape docked at the top
    enclosing_container = None
    if shapes:
        for s in shapes:
            s_name = s['name'].lower()
            if s['top'] <= min_node_y + 30:
                if any(k in s_name for k in ['domain', 'perimeter', 'main', 'boundary']):
                    enclosing_container = s
                    break
                if s['width'] >= 500 and s['height'] >= 220:
                    if xs and min_node_x >= s['left'] - 60 and max_node_x <= s['right'] + 60:
                        enclosing_container = s
                        break
        if enclosing_container is None and len(shapes) == 1 and shapes[0]['width'] >= 450:
            if shapes[0]['top'] <= min_node_y + 30:
                enclosing_container = shapes[0]

    # Dock directly across the top container boundary
    if enclosing_container is not None:
        x_mid = (enclosing_container['left'] + enclosing_container['right']) // 2
        top_dock = max(15, enclosing_container['top'] - 28)
        left = max(40, x_mid - 140)
        return top_dock, left

    # 2. Standard Topology Centering across all items
    all_xs = list(xs)
    all_ys = list(ys)
    for s in shapes:
        all_xs.extend([s['left'], s['right']])
        all_ys.append(s['top'])
        
    if not all_xs or not all_ys:
        return 25, 400
        
    min_x, max_x = min(all_xs), max(all_xs)
    min_y = min(all_ys)
    
    x_mid = (min_x + max_x) // 2
    left = max(40, x_mid - 140)
    
    if min_y >= 120:
        top = min(110, min_y - 70)
    elif min_y >= 75:
        top = max(15, min_y - 55)
    else:
        top = 15
        
    return top, left

def generate_compact_header_html(header_id, top, left, badge, title, subtitle):
    top = max(15, top)
    left = max(40, left)
    
    # Dynamic badge pill calculation
    badge_len = len(badge)
    badge_w = int(max(70, min(240, badge_len * 5.8 + 16)))
    badge_x = -badge_w // 2
    
    # Title styling & length compression
    title_len = len(title)
    if title_len > 35:
        title_attrs = 'font-size="10.5" font-weight="800" textLength="260" lengthAdjust="spacingAndGlyphs"'
    elif title_len > 25:
        title_attrs = 'font-size="11.5" font-weight="800" textLength="260" lengthAdjust="spacingAndGlyphs"'
    elif title_len > 18:
        title_attrs = 'font-size="12" font-weight="800" letter-spacing="0.5"'
    else:
        title_attrs = 'font-size="12.5" font-weight="800" letter-spacing="0.5"'
        
    # Subtitle styling & length compression
    sub_len = len(subtitle)
    if sub_len > 45:
        sub_attrs = 'font-size="6.8" font-weight="600" textLength="265" lengthAdjust="spacingAndGlyphs"'
    elif sub_len > 32:
        sub_attrs = 'font-size="7.2" font-weight="600"'
    else:
        sub_attrs = 'font-size="7.8" font-weight="600" letter-spacing="0.2"'
        
    # Escape XML entities
    badge_esc = badge.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    title_esc = title.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    sub_esc = subtitle.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    html = (
        f'<div id="customText{header_id}" class="customShape customText context-menu ck-content pnq-header-wrapper" '
        f'data-path="{header_id}" data-pnet-text="header" name="Lab_Header" '
        f'style="position:absolute; display:inline-block; top:{top}px; left:{left}px; width:280px; height:50px; cursor:move; z-index:1000; '
        f'padding:0; margin:0; background:transparent !important; border:none !important; box-sizing:border-box;">'
        f'<div class="pnq-executive-card" style="display:flex; justify-content:center; align-items:center; box-sizing:border-box; '
        f'background:linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98)); '
        f'padding:4px 8px; border-radius:8px; border:1px solid rgba(245, 158, 11, 0.45); '
        f'border-top:2.5px solid #f59e0b; box-shadow:0 6px 18px -3px rgba(0, 0, 0, 0.75), 0 0 14px rgba(245, 158, 11, 0.12); '
        f'backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); width:100%; height:100%; overflow:hidden; position:relative;">'
        f'<svg viewBox="0 0 280 46" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block; overflow:visible; pointer-events:none;" xmlns="http://www.w3.org/2000/svg">'
        f'<g transform="translate(140, 9)">'
        f'<rect x="{badge_x}" y="-7" width="{badge_w}" height="14" rx="3" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-opacity="0.4" stroke-width="1"/>'
        f'<text text-anchor="middle" y="3.5" fill="#fbbf24" font-family="\'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="7.5" font-weight="700" letter-spacing="0.8">{badge_esc}</text>'
        f'</g>'
        f'<text x="140" y="27" text-anchor="middle" fill="#f8fafc" font-family="\'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" {title_attrs}>{title_esc}</text>'
        f'<text x="140" y="40" text-anchor="middle" fill="#94a3b8" font-family="\'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" {sub_attrs}>{sub_esc}</text>'
        f'</svg>'
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
            top, left = calculate_lab_coords(root)
            
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
                data_elem = to.find('data')
                d_text = data_elem.text if data_elem is not None and data_elem.text else ''
                
                if to_name in ['lab_header', 'title banner', 'header', 'title'] or 'Lab_Header' in d_text:
                    header_to = to
                    break
                    
            if header_to is not None:
                header_id = header_to.get('id', '1')
                new_html = generate_compact_header_html(header_id, top, left, badge, title, subtitle)
                if not dry_run:
                    data_elem = header_to.find('data')
                    if data_elem is None:
                        data_elem = ET.SubElement(header_to, 'data')
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
                
                new_html = generate_compact_header_html(next_id, top, left, badge, title, subtitle)
                if not dry_run:
                    new_to = ET.SubElement(textobjects, 'textobject', {'id': str(next_id), 'name': 'Lab_Header', 'type': 'text'})
                    data_elem = ET.SubElement(new_to, 'data')
                    data_elem.text = new_html
                updated_count += 1
                
            if not dry_run:
                tree.write(lab_path, encoding='utf-8', xml_declaration=True)
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
            
    print(f"\n--- COMPACT 280x50 BATCH COMPLETE ---")
    print(f"Total Labs Processed:     {len(unl_files)}")
    print(f"Labs Updated:             {updated_count}")
    print(f"Errors Encountered:       {error_count}")

if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    process_all_labs(dry_run=dry_run)
