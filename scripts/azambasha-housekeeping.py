#!/usr/bin/env python3
"""
===============================================================================
AzamLabs Unified Housekeeping & Deep Log Purge Engine
===============================================================================
Authoritative cleanup utility for AzamLabs repository, local development
workspace, and remote virtualization cluster nodes (Master & Satellite).

Capabilities:
  1. Local Workspace:
     - Purges all __pycache__ directories, *.pyc, *.pyo files.
     - Purges .pytest_cache/, test logs, and temporary artifacts.
     - Leaves runtime packages in .venv intact while reclaiming disk space.
  2. Remote Cluster Nodes (Master: 192.168.1.23, Satellite: 192.168.1.18):
     - Truncates UNetLab application logs (/opt/unetlab/data/Logs/*.txt, *.log).
     - Truncates Apache2 access/error logs and purges rotated archives (*.gz).
     - Truncates system logs (/var/log/syslog, kern.log, dpkg.log, etc.).
     - Vacuums systemd journal down to 10MB retention.
     - Purges /tmp temporary scripts, netio artifacts, and .deb upload buffers.
     - Cleans APT package cache (/var/cache/apt/archives).
     - Re-asserts canonical ownership (www-data:www-data) and permissions.

Usage:
  python scripts/azambasha-housekeeping.py [--all] [--local] [--cluster] [--dry-run]
===============================================================================
"""

import argparse
import os
import shutil
import sys
import time

try:
    import paramiko
    PARAMIKO_AVAILABLE = True
except ImportError:
    PARAMIKO_AVAILABLE = False

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def print_banner():
    print("=" * 68)
    print("      AzamLabs Unified Housekeeping & Deep Log Purge Engine     ")
    print("=" * 68)


def clean_local(dry_run=False):
    print("\n[*] [LOCAL] Scanning workspace for caches, logs, and artifacts...")
    purged_files = 0
    purged_bytes = 0
    purged_dirs = 0

    # 1. Clean __pycache__ and bytecode
    for root, dirs, files in os.walk(ROOT_DIR, topdown=False):
        # Skip .git directory entirely
        if ".git" in root.split(os.sep):
            continue

        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in [".pyc", ".pyo", ".tmp", ".bak"] or f in ["sync.log", ".coverage"]:
                fpath = os.path.join(root, f)
                try:
                    size = os.path.getsize(fpath)
                    if not dry_run:
                        os.remove(fpath)
                    purged_files += 1
                    purged_bytes += size
                except Exception as e:
                    print(f"    [!] Error removing file {fpath}: {e}")

        for d in dirs:
            if d == "__pycache__" or (d == ".pytest_cache" and root == ROOT_DIR):
                dpath = os.path.join(root, d)
                try:
                    # Calculate directory size
                    dir_size = 0
                    for d_root, _, d_files in os.walk(dpath):
                        for df in d_files:
                            try:
                                dir_size += os.path.getsize(os.path.join(d_root, df))
                            except Exception:
                                pass
                    if not dry_run:
                        shutil.rmtree(dpath, ignore_errors=True)
                    purged_dirs += 1
                    purged_bytes += dir_size
                except Exception as e:
                    print(f"    [!] Error removing dir {dpath}: {e}")

    # 2. Run git garbage collection if in a git repository
    git_dir = os.path.join(ROOT_DIR, ".git")
    if os.path.isdir(git_dir):
        print("  [*] Optimizing git repository objects (git gc --prune=now)...")
        if not dry_run:
            try:
                import subprocess
                subprocess.run(["git", "gc", "--prune=now", "--quiet"], cwd=ROOT_DIR, check=False)
                print("      -> Git packfiles compressed and unreferenced loose blobs pruned.")
            except Exception as e:
                print(f"      [!] Could not run git gc: {e}")
        else:
            print("      -> Would run git gc --prune=now to compress git packfiles.")

    action_label = "Would remove" if dry_run else "Successfully removed"
    print(f"  -> {action_label} {purged_files} cache/temp files and {purged_dirs} cache directories.")
    print(f"  -> Reclaimed {purged_bytes / (1024 * 1024):.2f} MB of local disk space.")
    return True


def clean_remote_node(host, username="root", password="azam", dry_run=False):
    print(f"\n[*] [CLUSTER] Connecting to node {host} as {username}...")
    if not PARAMIKO_AVAILABLE:
        print("  [✖] paramiko is not installed; skipping remote cluster cleanup.")
        return False

    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, username=username, password=password, timeout=10)
    except Exception as e:
        print(f"  [✖] Could not connect to {host}: {e}")
        return False

    try:
        if dry_run:
            print(f"  [i] Dry-run on {host}: Probing log and journal sizes...")
            _, stdout, _ = ssh.exec_command(
                "ls -lh /opt/unetlab/data/Logs/ 2>/dev/null; "
                "du -sh /var/log/ /var/cache/apt/archives 2>/dev/null; "
                "journalctl --disk-usage 2>/dev/null; "
                "df -h / | awk 'NR==2 {print \"Disk /: Free=\" $4 \", Used=\" $3}'"
            )
            print(stdout.read().decode())
            ssh.close()
            return True

        # Copy updated azambasha-housekeeping.sh to remote node
        local_script = os.path.join(ROOT_DIR, "scripts", "azambasha-housekeeping.sh")
        remote_script = "/opt/unetlab/scripts/azambasha-housekeeping.sh"

        sftp = ssh.open_sftp()
        sftp.put(local_script, remote_script)
        sftp.close()

        ssh.exec_command(f"chmod +x {remote_script}")

        # Execute remote housekeeping script
        print(f"  [*] Executing {remote_script} on {host}...")
        stdin, stdout, stderr = ssh.exec_command(f"bash {remote_script}")
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()

        for line in out.splitlines():
            print(f"    {line}")

        if err:
            for eline in err.splitlines():
                if "error" in eline.lower():
                    print(f"    [ERR] {eline}")

        # Verification of log reset
        _, v_stdout, _ = ssh.exec_command("ls -lh /opt/unetlab/data/Logs/ 2>/dev/null")
        v_out = v_stdout.read().decode().strip()
        print("\n  [*] Post-cleanup /opt/unetlab/data/Logs/ verification:")
        for line in v_out.splitlines():
            print(f"      {line}")

        ssh.close()
        return True
    except Exception as e:
        print(f"  [✖] Error during cleanup on {host}: {e}")
        ssh.close()
        return False


def main():
    parser = argparse.ArgumentParser(description="AzamLabs Unified Housekeeping & Deep Log Purge Engine")
    parser.add_argument("--local", action="store_true", help="Clean local workspace only")
    parser.add_argument("--cluster", action="store_true", help="Clean remote cluster nodes only")
    parser.add_argument("--all", action="store_true", help="Clean both local workspace and remote cluster (default)")
    parser.add_argument("--master-ip", default="192.168.1.23", help="Master node IP (default: 192.168.1.23)")
    parser.add_argument("--satellite-ip", default="192.168.1.18", help="Satellite node IP (default: 192.168.1.18)")
    parser.add_argument("--dry-run", action="store_true", help="Report files and sizes without deleting")

    args = parser.parse_args()

    # Default to --all if neither --local nor --cluster specified
    do_local = args.local or args.all or (not args.local and not args.cluster)
    do_cluster = args.cluster or args.all or (not args.local and not args.cluster)

    print_banner()

    start_time = time.time()
    success = True

    if do_local:
        if not clean_local(dry_run=args.dry_run):
            success = False

    if do_cluster:
        print("\n[*] Purging Master Node logs and temporary files...")
        if not clean_remote_node(args.master_ip, dry_run=args.dry_run):
            success = False

        if args.satellite_ip:
            print("\n[*] Purging Satellite Node logs and temporary files...")
            clean_remote_node(args.satellite_ip, dry_run=args.dry_run)

    elapsed = time.time() - start_time
    status_str = "COMPLETED SUCCESSFULLY" if success else "COMPLETED WITH WARNINGS"
    print("\n" + "=" * 68)
    print(f"   [✔] Housekeeping {status_str} in {elapsed:.2f}s")
    print("=" * 68 + "\n")

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

