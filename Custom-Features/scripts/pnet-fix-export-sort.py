#!/usr/bin/env python3
"""
Forwarding proxy / synchronized copy of pnet-fix-export-sort.py
Primary authoritative module is in Custom-Customization/scripts/pnet-fix-export-sort.py
"""
import os
import sys

PRIMARY = "/opt/PNET/Custom-Customization/scripts/pnet-fix-export-sort.py"
LOCAL_PRIMARY = os.path.join(os.path.dirname(__file__), "../../Custom-Customization/scripts/pnet-fix-export-sort.py")

if os.path.isfile(LOCAL_PRIMARY):
    with open(LOCAL_PRIMARY, "r", encoding="utf-8") as f:
        exec(f.read())
elif os.path.isfile(PRIMARY):
    with open(PRIMARY, "r", encoding="utf-8") as f:
        exec(f.read())
else:
    print("[✘] Primary pnet-fix-export-sort.py not found.")
    sys.exit(1)
