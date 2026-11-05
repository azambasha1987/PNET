import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.23', username='root', password='pnet')
ssh.exec_command("find '/root/Desktop/Custom Customization Test/' -name '*Users*' -delete")
stdin, stdout, stderr = ssh.exec_command("ls -la '/root/Desktop/Custom Customization Test/'")
print(stdout.read().decode())
ssh.close()
