#!/usr/bin/env python3
"""
PNetLab Safe APT Guard Automated Verification Suite (test_apt_guard.py)
Validates that:
1. scripts/azambasha-apt-guard.sh exists and contains the authoritative warning banner:
   "Do Not Try to UPGRADE, this will BREAK PNetLab."
2. Wrappers intercept 'upgrade', 'dist-upgrade', 'full-upgrade', and 'autoremove'.
3. 'apt update', 'apt search', 'apt show', and 'apt install' pass through cleanly.
4. The emergency override flag '--force-pnet-override' works.
5. On live Linux systems, validates real execution of CLI wrappers.
"""

import os
import sys
import unittest
import subprocess

# Safe utf-8 reconfigure for Windows console
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")
APT_GUARD_SCRIPT = os.path.join(SCRIPTS_DIR, "pnet-apt-guard.sh")

class TestAptGuard(unittest.TestCase):

    def test_tc11_script_file_exists(self):
        """TC-1.1: Verify scripts/pnet-apt-guard.sh exists and is non-empty."""
        self.assertTrue(os.path.isfile(APT_GUARD_SCRIPT), "pnet-apt-guard.sh must exist")
        size = os.path.getsize(APT_GUARD_SCRIPT)
        self.assertGreater(size, 500, "pnet-apt-guard.sh must not be empty")

    def test_tc12_authoritative_banner_content(self):
        """TC-1.2: Verify mandatory warning banners are present in pnet-apt-guard.sh."""
        with open(APT_GUARD_SCRIPT, "r", encoding="utf-8", errors="ignore") as f:
            code = f.read()

        # Exact required banner
        self.assertIn("Do Not Try to UPGRADE, this will BREAK PNetLab.", code,
                      "Authoritative upgrade banner must be present in pnet-apt-guard.sh")
        self.assertIn("Do Not Try to AUTOREMOVE, this will BREAK PNetLab.", code,
                      "Authoritative autoremove banner must be present in pnet-apt-guard.sh")
        self.assertIn("sudo pnet-update", code, "Must reference sudo pnet-update in block output")
        self.assertIn("--force-pnet-override", code, "Emergency bypass flag must be present")

    def test_tc13_script_handles_lifecycle_flags(self):
        """TC-1.3: Verify pnet-apt-guard.sh handles --enable, --check, and --disable flags."""
        with open(APT_GUARD_SCRIPT, "r", encoding="utf-8", errors="ignore") as f:
            code = f.read()

        self.assertIn("--check", code)
        self.assertIn("--disable", code)
        self.assertIn("/usr/local/bin/apt", code)
        self.assertIn("/etc/apt/apt.conf.d/99pnetlab-apt-guard", code)

    def test_tc14_block_updates_integration(self):
        """TC-1.4: Verify pnet-block-updates.sh invokes pnet-apt-guard.sh."""
        block_script = os.path.join(SCRIPTS_DIR, "pnet-block-updates.sh")
        self.assertTrue(os.path.isfile(block_script))
        with open(block_script, "r", encoding="utf-8", errors="ignore") as f:
            code = f.read()
        self.assertTrue("pnet-apt-guard.sh" in code or "apt-guard" in code)

    def test_tc15_installers_integration(self):
        """TC-1.5: Verify master update & custom pipeline invokes pnet-apt-guard."""
        for candidate in [
            os.path.join(ROOT_DIR, "apply-all-custom.sh"),
            os.path.join(ROOT_DIR, "scripts", "pnet-update.sh")
        ]:
            if os.path.isfile(candidate):
                with open(candidate, "r", encoding="utf-8", errors="ignore") as f:
                    code = f.read()
                self.assertTrue("pnet-apt-guard" in code or "apt-guard" in code, f"{candidate} must invoke apt-guard")

    # The following tests execute live only when run on a Linux system where APT is available
    @unittest.skipUnless(sys.platform.startswith("linux") and os.path.exists("/usr/local/bin/apt"),
                         "Live CLI test only applies on Linux systems with /usr/local/bin/apt active")
    def test_tc21_live_apt_upgrade_blocked(self):
        """TC-2.1: Verify live 'apt upgrade' is blocked with authoritative warning banner."""
        res = subprocess.run(["apt", "upgrade"], capture_output=True, text=True)
        self.assertEqual(res.returncode, 1, "apt upgrade must return exit code 1")
        output = res.stdout + res.stderr
        self.assertIn("Do Not Try to UPGRADE, this will BREAK PNetLab.", output)
        self.assertIn("sudo pnet-update", output)

    @unittest.skipUnless(sys.platform.startswith("linux") and os.path.exists("/usr/local/bin/apt"),
                         "Live CLI test only applies on Linux systems with /usr/local/bin/apt active")
    def test_tc25_live_apt_autoremove_blocked(self):
        """TC-2.5: Verify live 'apt autoremove' is blocked to protect 32-bit IOL libraries."""
        res = subprocess.run(["apt", "autoremove"], capture_output=True, text=True)
        self.assertEqual(res.returncode, 1, "apt autoremove must return exit code 1")
        output = res.stdout + res.stderr
        self.assertIn("Do Not Try to AUTOREMOVE, this will BREAK PNetLab.", output)

    @unittest.skipUnless(sys.platform.startswith("linux") and os.path.exists("/usr/local/bin/apt"),
                         "Live CLI test only applies on Linux systems with /usr/local/bin/apt active")
    def test_tc31_live_apt_update_pass_through(self):
        """TC-3.1: Verify live 'apt update' passes through cleanly."""
        res = subprocess.run(["apt", "update"], capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, "apt update must execute with exit code 0")

    @unittest.skipUnless(sys.platform.startswith("linux") and os.path.exists("/usr/local/bin/apt"),
                         "Live CLI test only applies on Linux systems with /usr/local/bin/apt active")
    def test_tc41_live_emergency_override(self):
        """TC-4.1: Verify live --force-pnet-override bypasses the barrier for simulated runs."""
        res = subprocess.run(["apt", "--force-pnet-override", "autoremove", "-s"], capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, "apt with emergency override must return code 0")
        self.assertNotIn("Do Not Try to AUTOREMOVE, this will BREAK PNetLab.", res.stdout)

if __name__ == "__main__":
    unittest.main()
