# PNetLab v8 changelog

## 6.8.89resolute1

### Nodes and labs
- **IOL on a NAT network now comes up**: native L1 keepalives treat the bridge device itself as a live peer. Previously IOL on `nat0` stayed down.
- **Native IOL L1 keepalives** in iol_wrapper replace the separate `pnetlab-iol-l1d` daemon; serial TAPs (`ser<session>_<if>`) can be deleted.
- **Broker v2**: node lifecycle runs on typed, batched broker verbs instead of root shell-outs. Covers VPCS, IOL, QEMU, docker, cEOS, SR Linux and XRd. Lab daemons run in their own scopes, so a broker restart no longer kills running nodes. Per-session interface tags with leftover cleanup.
- **Satellite fixes**: node verbs work on a cluster satellite without a database (Start, Stop, Wipe); ACPI Shutdown and live impairment forward to the node's host; per-NIC Suspend/Resume works on satellite nodes; cEOS runs on satellites; satellite node status comes from the node's own host; Sync Satellite installs the whole package set in one apt transaction over the rrsync jail.
- **Windows nodes** start without the virtio-win floppy, and a virtio-win drivers ISO ships so Windows installs from ISO see the disk. New AMD win10 template; winserver no longer pinned to qemu 2.12.0.
- **Graceful stop** for guest-OS qemu nodes, plus Force stop and a guard against a TAP that is still in use.
- **vIOS / vIOSL2**: faster first boot, config-script timeout honoured, VLANs export, no evaluation banners after a config re-import.
- **vMX** and other raw-backed disks clone with their real backing format (Codeberg #14).
- **ExtremeXOS**: NICs for any pci_mode; templates aligned. H3C S6850/S9850 serial option fixed.
- **XRd**: firstboot keeps the login user, `/dev/shmem` tmpfs survives restarts, template defaults; Devices lists every Docker Hub tag for XRd.
- **SR Linux**: default card 7220IXRD2L, factory-diff export, verified import, readiness poll; startup-config saved across restart; IXR init scripts use PNetLab runpath depth.
- **cEOS**: 2 s stop grace, no idle settle sleep, startup-config visible to the config API; the failing `/etc/resolv.conf` umount is dropped (also for docker nodes — fixes DHCP DNS on privileged nodes).
- **Docker nodes**: console bridge is reaped on stop even when the container already exited; udhcpc and addressing run host-side with a per-node DHCP scope; docker privileged creates are limited to a root-owned image allowlist.
- **netprobe** (VPCS replacement): classic `ip` forms and `show arp`; project copyright holder / neutral license.
- **Network installer** no longer stops intermittently with "docker-ce does not expose an amd64 package" when the package is present (Codeberg #64).
- **QEMU console**: the first node of a bulk start on a cold host no longer loses its telnet console; the wrapper waits for the console socket instead of racing it (Codeberg #66).
- **Full link suspend** on a link to a network/cloud node is now remembered, so the menu offers Resume (Codeberg #67).
- Capture: per-interface capture containers are removed on stop, wipe, leave and destroy.

### Security and hardening
- `GET /api/auth` no longer returns the password hash, and `lang` is restricted to real language packs (path traversal).
- Command-injection hardening on the legacy docker/ceos/srlinux root path: DNS and MTU validated and escaped; `escapeshellarg` on lab export/import zip/unzip and folder delete/move.
- ishare2 job state files are 0660, not world-writable; QEMU zoo / compat-libs and legacy `/opt/qemu-<ver>` trees are root-owned.
- IOL keepalive suspend marks are cleared before setuid on a root start.
- Installer: no MySQL root password on the command line, no `/api/auth` body in the log, `DEBIAN_FRONTEND=noninteractive` for the whole run, apt-cache policy summaries instead of version tables.
- Web: global Apache ServerName; legacy shell redirects to `/login/` without a session cookie.

### Performance and logging
- Node status uses one `docker ps` per sweep instead of an inspect per node; CPU% comes from `/proc/stat` instead of `top -b -n2 -d1`; an unreachable satellite is negatively cached for 30 s.
- Request timing in the access log plus an FPM slow-request log; PHP default timezone is UTC.
- Quieter logs: wrapper pre-delete errors, `docker_inspect` misses, and the capture-container Apache reload.

### Web UI and packaging
- Ace editor 1.2.6 → 1.44.0, lazy-loaded when the editor is toggled.
- Vendor payload trimmed: one owner per `/opt` path, 149 dead vendor-base files, unused backup templates and `messages_zh` dropped; engine icon still shipped under the old names; `nsenter` is now a symlink to `/usr/bin/nsenter`.
- Gate deploy tooling uses content-hash `?v=` tokens.
- Build: `libpyroute2`/psutil dependencies for netlink TAP/bridge operations; net tools no longer need `cap_net_admin`.
