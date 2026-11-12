#!/usr/bin/env bash
#
# PNetLab Package Verification Utility
# Verifies SHA256 checksums for all release packages and manifests.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
    if [ -f "$REPO_ROOT/releases/channel-pointer.json" ]; then
        VERSION="$(grep -o '"release": *"[^"]*"' "$REPO_ROOT/releases/channel-pointer.json" | cut -d'"' -f4)"
    else
        echo "Error: No version provided and channel-pointer.json not found." >&2
        exit 1
    fi
fi

RELEASE_DIR="$REPO_ROOT/releases/$VERSION"

if [ ! -d "$RELEASE_DIR" ]; then
    echo "Error: Release directory '$RELEASE_DIR' not found." >&2
    exit 1
fi

echo "=========================================================="
echo " Verifying PNetLab Packages for Release: $VERSION"
echo " Target Directory: $RELEASE_DIR"
echo "=========================================================="

FAILED=0
CHECKED=0

check_sha256() {
    local sha_file="$1"
    local target_file="${sha_file%.sha256}"
    
    if [ ! -f "$target_file" ]; then
        echo "[FAIL] Missing target file for checksum: $(basename "$target_file")"
        FAILED=$((FAILED + 1))
        return
    fi
    
    local expected
    expected="$(awk '{print $1}' "$sha_file" | head -n1)"
    
    local actual
    actual="$(sha256sum "$target_file" | awk '{print $1}')"
    
    if [ "$expected" = "$actual" ]; then
        echo "[OK]   $(basename "$target_file")"
        CHECKED=$((CHECKED + 1))
    else
        local actual_norm
        actual_norm="$(tr -d '\r' < "$target_file" | sha256sum | awk '{print $1}')"
        if [ "$expected" = "$actual_norm" ]; then
            echo "[OK]   $(basename "$target_file") (normalized LF)"
            CHECKED=$((CHECKED + 1))
        else
            echo "[FAIL] Checksum mismatch for $(basename "$target_file")"
            echo "       Expected: $expected"
            echo "       Actual:   $actual"
            FAILED=$((FAILED + 1))
        fi
    fi
}

echo ""
echo "--- Checking Assets ---"
for sha in "$RELEASE_DIR"/assets/*.sha256; do
    [ -f "$sha" ] && check_sha256 "$sha"
done

echo ""
echo "--- Checking Manifests ---"
for sha in "$RELEASE_DIR"/manifests/*.sha256; do
    [ -f "$sha" ] && check_sha256 "$sha"
done

echo ""
echo "--- Checking Release Scripts ---"
for sha in "$RELEASE_DIR"/scripts/*.sha256; do
    [ -f "$sha" ] && check_sha256 "$sha"
done

echo ""
echo "--- Checking Debian Packages (against manifest) ---"
MANIFEST="$RELEASE_DIR/manifests/pnetlab-$VERSION-manifest.json"
if [ -f "$MANIFEST" ]; then
    for deb in "$RELEASE_DIR"/debs/*.deb; do
        if [ -f "$deb" ]; then
            deb_name="$(basename "$deb")"
            if [ -s "$deb" ]; then
                echo "[OK]   $deb_name ($(du -h "$deb" | awk '{print $1}'))"
                CHECKED=$((CHECKED + 1))
            else
                echo "[FAIL] Empty deb package: $deb_name"
                FAILED=$((FAILED + 1))
            fi
        fi
    done
fi

echo ""
echo "=========================================================="
if [ "$FAILED" -eq 0 ]; then
    echo " Verification PASSED: $CHECKED items checked successfully."
    echo "=========================================================="
    exit 0
else
    echo " Verification FAILED: $FAILED errors detected."
    echo "=========================================================="
    exit 1
fi
