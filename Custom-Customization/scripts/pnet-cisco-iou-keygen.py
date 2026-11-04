#!/usr/bin/env python3
# Cisco IOU License Generator — Kal 2011 (python3 port of the 2006 C version).
#
# Generates the host-locked IOU license and writes /opt/unetlab/addons/iol/bin/iourc
# for THIS host (the key is derived from hostid+hostname).

import os
import sys
import socket
import hashlib
import struct

def generate_key():
    hostid_str = os.popen("hostid").read().strip()
    try:
        hostid = int(hostid_str, 16)
    except Exception:
        hostid = 0
    hostname = socket.gethostname()

    ioukey = hostid
    for ch in hostname:
        ioukey += ord(ch)

    iou_pad1 = b'\x4B\x58\x21\x81\x56\x7B\x0D\xF3\x21\x43\x9B\x7E\xAC\x1D\xE6\x8A'
    iou_pad2 = b'\x80' + 39 * b'\x00'
    md5input = iou_pad1 + iou_pad2 + struct.pack('!L', ioukey) + iou_pad1
    license_key = hashlib.md5(md5input).hexdigest()[:16]
    return hostid_str, hostname, hex(ioukey)[2:], license_key

if __name__ == "__main__":
    hostid, hostname, ioukey_hex, license_key = generate_key()
    print(f"hostid={hostid}, hostname={hostname}, ioukey={ioukey_hex}")
    print(f"[license]\n{hostname} = {license_key};")

    if "--print" not in sys.argv:
        iourc_path = os.environ.get("IOURC", "/opt/unetlab/addons/iol/bin/iourc")
        try:
            os.makedirs(os.path.dirname(iourc_path), exist_ok=True)
            with open(iourc_path, "w") as fh:
                fh.write(f"[license]\n{hostname} = {license_key};\n")
            os.chmod(iourc_path, 0o644)
            print(f"Wrote {iourc_path}")
        except OSError as exc:
            sys.stderr.write(f"ERROR: could not write {iourc_path}: {exc}\n")
            sys.exit(1)

