#!/usr/bin/env bash
# ==============================================================================
# PNetLab Heavy Node Optimizer Execution Wrapper
# (pnet-apply-heavy-node-optimizer.sh)
#
# Idempotently delegates to the authoritative optimizer implementation:
#   Custom-Performance/scripts/pnet-heavy-node-optimizer.sh
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="${SCRIPT_DIR}/pnet-heavy-node-optimizer.sh"

if [ ! -f "$TARGET_SCRIPT" ]; then
    TARGET_SCRIPT="/opt/unetlab/scripts/pnet-heavy-node-optimizer.sh"
fi

if [ -f "$TARGET_SCRIPT" ]; then
    exec bash "$TARGET_SCRIPT" "$@"
else
    echo "[ERROR] pnet-heavy-node-optimizer.sh not found." >&2
    exit 1
fi
