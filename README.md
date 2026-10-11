# PNetLab v8 6.8.88

PNetLab is a self-hosted network emulation platform for building and running
virtual labs (routers, switches, firewalls, servers, and more) in your browser.

This repository is a landing page for **PNetLab v8** downloads and upgrade
instructions. It does not host the application source.

The signed network-install channel serves `6.8.88resolute1`. 

Changelog:
1. Canvas: Bezier Curviness and Flowchart Mid point link controls (Codeberg #54); each link on a multi-device network keeps its own style.
2. Canvas: Delete selected also removes selected networks; dragged network nodes stay in place and only live nodes count as running.
3. Clear stale node running flags at boot.
4. IOL: interfaces go down when the peer link drops, via an L1 keepalive relay (pnetlab-iol-l1d); keepalive is on by default for new IOL nodes.
5. Web console: two-way clipboard for VNC/RDP, typed paste, and a collapsible toolbar.
6. Startup Configs: download the selected node's config as .txt.
7. Windows and Windows 11 templates use the Windows desktop icon.
8. Network Watcher: name many more packet types and their message kinds, show real frame sizes, animate the correct direction on curved links, and show one pass per packet.
9. Canvas: parallel links between the same two nodes fan apart again, bowed in slot order (Codeberg #60).
10. Canvas: hovering a link's interface chip raises the link, glows both nodes and brings both chips above every stroke; the hover ring follows the chip colour (Codeberg #60).
11. cEOS and SR Linux telnet consoles pass the node name, so external telnet clients (PuTTY, SecureCRT) show it in the tab title (Codeberg #61).
12. SD-WAN: Export config works for catmanager, catcontrol and catvalid. A cloud-init seed is never overwritten by a CLI export, and the exported CLI config is restored after boot. Known limits: the vManage restore can exceed the 300 s script timeout, and the script logs in as admin/admin or reuses an already logged-in CLI.

## Downloads

| Artifact | Description | Link |
| --- | --- | --- |
| Network Install Script | Hands-off installer for a fresh Ubuntu 26.04 (27H1 "Resolute") host — pulls and installs the latest PNetLab v8 release over the network. | [download](https://codeberg.org/api/packages/netkillui/generic/pnetlab-core-assets/0.channel/pnetlab-network-install-latest.sh) |
| OVA (autoinstaller) | Minimal Ubuntu 26.04 image with an unattended autoinstaller — boots and installs PNetLab v8 itself. | [download](https://mega.nz/file/uNAz3JDb#CQA93KkaU3XrCs6EIosChOjYonn1W4ELgnLm7NcZ2Wg) |
| Desktop Install Bundle | Installs PNetLab v8 on Ubuntu Desktop workstation environment on bare metal. Tested on Ubuntu 26.04 Desktop and Xubuntu 26.04 Desktop — Xubuntu is recommended for its lighter resource footprint. Dual boot alongside Widows or external SSD setup works. | [download](https://mega.nz/file/aBxWRTgJ#QRKrtyDTNIqSv1WMJ3P04Woy6NkL_NKY-MSZ0oHfy48) |
| Custom Images | Lab images for wifi access point, client, OpenBMP, and ROCEv2 client with RXE configured. | [download](https://mega.nz/folder/3dQ3SIhL#MX518yID5GuuLUkDbCRa0g) |

## Requirements

- 64-bit host, hardware virtualization support (Intel VT-x / AMD-V)
- Minimum 4 vCPU / 8 GB RAM / 40 GB disk for light use; scale up for larger labs
- Ubuntu 26.04 LTS ("27H1 Resolute") for the network install method

## Installation

### Option 1 — Network install (recommended)

Run the network install script on a fresh Ubuntu 26.04 server:

```bash
curl -fsSL https://codeberg.org/api/packages/netkillui/generic/pnetlab-core-assets/0.channel/pnetlab-network-install-latest.sh | sudo bash -s -- --yes --release latest
```

The script partitions storage, installs dependencies, and pulls the latest
PNetLab v8 package automatically.

### Option 2 — OVA (autoinstaller)

1. Download the OVA from the table above.
2. Import it into VMware Workstation/ESXi or VirtualBox.
3. Power on the VM. It boots into an unattended autoinstaller that partitions
  the disk and installs Ubuntu 26.04 + PNetLab v8 with no manual input beyond
  DHCP/static IP choice.
4. Once the install finishes and the VM reboots, log in to the web UI at
  `https://<host-ip>/`.

## Updating

PNetLab v8 ships update packages through its built-in update mechanism.

```bash
sudo pnetlab-update
```

This checks the configured release channel, downloads the newest package, and
applies it in place. Review the changelog before updating a production lab
host.

### Manual upgrade (if `pnetlab-update` is unavailable)

1. Back up `/opt/unetlab` (or your configured lab data path) and any custom
  node images.
2. Download the target release package (placeholder link above).
3. Install it:
  
  ```bash
  sudo dpkg -i pnetlab_<version>_amd64.deb
  sudo apt-get -f install
  ```
  
4. Reboot and verify the web UI and running labs come back up correctly.

## Support / Issues

Open an issue in this repository's issue tracker.

## License

See the license terms distributed with the PNetLab v8 package.