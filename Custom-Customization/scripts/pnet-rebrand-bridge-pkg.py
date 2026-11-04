#!/usr/bin/env python3
import os
import re
import shutil
import subprocess
import hashlib
import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('192.168.1.23', username='root', password='azam')

    rebrand_script = r'''#!/usr/bin/env python3
import os, re, shutil, hashlib

PKG_DIR = '/tmp/rebrand_bridge/pkg'

# 1. Rename files and directories
moves = [
    ('usr/src/pnetlab-bridge-1.0', 'usr/src/azamlabs-bridge-1.0'),
    ('usr/share/pnetlab-bridge-dkms', 'usr/share/azamlabs-bridge-dkms'),
    ('usr/lib/pnetlab', 'usr/lib/azamlabs'),
    ('usr/sbin/pnetlab-bridge-dkms-status', 'usr/sbin/azamlabs-bridge-dkms-status'),
    ('usr/lib/systemd/system/pnetlab-bridge-dkms.service', 'usr/lib/systemd/system/azamlabs-bridge-dkms.service'),
    ('etc/update-motd.d/70-pnetlab-bridge-lacp', 'etc/update-motd.d/70-azamlabs-bridge-lacp'),
    ('etc/kernel/postinst.d/pnetlab-bridge-secureboot', 'etc/kernel/postinst.d/azamlabs-bridge-secureboot'),
    ('etc/kernel/header_postinst.d/pnetlab-bridge-secureboot', 'etc/kernel/header_postinst.d/azamlabs-bridge-secureboot'),
]

for src_rel, dst_rel in moves:
    src = os.path.join(PKG_DIR, src_rel)
    dst = os.path.join(PKG_DIR, dst_rel)
    if os.path.exists(src):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        os.rename(src, dst)
        print(f"Renamed {src_rel} -> {dst_rel}")

# Rename helper scripts inside usr/lib/azamlabs/
lib_helpers = [
    ('usr/lib/azamlabs/pnetlab-bridge-kernel-supported', 'usr/lib/azamlabs/azamlabs-bridge-kernel-supported'),
    ('usr/lib/azamlabs/pnetlab-bridge-lacp-check', 'usr/lib/azamlabs/azamlabs-bridge-lacp-check'),
    ('usr/lib/azamlabs/pnetlab-bridge-secureboot', 'usr/lib/azamlabs/azamlabs-bridge-secureboot')
]
for src_rel, dst_rel in lib_helpers:
    src = os.path.join(PKG_DIR, src_rel)
    dst = os.path.join(PKG_DIR, dst_rel)
    if os.path.exists(src):
        os.rename(src, dst)
        print(f"Renamed helper {src_rel} -> {dst_rel}")

# 2. Add backward compatibility symlinks
symlinks = [
    ('azamlabs-bridge-1.0', 'usr/src/pnetlab-bridge-1.0'),
    ('azamlabs-bridge-dkms', 'usr/share/pnetlab-bridge-dkms'),
    ('azamlabs', 'usr/lib/pnetlab'),
    ('azamlabs-bridge-dkms-status', 'usr/sbin/pnetlab-bridge-dkms-status'),
    ('azamlabs-bridge-dkms.service', 'usr/lib/systemd/system/pnetlab-bridge-dkms.service'),
    ('azamlabs-bridge-secureboot', 'etc/kernel/postinst.d/pnetlab-bridge-secureboot'),
    ('azamlabs-bridge-secureboot', 'etc/kernel/header_postinst.d/pnetlab-bridge-secureboot'),
    ('azamlabs-bridge-lacp-check', 'usr/lib/azamlabs/pnetlab-bridge-lacp-check'),
    ('azamlabs-bridge-kernel-supported', 'usr/lib/azamlabs/pnetlab-bridge-kernel-supported'),
    ('azamlabs-bridge-secureboot', 'usr/lib/azamlabs/pnetlab-bridge-secureboot')
]
for target, link_rel in symlinks:
    link_path = os.path.join(PKG_DIR, link_rel)
    os.makedirs(os.path.dirname(link_path), exist_ok=True)
    if not os.path.exists(link_path) and not os.path.islink(link_path):
        os.symlink(target, link_path)
        print(f"Created symlink {link_rel} -> {target}")

# 3. Content replacements in files
def sanitize_content(content):
    content = content.replace('PNetLab', 'AzamLabs')
    content = content.replace('pnetlab-bridge-dkms', 'azamlabs-bridge-dkms')
    content = content.replace('pnetlab-bridge', 'azamlabs-bridge')
    content = content.replace('/usr/lib/pnetlab', '/usr/lib/azamlabs')
    content = content.replace('/var/lib/pnetlab-bridge-dkms', '/var/lib/azamlabs-bridge-dkms')
    content = content.replace('/run/pnetlab-bridge-dkms', '/run/azamlabs-bridge-dkms')
    content = content.replace('/usr/share/pnetlab-bridge-dkms', '/usr/share/azamlabs-bridge-dkms')
    content = content.replace('pnetlab-satd.service', 'azamlabs-satd.service')
    content = content.replace('pnetlab-brokerd.service', 'azamlabs-brokerd.service')
    return content

for root, dirs, files in os.walk(PKG_DIR):
    for f in files:
        if f == 'md5sums': continue
        filepath = os.path.join(root, f)
        if os.path.islink(filepath): continue
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                data = fp.read()
            new_data = sanitize_content(data)
            if new_data != data:
                with open(filepath, 'w', encoding='utf-8') as fp:
                    fp.write(new_data)
                print(f"Sanitized: {filepath}")
        except Exception as e:
            print(f"Error reading {filepath}: {e}")

# 4. Update DEBIAN/control
control_content = """Package: azamlabs-bridge-dkms
Version: 6.8.93resolute1
Architecture: all
Maintainer: AzamLabs Noble Port <noble@azamlabs.local>
Installed-Size: 1705
Depends: dkms (>= 2.1.0.0), build-essential, iproute2, kmod
Provides: pnetlab-bridge-dkms
Replaces: pnetlab-bridge-dkms
Conflicts: pnetlab-bridge-dkms
Section: kernel
Priority: optional
Homepage: https://github.com/azambasha1987/AzamLabs
Description: AzamLabs patched bridge module (group-MAC forwarding & dual 7.0.0-38/42 support)
 Rebuilds the kernel bridge module via DKMS with BR_GROUPFWD_RESTRICTED
 cleared, so a bridge's group_fwd_mask can forward all 01:80:c2:00:00:0X
 reserved group MACs (STP, MAC pause, LACP/slow protocols). This lets
 emulated switches connected through the host Linux bridges that AzamLabs
 builds per lab network form LACP EtherChannels and exchange pause frames.
 .
 The module installs under updates/ (outranking the in-tree bridge.ko) and
 is rebuilt automatically on every kernel upgrade.
"""
with open(os.path.join(PKG_DIR, 'DEBIAN/control'), 'w') as f:
    f.write(control_content)

# Update conffiles
conffiles = """/etc/kernel/header_postinst.d/azamlabs-bridge-secureboot
/etc/kernel/postinst.d/azamlabs-bridge-secureboot
/etc/update-motd.d/70-azamlabs-bridge-lacp
"""
with open(os.path.join(PKG_DIR, 'DEBIAN/conffiles'), 'w') as f:
    f.write(conffiles)

# 5. Regenerate md5sums
md5_lines = []
for root, dirs, files in os.walk(PKG_DIR):
    if 'DEBIAN' in root: continue
    for f in sorted(files):
        p = os.path.join(root, f)
        if os.path.islink(p): continue
        rel = os.path.relpath(p, PKG_DIR)
        with open(p, 'rb') as fp:
            h = hashlib.md5(fp.read()).hexdigest()
        md5_lines.append(f"{h}  {rel}\n")
with open(os.path.join(PKG_DIR, 'DEBIAN/md5sums'), 'w') as f:
    f.writelines(sorted(md5_lines))

print("Rebranding script complete!")
'''

    sftp = ssh.open_sftp()
    with sftp.file('/tmp/rebrand_bridge/rebrand.py', 'w') as f:
        f.write(rebrand_script)
    sftp.close()

    stdin, stdout, stderr = ssh.exec_command('python3 /tmp/rebrand_bridge/rebrand.py && dpkg-deb -b /tmp/rebrand_bridge/pkg /tmp/rebrand_bridge/azamlabs-bridge-dkms_6.8.93resolute1_all.deb')
    print("OUTPUT:")
    print(stdout.read().decode())
    print("ERRORS:")
    print(stderr.read().decode())

    ssh.close()

if __name__ == '__main__':
    main()

