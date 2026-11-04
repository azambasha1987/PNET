#!/usr/bin/env bash
# ==============================================================================
# AzamLabs PHP 8.4 / 8.5 Runtime & API Modernizer for Ubuntu 26+ (Resolute)
# Injects #[AllowDynamicProperties] into core UNetLab and Slim framework classes,
# tunes PHP-FPM OPcache/memory limits, and stabilizes HTTP/HTTPS session cookies.
# ==============================================================================
set -euo pipefail

echo "============================================================"
echo "    [2/4] Modernizing PHP 8.4/8.5 Engine & Configurations..."
echo "============================================================"

# 1. Detect Installed PHP Version
PHP_VER="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null || echo "8.5")"
echo "      -> Detected PHP Runtime: PHP ${PHP_VER}"

# 2. Inject #[AllowDynamicProperties] into Core UNetLab & Slim Classes
echo "      -> Patching PHP classes with #[AllowDynamicProperties]..."
python3 - << 'PYEOF'
import os, re

# The azamlabs .deb ships PHP files with #[\AllowDynamicProperties] (note the backslash).
# PHP 8.2+ treats this as a PHP attribute identical to #[AllowDynamicProperties].
# PHP 8.5 fatal-errors if the attribute appears more than once on the same class.
# We must use exact string matching (not regex) because the backslash confuses patterns.

ATTR_BS  = '#[\\AllowDynamicProperties]'   # with backslash (as shipped by .deb)
ATTR_PLAIN = '#[AllowDynamicProperties]'    # without backslash (injected by us)

class_regex = re.compile(r'^(class\s+[A-Za-z0-9_]+)', re.MULTILINE)

# Scan the entire html tree — the .deb distributes duplicates across
# Slim/, Slim/Http/, Slim/Middleware/, Slim/Helper/, Slim/Exception/ and models/.
SCAN_ROOT = "/opt/unetlab/html"
deduped = 0
injected = 0

for root, dirs, files in os.walk(SCAN_ROOT):
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules')]
    for fname in files:
        if not fname.endswith('.php'):
            continue
        fpath = os.path.join(root, fname)
        try:
            content = open(fpath, encoding='utf-8', errors='ignore').read()
            changed = False

            # ── Pass 1: Deduplicate #[\AllowDynamicProperties] (backslash form) ──
            if content.count(ATTR_BS) > 1:
                first = content.find(ATTR_BS)
                content = content[:first + len(ATTR_BS)] + \
                          content[first + len(ATTR_BS):].replace(ATTR_BS, '')
                changed = True
                deduped += 1

            # ── Pass 2: Deduplicate #[AllowDynamicProperties] (plain form) ────────
            if content.count(ATTR_PLAIN) > 1:
                first = content.find(ATTR_PLAIN)
                content = content[:first + len(ATTR_PLAIN)] + \
                          content[first + len(ATTR_PLAIN):].replace(ATTR_PLAIN, '')
                changed = True

            # ── Pass 3: Inject into files that have neither form yet ──────────────
            has_attr = (ATTR_BS in content) or (ATTR_PLAIN in content)
            if not has_attr:
                def repl(m):
                    global injected
                    injected += 1
                    return ATTR_PLAIN + '\n' + m.group(1)
                new_content = class_regex.sub(repl, content, count=1)
                if new_content != content:
                    content = new_content
                    changed = True

            if changed:
                open(fpath, 'w', encoding='utf-8').write(content)
        except Exception as e:
            print(f"  SKIP {fpath}: {e}")

print(f"  Deduplicated: {deduped} file(s)")
print(f"  Injected attr: {injected} file(s)")
PYEOF


# 3. Ensure Session Cookie Compatibility in api.php and functions.php
API_PHP="/opt/unetlab/html/api.php"
if [ -f "$API_PHP" ]; then
    sed -i 's/"secure" *=> *true/"secure" => (!empty($_SERVER["HTTPS"]) \&\& $_SERVER["HTTPS"] !== "off")/g' "$API_PHP" 2>/dev/null || true
    sed -i 's/"samesite" *=> *"Strict"/"samesite" => "Lax"/g' "$API_PHP" 2>/dev/null || true
    echo "      -> Modernized session cookie attributes in api.php"
fi
FUNCS_PHP="/opt/unetlab/html/includes/functions.php"
if [ -f "$FUNCS_PHP" ]; then
    sed -i 's/"secure" *=> *true/"secure" => (!empty($_SERVER["HTTPS"]) \&\& $_SERVER["HTTPS"] !== "off")/g' "$FUNCS_PHP" 2>/dev/null || true
    sed -i 's/"samesite" *=> *"Strict"/"samesite" => "Lax"/g' "$FUNCS_PHP" 2>/dev/null || true
    echo "      -> Modernized session cookie attributes in functions.php"

    # Harden unlockFile and unlockSession against Slim ErrorException on missing/race lock files
    python3 - << 'PYFUNCEOF' 2>/dev/null || true
fpath = "/opt/unetlab/html/includes/functions.php"
try:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    old_unlock_file = """function unlockFile($file)
{
    if (is_file($file . ".lock")) {
        return unlink($file . ".lock");
    }
    return true;
}"""

    new_unlock_file = """function unlockFile($file)
{
    $lock = $file . ".lock";
    if (file_exists($lock)) {
        @unlink($lock);
        clearstatcache(true, $lock);
    }
    return true;
}"""

    old_unlock_session = """function unlockSession($labSession)
{
    $file = BASE_LAB . "/" . $labSession . ".lock";
    if (is_file($file)) {
        return unlink($file);
    }
    return true;
}"""

    new_unlock_session = """function unlockSession($labSession)
{
    $file = BASE_LAB . "/" . $labSession . ".lock";
    if (file_exists($file)) {
        @unlink($file);
        clearstatcache(true, $file);
    }
    return true;
}"""

    if old_unlock_file in content:
        content = content.replace(old_unlock_file, new_unlock_file)
    if old_unlock_session in content:
        content = content.replace(old_unlock_session, new_unlock_session)

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    print("      -> Hardened unlockFile and unlockSession with @unlink and clearstatcache")
except Exception as e:
    print(f"      -> Note on functions.php lock patch: {e}")
PYFUNCEOF
fi

# 3.5 Harden Lab Node Instantiation & Eliminate XPath Loop Overhead in __lab.php
LAB_PHP="/opt/unetlab/html/includes/__lab.php"
if [ -f "$LAB_PHP" ]; then
    python3 - << 'PYLABEOF'
import re, os

fpath = "/opt/unetlab/html/includes/__lab.php"
try:
    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # Search for legacy loop: $this->nodes[$n['id']]->edit($params);
    old_pattern = r"(// Lab nodes \(networks must be alredy loaded\)[\s\S]*?foreach \(\$xml->xpath\('//lab/topology/nodes/node'\) as \$node_id => \$node\) \{[\s\S]*?\$this->nodes\[\$n\['id'\]\]->edit\(\$params\);[\s\S]*?\$this->nodes\[\$n\['id'\]\]->linkInterface\(\$i\);\s*\}\s*\})"

    replacement = """// Lab nodes (networks must be already loaded)
            // Pre-index lab configs and multi-configs once (O(1) lookup, stops in-loop XPath re-parsing & JIT register corruption)
            $configsMap = [];
            foreach ($xml->xpath('//lab/objects/configs/config') as $cfgNode) {
                if (isset($cfgNode->attributes()->id)) {
                    $configsMap[(int) $cfgNode->attributes()->id] = (string) $cfgNode;
                }
            }
            $multiConfigsMap = [];
            foreach ($xml->xpath('//lab/multi_configs/multi_config_lab') as $mcfgNode) {
                if (isset($mcfgNode->attributes()->id)) {
                    $multiConfigsMap[(int) $mcfgNode->attributes()->id] = (string) $mcfgNode;
                }
            }

            $legacyPlacements = [];
            foreach ($xml->xpath('//lab/topology/nodes/node') as $node_id => $node) {
                $attrs = $node->attributes();
                if (!isset($attrs->id)) continue;
                $nodeId = (int) $attrs->id;
                if ($nodeId <= 0) continue;

                $n = ['id' => $nodeId];
                if (isset($attrs->template)) $n['template'] = (string) $attrs->template;
                if (isset($attrs->type)) $n['type'] = (string) $attrs->type;

                try {
                    $nodeObj = new Node($n, $nodeId, $this->tenant, $this, $this->node_sessions);
                    $this->nodes[$nodeId] = $nodeObj;
                } catch (Exception $e) {
                    error_log(date('M d H:i:s ') . 'WARNING: ' . $f . ':node' . $nodeId . ' ' . $e->getMessage());
                    continue;
                }

                $params = [];
                $options = $nodeObj->getOptions();
                foreach ($options as $key => $value) {
                    if (isset($attrs->$key)) $params[$key] = (string) $attrs->$key;
                }

                // Collect legacy cluster_host XML attrs for migration (not via getOptions — removed).
                $xmlHost = (int) ($attrs->cluster_host ?? 0);
                if ($xmlHost > 0) {
                    $legacyPlacements[$nodeId] = $xmlHost;
                }

                if (isset($configsMap[$nodeId]) && strlen($configsMap[$nodeId]) > 0) {
                    $params['config_data'] = $configsMap[$nodeId];
                }
                if (isset($multiConfigsMap[$nodeId]) && strlen($multiConfigsMap[$nodeId]) > 0) {
                    $params['multi_config'] = $multiConfigsMap[$nodeId];
                }

                $nodeObj->edit($params);

                foreach ($node->interface as $interface) {
                    // Loading configured interfaces for this node
                    $i = array();
                    $iattrs = $interface->attributes();

                    $i['id'] = (string) $iattrs->id;
                    $i['type'] = (string) $iattrs->type;
                    $i['networks'] = $this->networks;

                    foreach ($iattrs as $key => $value) {
                        $i[$key] = (string) $value;
                    }

                    $nodeObj->linkInterface($i);
                }
            }"""

    if "$configsMap" not in content and re.search(old_pattern, content):
        new_content = re.sub(old_pattern, replacement, content, count=1)
        if new_content != content:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print("      -> Successfully hardened Lab node instantiation in __lab.php")
    else:
        # Check and cleanup duplicate closing brace if left by any previous pass
        if "}\n            }\n\n            }\n            // Migrate" in content:
            content = content.replace("}\n            }\n\n            }\n            // Migrate", "}\n            }\n            // Migrate")
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(content)
            print("      -> Cleaned up duplicate closing brace in __lab.php")
        else:
            print("      -> __lab.php already contains optimized node instantiation")
except Exception as e:
    print(f"      -> Note on __lab.php patch: {e}")
PYLABEOF
fi

# Ensure PHP-FPM FastCGI is registered with Apache
a2enmod proxy_fcgi setenvif rewrite ssl headers 2>/dev/null || true
a2enconf "php${PHP_VER}-fpm" 2>/dev/null || a2enconf php-fpm 2>/dev/null || true

# 4. Tune PHP-FPM and PHP CLI Configurations (Disable Buggy JIT in PHP 8.4/8.5)
for conf in /etc/php/${PHP_VER}/fpm/php.ini /etc/php/${PHP_VER}/cli/php.ini /etc/php/*/*/php.ini; do
    if [ -f "$conf" ]; then
        sed -i 's/^memory_limit = .*/memory_limit = 2048M/' "$conf" 2>/dev/null || true
        sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 100G/' "$conf" 2>/dev/null || true
        sed -i 's/^post_max_size = .*/post_max_size = 100G/' "$conf" 2>/dev/null || true
        sed -i 's/^max_execution_time = .*/max_execution_time = 3600/' "$conf" 2>/dev/null || true
        sed -i 's/^max_input_time = .*/max_input_time = 3600/' "$conf" 2>/dev/null || true
        sed -i 's/^;max_input_vars = .*/max_input_vars = 100000/' "$conf" 2>/dev/null || true
        sed -i 's/^max_input_vars = .*/max_input_vars = 100000/' "$conf" 2>/dev/null || true
        sed -i 's/^error_reporting = .*/error_reporting = E_ALL \& ~E_DEPRECATED \& ~E_NOTICE \& ~E_USER_DEPRECATED/' "$conf" 2>/dev/null || true
        
        # OPcache Settings (Bytecode Caching Active, JIT disabled to prevent C-pointer clobbering)
        sed -i 's/^;*opcache.enable=.*/opcache.enable=1/' "$conf" 2>/dev/null || true
        sed -i 's/^;*opcache.enable_cli=.*/opcache.enable_cli=1/' "$conf" 2>/dev/null || true
        sed -i 's/^;*opcache.memory_consumption=.*/opcache.memory_consumption=512/' "$conf" 2>/dev/null || true
        sed -i 's/^;*opcache.interned_strings_buffer=.*/opcache.interned_strings_buffer=64/' "$conf" 2>/dev/null || true
        sed -i 's/^;*opcache.max_accelerated_files=.*/opcache.max_accelerated_files=50000/' "$conf" 2>/dev/null || true
        sed -i 's/^;*opcache.revalidate_freq=.*/opcache.revalidate_freq=2/' "$conf" 2>/dev/null || true
        sed -i 's/^;*opcache.jit=.*/opcache.jit=disable/' "$conf" 2>/dev/null || true
        sed -i 's/^;*opcache.jit_buffer_size=.*/opcache.jit_buffer_size=0/' "$conf" 2>/dev/null || true
        sed -i '/opcache.jit=tracing/d' "$conf" 2>/dev/null || true
        grep -q "opcache.jit=disable" "$conf" || echo "opcache.jit=disable" >> "$conf" 2>/dev/null || true
        grep -q "opcache.jit_buffer_size=0" "$conf" || echo "opcache.jit_buffer_size=0" >> "$conf" 2>/dev/null || true
    fi
done

# Clean up standalone mod configs that forced JIT tracing
for mod_ini in /etc/php/*/mods-available/99-azambasha-opcache.ini /etc/php/*/*/conf.d/99-azambasha-opcache.ini; do
    if [ -f "$mod_ini" ]; then
        sed -i 's/opcache.jit = tracing/opcache.jit = disable/g' "$mod_ini" 2>/dev/null || true
        sed -i 's/opcache.jit_buffer_size = 64M/opcache.jit_buffer_size = 0/g' "$mod_ini" 2>/dev/null || true
    fi
done

echo "      -> OPcache Bytecode Cache active (512MB), JIT safely disabled, 2GB memory & 100GB limits applied"

# 5. Restart All Active PHP-FPM Services & Apache
for svc in $(systemctl list-units --type=service --state=running 2>/dev/null | grep -o 'php[0-9.]*-fpm' | sort -u); do
    systemctl restart "$svc" 2>/dev/null || true
done
systemctl restart apache2 2>/dev/null || true

echo "============================================================"
echo "    [SUCCESS] PHP 8.3/8.4/8.5+ Engine & Runtime Modernized! "
echo "============================================================"
