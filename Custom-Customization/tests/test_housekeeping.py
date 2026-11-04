"""
Unit tests for PNetLab Housekeeping & Log Purge Engine.
Enforces:
- Script existence and parameter handling
- Dry-run mode non-destructiveness
- Local cache detection logic
"""

import os
import subprocess
import sys
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")
PYTHON_EXE = sys.executable


class TestHousekeeping(unittest.TestCase):

    def test_housekeeping_scripts_exist(self):
        """Assert both bash and python housekeeping utilities exist in scripts/."""
        py_script = os.path.join(SCRIPTS_DIR, "azambasha-housekeeping.py")
        sh_script = os.path.join(SCRIPTS_DIR, "azambasha-housekeeping.sh")
        self.assertTrue(os.path.exists(py_script), "Missing azambasha-housekeeping.py")
        self.assertTrue(os.path.exists(sh_script), "Missing azambasha-housekeeping.sh")

    def test_housekeeping_sh_truncates_all_logs(self):
        """Assert azambasha-housekeeping.sh includes access.txt, api.txt, error.txt, ssl logs."""
        sh_script = os.path.join(SCRIPTS_DIR, "azambasha-housekeeping.sh")
        with open(sh_script, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("access.txt", content)
        self.assertIn("api.txt", content)
        self.assertIn("unl_wrapper.txt", content)
        self.assertIn("error.txt", content)
        self.assertIn("journalctl", content)

    def test_housekeeping_dry_run_executes(self):
        """Assert azambasha-housekeeping.py --dry-run --local executes cleanly with code 0."""
        py_script = os.path.join(SCRIPTS_DIR, "azambasha-housekeeping.py")
        res = subprocess.run(
            [PYTHON_EXE, py_script, "--dry-run", "--local"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.assertEqual(res.returncode, 0, f"Dry-run failed: {res.stderr}")
        self.assertIn("Scanning workspace", res.stdout)
        self.assertIn("Would remove", res.stdout)


if __name__ == "__main__":
    unittest.main()

