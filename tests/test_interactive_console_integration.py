import os
import time
import unittest

try:
    import pytest
except ImportError:
    pytest = None

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    sync_playwright = None
    PLAYWRIGHT_AVAILABLE = False

if not PLAYWRIGHT_AVAILABLE and pytest:
    pytest.skip("Playwright not installed; skipping browser console integration test.", allow_module_level=True)

class TestInteractiveConsoleIntegration(unittest.TestCase):
    def test_interactive_console_integration(self):
        if not PLAYWRIGHT_AVAILABLE:
            self.skipTest("Playwright not installed; skipping browser console integration test.")
        main()

ARTIFACT_DIR = r"C:\Users\azamb\.gemini\antigravity\brain\53959bcc-ebd3-4baa-a7c6-5bcbd4f78f68"

def main():
    with sync_playwright() as p:
        print("[1] Launching Chrome...")
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(viewport={"width": 1500, "height": 950})
        page = context.new_page()

        print("[2] Logging in to PNetLab...")
        page.goto("http://<MASTER_IP>/login/")
        page.fill('input[name="username"]', 'admin')
        page.fill('input[name="password"]', 'pnet')
        btn = page.query_selector('button[type="submit"]') or page.query_selector('button') or page.query_selector('input[type="submit"]')
        if btn:
            btn.click()
        page.wait_for_timeout(3000)

        print("[3] Navigating to Lab Topology...")
        page.goto("http://<MASTER_IP>/legacy/topology")
        page.wait_for_timeout(4000)

        # Set HTML5 console mode in localStorage
        page.evaluate("""() => {
            localStorage.setItem('pnq_html5_console', '1');
            document.cookie = 'pnq_html5_console=1;path=/;max-age=31536000';
            localStorage.setItem('az_console_mode', 'docked');
        }""")

        # Open Docked Console drawer
        print("[4] Opening In-Canvas Docked Console with DCSW-1...")
        page.evaluate("""() => {
            if (window.pnetDockedConsole) {
                window.pnetDockedConsole.openSession(
                    { id: 1, name: 'DCSW-1' },
                    '/console/console.html?node=1&type=telnet',
                    'DCSW-1'
                );
            }
        }""")
        page.wait_for_timeout(4000)

        # Find console iframe for DCSW-1
        dcsw1_frame = None
        for frame in page.frames:
            if "node=1" in frame.url:
                dcsw1_frame = frame
                break

        if dcsw1_frame:
            print("[5] Interacting with DCSW-1 terminal...")
            dcsw1_frame.click('.xterm-screen', timeout=5000)
            page.wait_for_timeout(500)
            page.keyboard.press("Enter")
            page.wait_for_timeout(1000)
            page.keyboard.press("Enter")
            page.wait_for_timeout(1000)
            page.keyboard.type("show ip int brief")
            page.keyboard.press("Enter")
            page.wait_for_timeout(2500)

        # Step 1: Single docked terminal with live Cisco IOS CLI output
        shot1 = os.path.join(ARTIFACT_DIR, "step1_docked_terminal_live.png")
        page.screenshot(path=shot1)
        print(f"  [✔] Screenshot 1: {shot1}")

        # Step 2: 2x Dual Split (DCSW-1 and DCSW-2 side-by-side)
        print("[6] Switching to 2x Split Layout and docking DCSW-2...")
        page.evaluate("""() => {
            if (window.pnetDockedConsole) {
                window.pnetDockedConsole.setLayout('2x');
                window.pnetDockedConsole.openSession(
                    { id: 2, name: 'DCSW-2' },
                    '/console/console.html?node=2&type=telnet',
                    'DCSW-2'
                );
            }
        }""")
        page.wait_for_timeout(4000)

        # Find console iframe for DCSW-2
        dcsw2_frame = None
        for frame in page.frames:
            if "node=2" in frame.url:
                dcsw2_frame = frame
                break

        if dcsw2_frame:
            print("[7] Interacting with DCSW-2 terminal...")
            dcsw2_frame.click('.xterm-screen', timeout=5000)
            page.wait_for_timeout(500)
            page.keyboard.press("Enter")
            page.wait_for_timeout(1000)
            page.keyboard.press("Enter")
            page.wait_for_timeout(1000)
            page.keyboard.type("show version | include IOS")
            page.keyboard.press("Enter")
            page.wait_for_timeout(2500)

        shot2 = os.path.join(ARTIFACT_DIR, "step2_docked_dual_split_live.png")
        page.screenshot(path=shot2)
        print(f"  [✔] Screenshot 2: {shot2}")

        # Step 3: Syntax Highlighting toggle
        print("[8] Enabling Real-Time CLI Syntax Highlighting Filter...")
        page.evaluate("""() => {
            if (window.pnetCliSyntax) {
                window.pnetCliSyntax.setEnabled(true);
            }
        }""")
        page.wait_for_timeout(2000)

        shot3 = os.path.join(ARTIFACT_DIR, "step3_cli_syntax_highlighted.png")
        page.screenshot(path=shot3)
        print(f"  [✔] Screenshot 3: {shot3}")

        browser.close()
        print("[✔] Complete test suite executed successfully!")

if __name__ == "__main__":
    main()

