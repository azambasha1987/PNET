#!/usr/bin/env bash
# =============================================================================
# Helper script to activate GitHub Actions CI/CD Pipeline
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

mkdir -p "$REPO_ROOT/.github/workflows"
cp -f "$SCRIPT_DIR/workflows/ci.yml" "$REPO_ROOT/.github/workflows/ci.yml"
echo "✅ GitHub Actions CI/CD pipeline enabled at .github/workflows/ci.yml"
echo "Note: Ensure your GitHub Personal Access Token (PAT) has the 'workflow' scope before pushing."
