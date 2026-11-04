#!/usr/bin/env bash
# ==============================================================================
# PNetLab Custom Features Compatibility Wrapper
# Delegates to master apply-all-custom.sh or local apply-features.sh
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${REPO_ROOT}/apply-all-custom.sh" ]; then
    exec bash "${REPO_ROOT}/apply-all-custom.sh" "$@"
elif [ -f "${SCRIPT_DIR}/apply-features.sh" ]; then
    exec bash "${SCRIPT_DIR}/apply-features.sh" "$@"
fi
