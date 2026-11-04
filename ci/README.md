# PNetLab Continuous Integration & Quality Gates (CI/CD)

This directory contains the GitHub Actions workflow definition and verification tooling for the PNetLab repository.

## Workflow Structure (`ci/workflows/ci.yml`)

1. **`lint-and-syntax`**:
   - `bash -n` validation across all `.sh` scripts.
   - `python -m py_compile` across all `.py` files.
   - `jq` validation across all `.json` manifests.
2. **`verify-packages`**:
   - Executes `bash install/verify-packages.sh` verifying SHA256 checksums and payload integrity of release packages.
3. **`canonical-architecture-gates`**:
   - Verifies zero legacy prefixes (`*azam*`, `*azambasha*`) exist in Custom pillar scripts.
   - Runs Architecture Gates 16, 17, and 18 (`tests/test_architecture_gates.py`).
4. **`unit-tests`**:
   - Runs the complete automated test suite (`tests/`) using `unittest` and `pytest`.

## How to Enable on GitHub Actions

GitHub requires Personal Access Tokens to possess the `workflow` scope to modify files within `.github/workflows/`.

1. Go to your GitHub account -> **Settings** -> **Developer Settings** -> **Personal Access Tokens**.
2. Select your active token and ensure the **`workflow`** checkbox is enabled.
3. Run:
   ```bash
   bash ci/enable-ci.sh
   git add .github/workflows/ci.yml
   git commit -m "ci: activate GitHub Actions workflow"
   git push origin main
   ```
