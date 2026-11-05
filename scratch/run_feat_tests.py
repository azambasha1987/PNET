import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.23', username='root', password='pnet')

commands = [
    ("pnet-feat Help", "pnet-feat -h 2>/dev/null || pnet-feat --help 2>/dev/null || which pnet-feat"),
    ("Topology Git Snapshot", "pnet-feat --snapshot-now 2>/dev/null || pnet-feat --snapshot 2>/dev/null || true"),
    ("Git Log on Labs", "git -C /opt/unetlab/labs/git log -n 5 --oneline 2>/dev/null || ls -la /opt/unetlab/labs/git/ 2>/dev/null || true"),
    ("SLA Ping Mesh", "pnet-feat --run-sla-mesh 2>/dev/null || pnet-feat --sla 2>/dev/null || true"),
    ("WireGuard Status", "wg show 2>/dev/null || ip link show dev wg0 2>/dev/null || true")
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

