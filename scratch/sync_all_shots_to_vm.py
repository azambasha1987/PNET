import paramiko
import os
import glob

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.23', username='root', password='pnet')
sftp = ssh.open_sftp()

folders = [
    ("Custom Performance Test", r"C:\Users\azamb\Desktop\Custom Performance Test"),
    ("Custom Features Test", r"C:\Users\azamb\Desktop\Custom Features Test"),
    ("Custom Customization Test", r"C:\Users\azamb\Desktop\Custom Customization Test")
]

for folder_name, local_dir in folders:
    remote_dir = f"/root/Desktop/{folder_name}"
    stdin, stdout, stderr = ssh.exec_command(f"mkdir -p '{remote_dir}'")
    for f in glob.glob(os.path.join(local_dir, "*.png")):
        base = os.path.basename(f)
        remote_file = f"{remote_dir}/{base}"
        sftp.put(f, remote_file)
        print(f"Synced to VM: {remote_file}")

sftp.close()
ssh.close()
print("All snapshots synced to live VM successfully!")

