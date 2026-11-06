#!/usr/bin/env python3
"""
PNetLab Live Node Memory & Ultra-KSM Telemetry Tool
Platform: Ubuntu 24.04 / 26.04 LTS (PNetLab Tri-Pillar Architecture)
Reports real-time memory metrics for all running lab nodes (QEMU, IOL, VPCS, Docker)
distinguishing between virtual Resident Set Size (RSS), Kernel Samepage Merging (KSM),
and actual host physical memory consumption (PSS / Private Dirty).
"""

import os
import glob
import re
import sys

def format_table():
    processes = []
    NULL_BYTE = bytes([0])
    
    # Scan for QEMU, IOL, VPCS processes
    for p in glob.glob('/proc/[0-9]*/cmdline'):
        try:
            pid = p.split('/')[2]
            with open(p, 'rb') as f:
                cmd_raw = f.read()
            
            p_type = None
            name = None
            
            if b'qemu-system' in cmd_raw:
                p_type = 'QEMU'
                parts = cmd_raw.split(NULL_BYTE)
                if b'-name' in parts:
                    idx = parts.index(b'-name')
                    name = parts[idx+1].decode('utf-8', errors='ignore')
            elif b'pnet_iol_exec' in cmd_raw or b'adventerprise' in cmd_raw:
                p_type = 'IOL'
                name = 'IOL-Router'
            elif b'vpcs' in cmd_raw:
                p_type = 'VPCS'
                parts = cmd_raw.split(NULL_BYTE)
                if b'-N' in parts:
                    idx = parts.index(b'-N')
                    name = parts[idx+1].decode('utf-8', errors='ignore')
            
            if not p_type:
                continue
                
            name = name or f"PID-{pid}"
            
            rss = 0
            pss = 0
            ksm = 0
            p_dirty = 0
            
            try:
                with open(f"/proc/{pid}/smaps_rollup", "r") as f:
                    for line in f:
                        if line.startswith("Rss:"):
                            rss = int(line.split()[1])
                        elif line.startswith("Pss:"):
                            pss = int(line.split()[1])
                        elif line.startswith("KSM:"):
                            ksm = int(line.split()[1])
                        elif line.startswith("Private_Dirty:"):
                            p_dirty = int(line.split()[1])
            except Exception:
                pass
                
            if rss == 0:
                try:
                    with open(f"/proc/{pid}/status", "r") as f:
                        for line in f:
                            if line.startswith("VmRSS:"):
                                rss = int(line.split()[1])
                except Exception:
                    pass
            
            savings_pct = (ksm / rss * 100.0) if rss > 0 and ksm > 0 else 0.0
            
            processes.append({
                "pid": pid,
                "type": p_type,
                "name": name,
                "rss_mb": rss / 1024.0,
                "pss_mb": pss / 1024.0,
                "ksm_mb": ksm / 1024.0,
                "pdirty_mb": p_dirty / 1024.0,
                "savings_pct": savings_pct
            })
        except Exception:
            continue
            
    try:
        with open("/sys/kernel/mm/ksm/pages_sharing", "r") as f:
            ksm_sharing = int(f.read().strip()) * 4 / 1024.0
    except Exception:
        ksm_sharing = 0.0

    # Read host meminfo
    total_mem = 0
    free_mem = 0
    avail_mem = 0
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    total_mem = int(line.split()[1]) / 1024.0
                elif line.startswith("MemAvailable:"):
                    avail_mem = int(line.split()[1]) / 1024.0
                elif line.startswith("MemFree:"):
                    free_mem = int(line.split()[1]) / 1024.0
    except Exception:
        pass

    used_mem = total_mem - avail_mem

    print("=" * 95)
    print(" " * 22 + "PNetLab Live Node Memory & Ultra-KSM Telemetry")
    print("=" * 95)
    print(f"{'Node Name':<22} {'Type':<6} {'PID':<8} {'Resident(RSS)':<15} {'KSM Shared':<14} {'Real Host(PSS)':<15} {'Saved %':<8}")
    print("-" * 95)
    
    total_rss = 0.0
    total_pss = 0.0
    total_ksm = 0.0
    
    for p in sorted(processes, key=lambda x: (x['type'], x['name'])):
        print(f"{p['name']:<22} {p['type']:<6} {p['pid']:<8} {p['rss_mb']:>7.1f} MB     {p['ksm_mb']:>7.1f} MB    {p['pss_mb']:>7.1f} MB        {p['savings_pct']:>5.1f}%")
        total_rss += p['rss_mb']
        total_pss += p['pss_mb']
        total_ksm += p['ksm_mb']
        
    print("-" * 95)
    print(f"Total Active Nodes: {len(processes)} | Cumulative Process RSS: {total_rss:.1f} MB (~{total_rss/1024:.2f} GB)")
    print(f"Actual Physical Host RAM Consumed by Nodes (PSS): {total_pss:.1f} MB (~{total_pss/1024:.2f} GB)")
    print(f"Kernel Samepage Merging (Ultra-KSM) Physical RAM Saved: {ksm_sharing:.1f} MB (~{ksm_sharing/1024:.2f} GB)")
    print(f"Host Total Memory: {total_mem:.0f} MB (~{total_mem/1024:.1f} GB) | Used: {used_mem:.0f} MB | Free Available: {avail_mem:.0f} MB")
    print("=" * 95)

if __name__ == '__main__':
    format_table()
