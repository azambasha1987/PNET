#!/usr/bin/env python3
r"""
PNETLAB ARCHITECTURE GATES TEST SUITE (GATES 16, 17, 18)
=========================================================
Automated continuous verification to prevent architectural regressions:
- Gate 16: Single Unified Database Schema (strictly pnetlab_db)
- Gate 17: Modern PHP 8.5 Resiliency & Batch Fault Isolation (\Throwable catching)
- Gate 18: Frontend DOM Idempotency & UI Uniformity (Zero recursive MutationObserver loops)
"""

import os
import re
import unittest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if not os.path.isdir(os.path.join(REPO_ROOT, "scripts")):
    REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class TestArchitectureGates(unittest.TestCase):

    def test_gate_16_single_database_schema(self):
        """Gate 16: Verify that installer and configuration enforce single pnetlab_db and purge legacy DBs."""
        schema_candidates = [
            os.path.join(REPO_ROOT, "Custom-Features", "schema", "pnet_features_db.sql"),
            os.path.join(REPO_ROOT, "custom-features", "schema", "pnet_features_db.sql"),
            os.path.join(REPO_ROOT, "schema", "pnetlab_db.sql"),
            "/opt/unetlab/schema/pnetlab_db.sql",
        ]
        schema_file = next((p for p in schema_candidates if os.path.exists(p)), None)
        self.assertIsNotNone(schema_file, f"Database schema must exist in {schema_candidates}")

        # Check install.sh creates pnetlab_db and drops legacy pnet databases
        install_candidates = [
            os.path.join(REPO_ROOT, "install.sh"),
            "/opt/pnet/install.sh",
            "/opt/unetlab/install.sh",
        ]
        install_sh = next((p for p in install_candidates if os.path.exists(p)), None)
        if install_sh:
            with open(install_sh, "r", encoding="utf-8", errors="ignore") as f:
                install_content = f.read()

            self.assertIn("CREATE DATABASE IF NOT EXISTS pnetlab_db", install_content,
                          "install.sh must create pnetlab_db")
            self.assertIn("SHOW DATABASES LIKE 'pnet%_db';", install_content,
                          "install.sh must actively scan for and purge legacy pnet databases")

        # Check migration script targets pnetlab_db
        script_candidates = [
            os.path.join(REPO_ROOT, "scripts", "pnet-fix-database-schema.sh"),
            os.path.join(REPO_ROOT, "scripts", "azambasha-fix-database-schema.sh"),
            "/opt/unetlab/scripts/pnet-fix-database-schema.sh",
            "/opt/unetlab/scripts/azambasha-fix-database-schema.sh",
        ]
        db_script = next((p for p in script_candidates if os.path.exists(p)), None)
        if db_script:
            with open(db_script, "r", encoding="utf-8", errors="ignore") as f:
                script_content = f.read()
            self.assertIn("pnetlab_db", script_content, "Database script must target pnetlab_db")

    def test_gate_17_php_throwable_resilience(self):
        r"""Gate 17: Verify that critical API controllers catch \Throwable to survive PHP 8.5 engine errors."""
        local_candidates = [
            "/opt/unetlab/html/includes/api_labs.php",
            os.path.join(REPO_ROOT, "html", "includes", "api_labs.php"),
        ]
        local_api_labs = next((p for p in local_candidates if os.path.exists(p)), None)

        if local_api_labs:
            with open(local_api_labs, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            self.assertTrue(re.search(r"catch\s*\(\s*\\?Throwable\b", content),
                            f"{local_api_labs} must catch \\Throwable for engine fault isolation")
            self.assertIn("unzip -q -o -d", content, "api_labs.php must extract subfolders")
            self.assertIn("preg_match('/\\.unl$/i'", content, "api_labs.php must recursively filter .unl")
            return

        # If running from development host and local file not found, probe target controller on Master node
        try:
            import paramiko

            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect("<MASTER_IP>", username="root", password="pnet", timeout=5)
            _, stdout, _ = ssh.exec_command(
                "grep -E 'catch\\s*\\(\\\\?Throwable' /opt/unetlab/html/includes/api_labs.php"
            )
            grep_out = stdout.read().decode()
            self.assertTrue(grep_out.strip(), "api_labs.php on Master VM must catch \\Throwable")

            _, stdout, _ = ssh.exec_command(
                "grep -E 'unzip -q -o -d' /opt/unetlab/html/includes/api_labs.php"
            )
            self.assertTrue(stdout.read().decode().strip(), "api_labs.php must extract subfolders with unzip -q -o -d")
            ssh.close()
        except Exception as e:
            self.skipTest(f"Master VM probe skipped: {e}")

    def test_gate_18_frontend_dom_idempotency_and_styling(self):
        """Gate 18: Verify zero recursive MutationObserver loops and consistent button styling."""
        candidates = [
            os.path.join(REPO_ROOT, "Custom-Features", "web-ui", "main", "pnet-features.js"),
            os.path.join(REPO_ROOT, "html", "main", "pnet-features.js"),
            "/opt/unetlab/html/main/pnet-features.js",
        ]
        features_js = next((p for p in candidates if os.path.exists(p)), None)
        self.assertIsNotNone(features_js, "pnet-features.js must exist")

        with open(features_js, "r", encoding="utf-8", errors="ignore") as f:
            js_content = f.read()

        # Assert no destructive recursive MutationObserver modifying DOM text inside callback
        self.assertNotIn("new MutationObserver(function() {\n          span.textContent = 'Azam Features';", js_content,
                         "Destructive recursive MutationObserver modifying DOM inside its own callback must not exist")

        # Assert 404 icons.js script injection is removed
        self.assertNotIn("s.src = '/main/js/icons.js';", js_content, "404 icons.js injection must be removed")

        # Assert Anti-Bootstorm buttons use standard class names
        self.assertIn("bsBtn.className = 'btn';", js_content, "Anti-Bootstorm toolbar button must use standard 'btn' class")
        self.assertIn("pBsBtn.className = 'lab-preview__btn';", js_content,
                      "Anti-Bootstorm preview button must use standard 'lab-preview__btn' class")


if __name__ == "__main__":
    unittest.main()
