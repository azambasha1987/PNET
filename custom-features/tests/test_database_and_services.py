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
SCHEMA_DIR = os.path.join(ROOT_DIR, "schema")
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")

class TestDatabaseAndServices(unittest.TestCase):

    def test_database_schema_file(self):
        """Verify schema/pnetlab_db.sql exists, is non-empty, and contains core tables."""
        schema_file = os.path.join(SCHEMA_DIR, "pnetlab_db.sql")
        self.assertTrue(os.path.isfile(schema_file), "schema/pnetlab_db.sql must exist")

        with open(schema_file, "r", encoding="utf-8") as f:
            sql = f.read()

        self.assertIn("CREATE TABLE `control`", sql, "control table must exist in schema")
        self.assertIn("CREATE TABLE `schema_version`", sql, "schema_version table must exist in schema")
        self.assertIn("CREATE TABLE `users`", sql, "users table must exist in schema")
        self.assertIn("CREATE TABLE `lab_sessions`", sql, "lab_sessions table must exist in schema")

    def test_broker_daemon_verbs_and_socket(self):
        """Verify pnetlab-brokerd.py registers essential verbs and binds to /run/pnetlab/broker.sock."""
        broker_file = os.path.join(SCRIPTS_DIR, "pnetlab-brokerd.py")
        self.assertTrue(os.path.isfile(broker_file), "pnetlab-brokerd.py must exist")

        with open(broker_file, "r", encoding="utf-8") as f:
            code = f.read()

        # Check socket definition
        self.assertIn('SOCK_PATH = "/run/pnetlab/broker.sock"', code)
        self.assertIn('SOCK_GROUP = "www-data"', code)

        # Check critical allowlisted verbs
        essential_verbs = [
            "ping", "wrapper", "qemu_cpu_scope", "qemu_cpu_policy",
            "session_cleanup", "linkwatch_start", "nodestats"
        ]
        for v in essential_verbs:
            self.assertIn(f'"{v}"', code, f"Verb {v} must be defined in broker verbs")

    def test_systemd_service_syntax(self):
        """Verify systemd service units have correct structure and point to pnetlab executables."""
        mcp_svc = os.path.join(SCRIPTS_DIR, "mcp", "pnetlab-mcp.service")
        self.assertTrue(os.path.isfile(mcp_svc), "pnetlab-mcp.service must exist")

        with open(mcp_svc, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("Description=PNetLab MCP server", content)
        self.assertIn("ExecStart=/usr/bin/python3 /opt/unetlab/scripts/mcp/pnetlab-mcp.py", content)
        self.assertIn("User=pnetlab-mcp", content)

    def test_install_script_database_and_user_grants(self):
        """Verify install.sh provisions pnetlab_db and pnetlab MySQL user."""
        install_sh = os.path.join(ROOT_DIR, "install.sh")
        with open(install_sh, "r", encoding="utf-8") as f:
            code = f.read()

        self.assertIn("CREATE DATABASE IF NOT EXISTS pnetlab_db", code)
        self.assertIn("CREATE USER IF NOT EXISTS 'pnetlab'@'localhost'", code)
        self.assertIn("GRANT ALL PRIVILEGES ON pnetlab_db.* TO 'pnetlab'@'localhost'", code)
        self.assertIn("schema/pnetlab_db.sql", code)

    def test_broker_netcfg_dual_sync(self):
        """Verify pnetlab-brokerd.py supports dynamic uplink discovery and Netplan synchronization."""
        broker_file = os.path.join(SCRIPTS_DIR, "pnetlab-brokerd.py")
        with open(broker_file, "r", encoding="utf-8") as f:
            code = f.read()

        self.assertIn("def _get_real_iface():", code, "pnetlab-brokerd.py must define dynamic physical interface discovery")
        self.assertIn("/etc/netplan/01-pnetlab-netcfg.yaml", code, "verb_server_netcfg must synchronize Netplan 1.0 configuration")
        self.assertIn("dhcp4-overrides", code, "Netplan DHCP must enforce MAC identifier")

        sync_sh = os.path.join(SCRIPTS_DIR, "azambasha-sync-network-config.sh")
        self.assertTrue(os.path.isfile(sync_sh), "azambasha-sync-network-config.sh must exist")

if __name__ == "__main__":
    unittest.main()
