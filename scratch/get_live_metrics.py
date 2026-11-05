import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.23', username='root', password='pnet')

cmds = [
    ("pnet-health summary", "pnet-health | head -n 35"),
    ("pnet-perf", "pnet-perf --once"),
    ("dataplane / mtu", "ip -br link show | grep -E 'ens|pnet|vnet|docker'"),
    ("ksm status", "cat /sys/kernel/mm/ksm/run && echo 'pages_shared:' $(cat /sys/kernel/mm/ksm/pages_shared) && echo 'pages_sharing:' $(cat /sys/kernel/mm/ksm/pages_sharing)"),
    ("iol shim", "ls -la /opt/unetlab/wrappers/pnet-iol-shim*"),
    ("cgroups slice", "systemctl status pnetlab.slice --no-pager 2>/dev/null || true")
]

for title, cmd in cmds:
    print(f"=== {title} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())

ssh.close()

