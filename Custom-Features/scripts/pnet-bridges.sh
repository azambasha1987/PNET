#!/bin/bash
# pnet-bridges.sh — guarantee the PNetLab cloud bridge DEVICES exist every boot.
#
# WHY THIS EXISTS
#   The Add/Edit-Network modal lists the "Cloud0..Cloud9" + "NAT0" options by
#   scanning /sys/devices/virtual/net for pnet[0-9]+ / nat[0-9]+ bridge devices
#   (see listNetworkTypes() in html/devices/functions.php). So the clouds appear
#   in the GUI iff those bridge DEVICES exist in the kernel — nothing more.
#
#   On Ubuntu 26.04 those bridges are normally built by ifupdown from
#   /etc/network/interfaces at boot. But that chain is fragile: net.ifnames=0 may
#   not land (NIC stays ensXX, pnet0's `bridge_ports eth0` fails), or cloud-init
#   may regenerate netplan and hand eth0 to systemd-networkd so ifupdown's
#   `ifup -a` builds nothing. Either way the user sees "pnet0 and all clouds
#   missing" in the modal.
#
#   This script DECOUPLES "the cloud devices exist" (what the modal needs) from
#   "eth0 is correctly bridged + addressed" (what the uplink needs). It just
#   ensure-creates the empty bridges; a later `ifup` that wants to enslave eth0
#   or run DHCP on pnet0 finds the bridge already present and configures it (a
#   no-op to create an existing bridge). Worst case a broken NIC costs you the
#   uplink on pnet0/cloudN — never the whole cloud list.
#
# IDEMPOTENT + ORDER-SAFE: pure `ip link`, no systemctl, safe to run both from an
# early oneshot (Before=networking.service) and again from ovfstartup.sh.

IP=/bin/ip
command -v "$IP" >/dev/null 2>&1 || IP=ip

# Ensure kernel bridge and 8021q modules are loaded
modprobe bridge 2>/dev/null || true
modprobe 8021q 2>/dev/null || true

for i in 0 1 2 3 4 5 6 7 8 9; do
    if ! "$IP" link show "pnet$i" >/dev/null 2>&1; then
        "$IP" link add name "pnet$i" type bridge forward_delay 0 stp_state 0 2>/dev/null || \
        "$IP" link add name "pnet$i" type bridge 2>/dev/null || true
    fi
    "$IP" link set "pnet$i" up 2>/dev/null || true
done

# nat0 is the built-in NAT cloud bridge (ifupdown gives it 10.0.137.254/24 +
# udhcpd + MASQUERADE). Ensure the device so the modal lists "NAT0" regardless.
if ! "$IP" link show nat0 >/dev/null 2>&1; then
    "$IP" link add name nat0 type bridge forward_delay 0 stp_state 0 2>/dev/null || \
    "$IP" link add name nat0 type bridge 2>/dev/null || true
fi
"$IP" link set nat0 up 2>/dev/null || true

# Nothing else reports this, and every pnet0 setting depends on it. Keep exit 0:
# boot goes on so the host stays reachable where something else holds the NIC.
if ! "$IP" link show pnet0 >/dev/null 2>&1; then
    echo "pnet-bridges: pnet0 could not be created, management addressing will not apply." >&2
    echo "pnet-bridges: check the bridge module: modprobe bridge; dmesg | grep -i bridge" >&2
fi

exit 0
