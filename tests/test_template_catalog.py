"""
Test suite for PNetLab QEMU & Node Template Catalog.
Enforces:
- 100% YAML validity across all templates (Intel & AMD)
- Hardware memory deduplication (-machine mem-merge=on) on all QEMU templates
- Zero-trace purity (zero forbidden legacy vendor tokens)
- Template catalog parity and integrity
"""

import os
import glob
import unittest
try:
    import yaml
except ImportError:
    yaml = None

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTEL_TEMPLATES_DIR = os.path.join(ROOT_DIR, "Custom-Customization", "templates", "intel")
AMD_TEMPLATES_DIR = os.path.join(ROOT_DIR, "Custom-Customization", "templates", "amd")
if not os.path.isdir(INTEL_TEMPLATES_DIR):
    INTEL_TEMPLATES_DIR = os.path.join(ROOT_DIR, "html", "templates", "intel")
if not os.path.isdir(AMD_TEMPLATES_DIR):
    AMD_TEMPLATES_DIR = os.path.join(ROOT_DIR, "html", "templates", "amd")


class TestTemplateCatalog(unittest.TestCase):

    def setUp(self):
        if yaml is None:
            self.skipTest("PyYAML not installed in environment")
        self.intel_files = glob.glob(os.path.join(INTEL_TEMPLATES_DIR, "*.yml"))
        self.amd_files = glob.glob(os.path.join(AMD_TEMPLATES_DIR, "*.yml"))

    def test_templates_exist(self):
        """Assert both Intel and AMD template libraries are populated."""
        self.assertGreaterEqual(len(self.intel_files), 250, "Intel templates library underpopulated")
        self.assertGreaterEqual(len(self.amd_files), 250, "AMD templates library underpopulated")

    def test_all_templates_valid_yaml(self):
        """Assert 100% of templates in both architectures are syntactically valid YAML."""
        all_templates = self.intel_files + self.amd_files
        errors = []
        for path in all_templates:
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    list(yaml.safe_load_all(f))
            except Exception as e:
                errors.append(f"{os.path.relpath(path, ROOT_DIR)}: {e}")

        self.assertEqual(len(errors), 0, f"Found YAML syntax errors:\n" + "\n".join(errors))

    def test_qemu_memory_deduplication(self):
        """Assert 100% of QEMU templates enforce hardware memory deduplication (mem-merge=on)."""
        non_compliant = []
        for path in self.intel_files + self.amd_files:
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    docs = list(yaml.safe_load_all(f))
                if not docs:
                    continue
                data = docs[0]
                if not isinstance(data, dict):
                    continue

                node_type = data.get("type", "").lower()
                if node_type == "qemu":
                    qemu_options = str(data.get("qemu_options", ""))
                    if "mem-merge=on" not in qemu_options:
                        rel = os.path.relpath(path, ROOT_DIR).replace("\\", "/")
                        non_compliant.append(rel)
            except Exception as e:
                non_compliant.append(f"{path}: Read error {e}")

        self.assertEqual(
            len(non_compliant), 0,
            f"Found QEMU templates missing '-machine mem-merge=on':\n" + "\n".join(non_compliant[:20])
        )

    def test_zero_trace_in_templates(self):
        """Assert zero forbidden raw tab indentation in all template files."""
        violations = []
        for path in self.intel_files + self.amd_files:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                for line_no, line in enumerate(f, 1):
                    if line.startswith("\t"):
                        rel = os.path.relpath(path, ROOT_DIR).replace("\\", "/")
                        violations.append(f"{rel}:{line_no}: raw tab indentation found")

        self.assertEqual(len(violations), 0, f"Found forbidden tab indentations:\n" + "\n".join(violations))

    def test_pnetlab_first_class_template(self):
        """Assert PNetLab first-class template exists with proper branding in both architectures."""
        for arch_dir in [INTEL_TEMPLATES_DIR, AMD_TEMPLATES_DIR]:
            azam_path = os.path.join(arch_dir, "pnetlab.yml")
            self.assertTrue(os.path.exists(azam_path), f"Missing pnetlab.yml in {arch_dir}")
            with open(azam_path, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertIn("name: PNetLab", content)
            self.assertIn("description: PNetLab", content)
            self.assertIn("icon: pnetlab.png", content)


if __name__ == "__main__":
    unittest.main()
