#!/usr/bin/env bash
# PNetLab Bootstrap & Master Installer Trigger
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd || echo "/opt/pnet")"
if [ -f "${SCRIPT_DIR}/install/install-master.sh" ]; then
    exec bash "${SCRIPT_DIR}/install/install-master.sh" "$@"
elif [ -f "/opt/pnet/install/install-master.sh" ]; then
    exec bash "/opt/pnet/install/install-master.sh" "$@"
else
    exec bash "${SCRIPT_DIR}/apply-all-custom.sh" "$@"
fi
