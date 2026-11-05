#!/usr/bin/env bash
# ==============================================================================
# PNetLab Release Ingestion Engine Shell Entrypoint (pnet-ingest-release.sh)
# Fulfills Master Process Architecture (Master-Proccess-Doc.docx)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PY_BIN="python3"
if ! command -v python3 &>/dev/null; then
    if command -v python &>/dev/null; then
        PY_BIN="python"
    elif command -v py &>/dev/null; then
        PY_BIN="py"
    else
        echo "Error: Python 3 is required to run the Release Ingestion Engine."
        exit 1
    fi
fi

ENGINE_SCRIPT="${SCRIPT_DIR}/pnet-release-ingestion-engine.py"
if [ ! -f "$ENGINE_SCRIPT" ]; then
    echo "Error: Engine script not found at ${ENGINE_SCRIPT}"
    exit 1
fi

exec "$PY_BIN" "$ENGINE_SCRIPT" "$@"
