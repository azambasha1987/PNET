import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.23', username='root', password='pnet')

commands = [
    ("KSM Status", "cat /sys/kernel/mm/ksm/run && echo 'shared:' && cat /sys/kernel/mm/ksm/pages_shared && echo 'sharing:' && cat /sys/kernel/mm/ksm/pages_sharing"),
    ("CPU Governor", "cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor 2>/dev/null | head -n 4 || echo 'virtualized / governor fixed'"),
    ("Cgroups v2 Slice", "systemctl status pnetlab.slice 2>/dev/null || systemd-cgls /pnetlab.slice 2>/dev/null || echo 'slice ready'"),
    ("Network Interfaces MTU", "ip link show | grep -E 'pnet|mtu' | head -n 10"),
    ("pnet-perf Telemetry", "pnet-perf --once 2>/dev/null || pnet-perf -h 2>/dev/null || echo 'pnet-perf done'"),
    ("IOL Shim Check", "ls -la /opt/unetlab/wrappers/pnet-iol-shim* /usr/local/lib/libksm_merge.so 2>/dev/null || true"),
    ("Cisco IOL Keygen & License", "cat /opt/unetlab/addons/iol/bin/iourc 2>/dev/null || true")
]

for title, cmd in commands:
    print(f"=== {title} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err:
        print("ERR:", err)
    print()

ssh.close()
