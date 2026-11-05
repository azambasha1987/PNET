alias unl_wrapper='/opt/unetlab/wrappers/unl_wrapper'
alias pnet_info='/opt/unetlab/scripts/pnet_info.sh'

# A network-installed host owns its management networking through ifupdown and
# Pass 2's pnet0 handoff.  The legacy OVF wizard assumes the appliance's
# eth0-first-boot contract and is therefore not safe to run from a root login
# while that handoff is pending (or after it has been committed).  The marker
# is root-owned state written by the verified network-install bootstrap.  Keep
# the marker absent on OVA/workstation installs so their historical wizard
# behavior remains unchanged.
if [ ! -f '/var/lib/pnetlab/network-install-owner' ]; then
    /opt/ovf/ovfconfig.sh
fi
