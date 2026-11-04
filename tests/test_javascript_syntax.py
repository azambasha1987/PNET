import os
import shutil
import subprocess
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAIN_JS = os.path.join(BASE_DIR, "Custom-Features", "web-ui", "main", "pnet-features.js")
if not os.path.isfile(MAIN_JS):
    MAIN_JS = os.path.join(BASE_DIR, "html", "main", "pnet-features.js")

CANVAS_JS = os.path.join(BASE_DIR, "Custom-Features", "web-ui", "ops-center", "pnet-features.js")
if not os.path.isfile(CANVAS_JS):
    CANVAS_JS = os.path.join(BASE_DIR, "html", "pnet-ops", "pnet-features.js")

DOCK_JS = os.path.join(BASE_DIR, "Custom-Features", "web-ui", "ops-center", "pnet-docked-console.js")
if not os.path.isfile(DOCK_JS):
    DOCK_JS = os.path.join(BASE_DIR, "html", "pnet-ops", "pnet-docked-console.js")

SEQ_JS = os.path.join(BASE_DIR, "Custom-Features", "web-ui", "ops-center", "pnet-sequenced-console.js")
if not os.path.isfile(SEQ_JS):
    SEQ_JS = os.path.join(BASE_DIR, "html", "pnet-ops", "pnet-sequenced-console.js")

SYNTAX_JS = os.path.join(BASE_DIR, "Custom-Features", "web-ui", "ops-center", "pnet-cli-syntax.js")
if not os.path.isfile(SYNTAX_JS):
    SYNTAX_JS = os.path.join(BASE_DIR, "html", "pnet-ops", "pnet-cli-syntax.js")

ALL_JS_FILES = [MAIN_JS, CANVAS_JS, DOCK_JS, SEQ_JS, SYNTAX_JS]

class TestJavaScriptSyntax(unittest.TestCase):

    def test_javascript_files_exist(self):
        for jf in ALL_JS_FILES:
            self.assertTrue(os.path.isfile(jf), f"JS file not found: {jf}")

    def test_app_register_hook_intact(self):
        with open(MAIN_JS, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertTrue(
            "App.register('pnet-features'" in content or 'App.register("pnet-features"' in content,
            "App.register('pnet-features', ...) is missing in html/main/pnet-features.js"
        )

    def test_no_dangling_trailing_operators(self):
        # Detect accidental dangling trailing '+' before statement boundaries
        for js_path in ALL_JS_FILES:
            with open(js_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            for idx, line in enumerate(lines[:-1]):
                s = line.strip()
                if s.endswith("+"):
                    next_line = lines[idx + 1].strip()
                    if (next_line.startswith("container.") or 
                        next_line.startswith("var ") or 
                        next_line.startswith("let ") or 
                        next_line.startswith("const ") or 
                        next_line.startswith("function ") or
                        next_line.startswith("document.")):
                        self.fail(f"Dangling trailing '+' operator at {os.path.basename(js_path)}:{idx+1} before statement: {next_line}")

    def test_iife_closures_balanced(self):
        for js_path in ALL_JS_FILES:
            with open(js_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            stack = []
            in_str = False
            str_char = ''
            in_block_comment = False
            i = 0
            n = len(content)
            while i < n:
                c = content[i]
                if in_block_comment:
                    if c == '*' and i + 1 < n and content[i+1] == '/':
                        in_block_comment = False
                        i += 2
                        continue
                    i += 1
                    continue

                if in_str:
                    if c == '\\':
                        i += 2
                        continue
                    if c == str_char:
                        in_str = False
                    i += 1
                    continue

                if c == '/' and i + 1 < n and content[i+1] == '/':
                    while i < n and content[i] != '\n':
                        i += 1
                    continue
                if c == '/' and i + 1 < n and content[i+1] == '*':
                    in_block_comment = True
                    i += 2
                    continue
                if c in ("'", '"', '`'):
                    in_str = True
                    str_char = c
                    i += 1
                    continue

                # Skip regex literal simplistically
                if c == '/' and i + 1 < n and content[i+1] not in ('/', '*'):
                    prev = content[:i].rstrip()
                    if prev and prev[-1] in ('(', '=', ':', ',', '[', '!', '&', '|', '?'):
                        i += 1
                        in_cc = False
                        while i < n:
                            if content[i] == '\\':
                                i += 2
                                continue
                            if content[i] == '[':
                                in_cc = True
                            elif content[i] == ']':
                                in_cc = False
                            elif content[i] == '/' and not in_cc:
                                break
                            i += 1
                        i += 1
                        continue

                if c in ('(', '{', '['):
                    stack.append(c)
                elif c in (')', '}', ']'):
                    self.assertGreater(len(stack), 0, f"Unmatched closing '{c}' in {os.path.basename(js_path)}")
                    top = stack.pop()
                    expected = {'(': ')', '{': '}', '[': ']'}[top]
                    self.assertEqual(expected, c, f"Mismatched bracket in {os.path.basename(js_path)}: expected '{expected}', got '{c}'")
                i += 1

            self.assertEqual(len(stack), 0, f"Unclosed tokens remaining in {os.path.basename(js_path)}: {stack}")

    def test_node_syntax_check_if_available(self):
        node_cmd = shutil.which("node")
        if not node_cmd:
            self.skipTest("node.js not installed on local host; balance tests passed")
        for js_path in ALL_JS_FILES:
            res = subprocess.run([node_cmd, "-c", js_path], capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, f"node -c failed on {js_path}: {res.stderr}")

if __name__ == '__main__':
    unittest.main()
