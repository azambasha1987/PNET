"""
Tests for Workstream 6 (Docker Subsystem), Workstream 7 (Canvas Tools),
and Workstream 8 (Satellite Cluster Interconnects).
"""

import os
import glob
import json
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")
TEMPLATES_INTEL = os.path.join(ROOT_DIR, "Custom-Customization", "templates", "intel")
TEMPLATES_AMD = os.path.join(ROOT_DIR, "Custom-Customization", "templates", "amd")
if not os.path.isdir(TEMPLATES_INTEL):
    TEMPLATES_INTEL = os.path.join(ROOT_DIR, "html", "templates", "intel")
if not os.path.isdir(TEMPLATES_AMD):
    TEMPLATES_AMD = os.path.join(ROOT_DIR, "html", "templates", "amd")


class TestWorkstreams678(unittest.TestCase):

    def test_workstream6_docker_templates_exist(self):
        """Assert official docker templates exist in both architectures."""
        intel_docker = os.path.join(TEMPLATES_INTEL, "docker.yml")
        amd_docker = os.path.join(TEMPLATES_AMD, "docker.yml")
        self.assertTrue(os.path.exists(intel_docker), "Missing intel/docker.yml")
        self.assertTrue(os.path.exists(amd_docker), "Missing amd/docker.yml")

    def test_workstream6_docker_provisioner_script(self):
        """Assert pnet-upload-and-docker-fix.sh exists and supports --check."""
        fix_script = os.path.join(ROOT_DIR, "Custom-Features", "scripts", "pnet-upload-and-docker-fix.sh")
        if not os.path.exists(fix_script):
            fix_script = os.path.join(SCRIPTS_DIR, "pnet-upload-and-docker-fix.sh")
        self.assertTrue(os.path.exists(fix_script), "Missing pnet-upload-and-docker-fix.sh")
        with open(fix_script, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("--check", content)
        self.assertIn("net.ipv4.ip_forward", content)

    def test_workstream8_satd_script_and_verbs(self):
        """Assert pnet-satd.py exists and defines cluster protocol verbs."""
        satd_path = os.path.join(SCRIPTS_DIR, "pnet-satd.py")
        self.assertTrue(os.path.exists(satd_path), "Missing pnet-satd.py")
        with open(satd_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("FORWARD_VERBS", content)
        self.assertIn("node_validate", content)
        self.assertIn("linkwatch_start", content)
        self.assertIn("prototrace_start", content)
        self.assertIn("pkg_version", content)

    def test_workstream8_satellite_join_script(self):
        """Assert pnet-satellite-join.sh exists and enforces HMAC / TLS checks."""
        join_path = os.path.join(SCRIPTS_DIR, "pnet-satellite-join.sh")
        self.assertTrue(os.path.exists(join_path), "Missing pnet-satellite-join.sh")
        with open(join_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("CLUSTER_PSK", content)
        self.assertIn("satd.conf", content)


if __name__ == "__main__":
    unittest.main()

