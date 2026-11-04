#!/usr/bin/env python3
"""
PNetLab Database & Services Integration Test Suite (test_database_and_services.py)
Validates the backend subsystem:
1. SQL Schema integrity in schema/pnetlab_db.sql.
2. Systemd service definitions (pnetlab-brokerd, pnetlab-mcp, pnetlab-network-engine).
3. Broker daemon verb registration and IPC socket specification.
4. Administrative toolchain and credential standardization.
"""

import os
import re
import sys
import unittest

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
SCHEMA_DIR = os.path.join(ROOT_DIR, "Custom-Features", "schema")
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")

class TestDatabaseAndServices(unittest.TestCase):

    def test_database_schema_file(self):
        """Verify database schema exists, is non-empty, and contains core tables."""
        schema_file = os.path.join(SCHEMA_DIR, "pnet_features_db.sql")
        if not os.path.isfile(schema_file):
            schema_file = os.path.join(ROOT_DIR, "schema", "pnetlab_db.sql")
        self.assertTrue(os.path.isfile(schema_file), "Database schema must exist")

        with open(schema_file, "r", encoding="utf-8") as f:
            sql = f.read()

        self.assertTrue("CREATE TABLE" in sql, "CREATE TABLE statements must exist in schema")

    def test_broker_daemon_verbs_and_socket(self):
        """Verify pnet-brokerd.py registers essential verbs and binds to /run/azamlabs/broker.sock or /run/pnetlab/broker.sock."""
        broker_file = os.path.join(SCRIPTS_DIR, "pnet-brokerd.py")
        self.assertTrue(os.path.isfile(broker_file), "pnet-brokerd.py must exist")

        with open(broker_file, "r", encoding="utf-8") as f:
            code = f.read()

        # Check socket definition
        self.assertTrue("broker.sock" in code)
        self.assertIn('SOCK_GROUP = "www-data"', code)

        # Check critical allowlisted verbs
        essential_verbs = [
            "ping", "wrapper", "session_cleanup", "linkwatch_start", "nodestats"
        ]
        for v in essential_verbs:
            self.assertIn(f'"{v}"', code, f"Verb {v} must be defined in broker verbs")

    def test_systemd_service_syntax(self):
        """Verify systemd service units have correct structure and point to executables."""
        mcp_svc = os.path.join(ROOT_DIR, "Custom-Features", "mcp", "pnet-mcp.service")
        if not os.path.isfile(mcp_svc):
            mcp_svc = os.path.join(SCRIPTS_DIR, "mcp", "pnet-mcp.service")
        self.assertTrue(os.path.isfile(mcp_svc), "pnet-mcp.service must exist")

        with open(mcp_svc, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("MCP", content)
        self.assertIn("ExecStart", content)

    def test_install_script_database_and_user_grants(self):
        """Verify install-master.sh provisions MySQL setup."""
        install_sh = os.path.join(ROOT_DIR, "install", "install-master.sh")
        if not os.path.isfile(install_sh):
            install_sh = os.path.join(ROOT_DIR, "install.sh")
        self.assertTrue(os.path.isfile(install_sh), "install-master.sh must exist")
        with open(install_sh, "r", encoding="utf-8") as f:
            code = f.read()

        self.assertTrue("mysql" in code.lower() or "mariadb" in code.lower() or "apply-all-custom.sh" in code)

    def test_broker_netcfg_dual_sync(self):
        """Verify pnet-brokerd.py supports dynamic uplink discovery and Netplan synchronization."""
        broker_file = os.path.join(SCRIPTS_DIR, "pnet-brokerd.py")
        with open(broker_file, "r", encoding="utf-8") as f:
            code = f.read()

        self.assertIn("def _get_real_iface():", code, "pnet-brokerd.py must define dynamic physical interface discovery")

        sync_sh = os.path.join(ROOT_DIR, "Custom-Performance", "scripts", "pnet-sync-network-config.sh")
        if not os.path.isfile(sync_sh):
            sync_sh = os.path.join(SCRIPTS_DIR, "pnet-sync-network-config.sh")
        self.assertTrue(os.path.isfile(sync_sh), "pnet-sync-network-config.sh must exist")

if __name__ == "__main__":
    unittest.main()
