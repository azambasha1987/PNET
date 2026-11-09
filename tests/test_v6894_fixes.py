import unittest
import os
import re
import hashlib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

class TestV6894Fixes(unittest.TestCase):
    """
    Test suite verifying the remediation of all 6 issues backported
    from PNetLab v6.8.94 into the current version.
    """

    def test_fix1_lab_root_move_and_validation(self):
        """Codeberg #99: Moving a lab to root ('/' or '') normalizes path and validation tasks move with it."""
        api_labs_php = REPO_ROOT / "Custom-Features" / "patches" / "html" / "includes" / "api_labs.php"
        self.assertTrue(api_labs_php.is_file(), "api_labs.php patch must exist")
        content = api_labs_php.read_text(encoding="utf-8")

        # Destination path normalization check
        self.assertIn("($path === '/' || $path === '') ? '' : '/' . trim($path, '/')", content,
                      "apiMoveLab must normalize root destination without leading/trailing double slash")
        self.assertTrue("lab_validation_move_transaction(" in content or "lab_validation_move(" in content,
                        "apiMoveLab must move lab validation tasks alongside the lab file")

        # Validation store normalization check
        val_store_php = REPO_ROOT / "Custom-Features" / "patches" / "html" / "includes" / "lab_validation_store.php"
        self.assertTrue(val_store_php.is_file(), "lab_validation_store.php patch must exist")
        val_content = val_store_php.read_text(encoding="utf-8")
        self.assertTrue("preg_replace('#/+#', '/'," in val_content or "preg_replace('#/{2,}#', '/'," in val_content,
                        "lab_validation_relative_path must collapse multiple slashes")
        self.assertIn("ltrim(", val_content,
                      "lab_validation_relative_path must strip leading slashes")

    def test_fix2_cat9k_export_and_first_boot(self):
        """Codeberg #98: Cat9k config export handles passwords and first boot without enable secret."""
        cat9k_script = REPO_ROOT / "Custom-Features" / "scripts" / "config_cat9kv.py"
        self.assertTrue(cat9k_script.is_file(), "config_cat9kv.py must exist in Custom-Features/scripts")
        code = cat9k_script.read_text(encoding="utf-8")

        # Password ladder and prompts
        self.assertTrue("LAB_PASSWORDS" in code or "DEFAULT_PASSWORDS" in code,
                        "Must define lab default passwords ladder")
        self.assertIn("Password:", code, "Must handle Password prompt")
        self.assertIn("Username:", code, "Must handle Username prompt")
        self.assertIn("Router>", code, "Must detect user EXEC prompt")
        self.assertIn("(config", code, "Must detect configuration mode")
        self.assertIn("--More--", code, "Must handle open pager")
        self.assertIn("Console password is not a lab default", code,
                      "Must fail fast with clear reason when password is not lab default")
        self.assertIn("Would you like to enter the", code,
                      "Must detect initial configuration dialog")
        # Ensure it terminates setup dialog without configuring an enable secret
        self.assertIn(r"no\r\n", code, "Must abort initial setup dialog")
        self.assertIn(r"\x03", code, "Must send Ctrl-C to abort setup dialog without setting enable secret")

    def test_fix3_session_idle_timeout_logging(self):
        """Codeberg #101: Idle timeout stamps 'Logged out (idle timeout)' with duration, backfilling past sessions once."""
        act_log_php = REPO_ROOT / "Custom-Features" / "patches" / "html" / "includes" / "activity_log.php"
        self.assertTrue(act_log_php.is_file(), "activity_log.php patch must exist")
        php_code = act_log_php.read_text(encoding="utf-8")

        self.assertIn("activity_log_sweep_idle_sessions", php_code,
                      "Must define activity_log_sweep_idle_sessions function")
        self.assertIn("idle_logout", php_code, "Must record 'idle_logout' action")
        self.assertIn("idle_timeout", php_code, "Must record 'idle_timeout' detail")
        self.assertIn("duration_seconds", php_code, "Must calculate duration_seconds")
        self.assertIn("activity_log_sweep_idle_sessions($db)", php_code,
                      "Must sweep idle sessions during log fetch")

        # UI renderer
        logs_js = REPO_ROOT / "Custom-Features" / "web-ui" / "main" / "js" / "logs.js"
        self.assertTrue(logs_js.is_file(), "logs.js must exist")
        js_code = logs_js.read_text(encoding="utf-8")
        self.assertIn("Logged out (idle timeout)", js_code,
                      "logs.js must render 'Logged out (idle timeout)' for idle session expiries")

    def test_fix4_http_node_console_streaming(self):
        """HTTP node consoles: non-HTML responses stream immediately; HTML buffered and rewritten."""
        bridge_py = REPO_ROOT / "Custom-Features" / "scripts" / "http_ws_bridge.py"
        self.assertTrue(bridge_py.is_file(), "http_ws_bridge.py must exist")
        py_code = bridge_py.read_text(encoding="utf-8")

        self.assertIn("client.send(req, stream=True)", py_code,
                      "Must send streaming request via httpx client")
        self.assertIn("rewrite_html", py_code, "Must rewrite HTML responses")
        self.assertIn("resp.aread()", py_code, "Must buffer HTML responses with aread()")
        self.assertIn("resp.aiter_bytes()", py_code,
                      "Must stream non-HTML response chunks with aiter_bytes()")

    def test_fix5_console_window_anti_flash(self):
        """Console window flash: floating console window background adopts loaded page without theme flash."""
        wc_js = REPO_ROOT / "Custom-Features" / "web-ui" / "main" / "pnetlab-webconsole.js"
        self.assertTrue(wc_js.is_file(), "pnetlab-webconsole.js must exist")
        js_code = wc_js.read_text(encoding="utf-8")

        self.assertIn("iframe{flex:1 1 auto;width:100%;border:0;background:transparent;}", js_code,
                      "Iframe default background must be transparent to avoid flashing theme color")
        self.assertIn("syncFrameBg", js_code, "Must implement syncFrameBg to adopt loaded page background")
        self.assertIn("frame.addEventListener('load', syncFrameBg)", js_code,
                      "Must attach load event listener to sync background from loaded document")

    def test_fix6_splunk_and_srlinux_manifest(self):
        """Splunk & SR Linux nodes: docker template manifest holds valid hash for splunk.yml and srlinux.yml."""
        manifest_path = REPO_ROOT / "scripts" / "docker-template-manifest.sha256"
        self.assertTrue(manifest_path.is_file(), "docker-template-manifest.sha256 must exist")
        lines = manifest_path.read_text(encoding="utf-8").splitlines()

        entries = {}
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) >= 2:
                entries[parts[1]] = parts[0]

        # Splunk hash verification
        splunk_tmpl = REPO_ROOT / "Custom-Customization" / "templates" / "intel" / "splunk.yml"
        splunk_hash = hashlib.sha256(splunk_tmpl.read_bytes()).hexdigest()
        self.assertEqual(splunk_hash, "e03a5e2854afe606024c6b8d52e7a4dfd5378e1f9bdada3666090e4bf6135135")
        self.assertEqual(entries.get("templates/intel/splunk.yml"), splunk_hash,
                         "Manifest must hold updated hash for templates/intel/splunk.yml")
        self.assertEqual(entries.get("templates/amd/splunk.yml"), splunk_hash,
                         "Manifest must hold updated hash for templates/amd/splunk.yml")

        # SR Linux hash verification
        srlinux_tmpl = REPO_ROOT / "Custom-Customization" / "templates" / "intel" / "srlinux.yml"
        srlinux_hash = hashlib.sha256(srlinux_tmpl.read_bytes()).hexdigest()
        self.assertEqual(srlinux_hash, "03a7fded50e180da2e109c39679d96a1916d26a69cd5a1790e6074cb0f7ace8a")
        self.assertEqual(entries.get("templates/intel/srlinux.yml"), srlinux_hash,
                         "Manifest must list templates/intel/srlinux.yml")
        self.assertEqual(entries.get("templates/amd/srlinux.yml"), srlinux_hash,
                         "Manifest must list templates/amd/srlinux.yml")

        # SR Linux IXR variant templates verification
        for ixr in ["srlinux-ixr-d2l.yml", "srlinux-ixr-d3.yml", "srlinux-ixr-d3l.yml"]:
            self.assertIn(f"templates/intel/{ixr}", entries)
            self.assertIn(f"templates/amd/{ixr}", entries)


if __name__ == "__main__":
    unittest.main()
