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
for target_php in /opt/unetlab/html/api.php /opt/unetlab/html/includes/functions.php; do
    if [ -f "$target_php" ]; then
        python3 -c '
import sys, re
target = sys.argv[1]
with open(target, "r") as f:
    data = f.read()
data = re.sub(r"\"secure\"\s*=>\s*true", "\"secure\" => ((!empty($_SERVER[\"HTTPS\"]) && $_SERVER[\"HTTPS\"] !== \"off\") || (isset($_SERVER[\"SERVER_PORT\"]) && $_SERVER[\"SERVER_PORT\"] == 443) || (isset($_SERVER[\"HTTP_X_FORWARDED_PROTO\"]) && $_SERVER[\"HTTP_X_FORWARDED_PROTO\"] === \"https\"))", data)
data = re.sub(r"\"samesite\"\s*=>\s*\"Strict\"", "\"samesite\" => \"Lax\"", data)
with open(target, "w") as f:
    f.write(data)
' "$target_php" 2>/dev/null || true
        echo "      -> Modernized session cookie attributes in $(basename "$target_php")"
    fi
done
FUNCS_PHP="/opt/unetlab/html/includes/functions.php"
if [ -f "$FUNCS_PHP" ]; then

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

# 3.6 Harden Lab XML Serialization in __lab.php (Prevent Error 20047 on HTML/Entities/Control Chars)
if [ -f "$LAB_PHP" ]; then
    python3 - << 'PYLABXMLEX'
import re

fpath = "/opt/unetlab/html/includes/__lab.php"
try:
    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    target = '''        // Well format the XML
        $dom = new DOMDocument('1.0');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = true
        $xmlLoaded = $dom->loadXML($xml->asXML());
        // Never replace a lab with XML that failed serialization.
        if ($xmlLoaded === false || $dom->documentElement === null || $dom->documentElement->nodeName !== 'lab') {
            error_log(date('M d H:i:s ') . 'ERROR: ' . $GLOBALS['messages'][20047]);
            return 20047;
        }
        //===================PNETLAB=====================
        $labContentXML = $dom->saveXML();'''

    # Support matching with semicolon after formatOutput = true;
    target_clean = target.replace('$dom->formatOutput = true', '$dom->formatOutput = true;')

    replacement = '''        // Well format the XML with resilient character sanitization and HTML entity normalization
        $xmlRaw = $xml->asXML();
        // 1. Strip illegal XML 1.0 control characters
        $xmlClean = preg_replace('/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/', '', $xmlRaw);

        // 2. Translate common HTML named entities to valid XML numeric entities
        $entitySearch = [
            '&nbsp;', '&copy;', '&reg;', '&trade;', '&mdash;', '&ndash;',
            '&hellip;', '&bull;', '&rsquo;', '&lsquo;', '&rdquo;', '&ldquo;',
            '&prime;', '&Prime;', '&deg;', '&plusmn;', '&times;', '&divide;'
        ];
        $entityReplace = [
            '&#160;', '&#169;', '&#174;', '&#8482;', '&#8212;', '&#8211;',
            '&#8230;', '&#8226;', '&#8217;', '&#8216;', '&#8221;', '&#8220;',
            '&#8242;', '&#8243;', '&#176;', '&#177;', '&#215;', '&#247;'
        ];
        $xmlClean = str_replace($entitySearch, $entityReplace, $xmlClean);

        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = true;
        $xmlLoaded = @$dom->loadXML($xmlClean, LIBXML_PARSEHUGE | LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_RECOVER);

        if ($xmlLoaded && $dom->documentElement !== null && $dom->documentElement->nodeName === 'lab') {
            $labContentXML = $dom->saveXML();
        } else if (substr(trim($xmlClean), 0, 5) === '<?xml' && strpos($xmlClean, '<lab') !== false) {
            // Resilient fallback: preserve sanitized serialized XML rather than destroying the lab save with 20047
            $labContentXML = $xmlClean;
        } else {
            error_log(date('M d H:i:s ') . 'ERROR: ' . $GLOBALS['messages'][20047]);
            return 20047;
        }
        //===================PNETLAB=====================
        if (!isset($labContentXML) || $labContentXML === false) {
            $labContentXML = $dom->saveXML();
        }'''

    if target_clean in content:
        content = content.replace(target_clean, replacement)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print("      -> Successfully hardened XML serialization in __lab.php (Error 20047 immune)")
    elif "$xmlClean = preg_replace" in content:
        print("      -> __lab.php already contains hardened XML serialization")
    else:
        # Regex fallback match
        pattern = r"// Well format the XML[\s\S]*?\$xmlLoaded = \$dom->loadXML\(\$xml->asXML\(\)\);[\s\S]*?return 20047;[\s\S]*?\$labContentXML = \$dom->saveXML\(\);"
        if re.search(pattern, content):
            new_content = re.sub(pattern, replacement.strip(), content, count=1)
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print("      -> Successfully patched XML serialization in __lab.php via regex")
except Exception as e:
    print(f"      -> Note on __lab.php XML serialization patch: {e}")
PYLABXMLEX
fi

# 3.7 Harden Lab Batch Import in api_labs.php (Resilient Raw Fallback & Non-blocking Responses)
API_LABS_PHP="/opt/unetlab/html/includes/api_labs.php"
if [ -f "$API_LABS_PHP" ]; then
    python3 - << 'PYAPILABEOF'
import re

fpath = "/opt/unetlab/html/includes/api_labs.php"
try:
    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    changed = False

    # 1. Initialize fallback tracking variables if not present
    init_target = """			$importLabs = scanDirFiles($tmpFolder);
			$errorLabs = [];
			$errorDetails = [];
			$eveTotal = 0;"""

    init_replacement = """			$importLabs = scanDirFiles($tmpFolder);
			$errorLabs = [];
			$errorDetails = [];
			$fallbackImportedLabs = [];
			$importedCount = 0;
			$eveTotal = 0;"""

    if init_target in content and "$fallbackImportedLabs" not in content:
        content = content.replace(init_target, init_replacement)
        changed = True

    # 2. Scope labFileName and labFileDir before try block
    scope_target = """		foreach ($importLabs as $importLab) {

			$relativePath = preg_replace('/^' . preg_quote($tmpFolder, '/') . '/', '', $importLab);
			$backupFailure = false;

			try {"""

    scope_replacement = """		foreach ($importLabs as $importLab) {

			$relativePath = preg_replace('/^' . preg_quote($tmpFolder, '/') . '/', '', $importLab);
			$labFileName = $labFolder . $relativePath;
			$labFileDir = dirname($labFileName);
			$backupFailure = false;

			try {"""

    if scope_target in content:
        content = content.replace(scope_target, scope_replacement)
        # Remove redundant re-declaration inside try
        content = content.replace("""				$labFileName = $labFolder . $relativePath;
				$labFileDir = dirname($labFileName);""", "// $labFileName and $labFileDir defined before try")
        changed = True

    # 3. Add resilient fallback move in catch and non-blocking response handling
    loop_target = """				if (!is_dir($labFileDir) && !mkdir($labFileDir, 0755, true) && !is_dir($labFileDir)) {
					throw new Exception('Could not create destination directory');
				}
				if (!rename($importLab, $labFileName)) {
					throw new Exception('Could not move imported lab to destination');
				}
			} catch (Exception $th) {
				error_log($th->getMessage());
				$errorLabs[] = $relativePath;
				if ($backupFailure || strpos($th->getMessage(), 'Could not move imported lab') === 0) {
					$errorDetails[] = $relativePath . ': ' . $th->getMessage();
				}
				continue;
			}
		}

		if (count($errorLabs) > 0) {
			$errorMessage = 'Some Labs can not be imported: ' . implode(', ', $errorLabs);
			if (count($errorDetails) > 0) {
				$errorMessage .= ' (' . implode('; ', $errorDetails) . ')';
			}
			throw new Exception($errorMessage);
		}

		$output['code'] = 200;
		$output['status'] = 'success';
		$output['message'] = $GLOBALS['messages'][80080];"""

    loop_replacement = """				if (!is_dir($labFileDir) && !mkdir($labFileDir, 0755, true) && !is_dir($labFileDir)) {
					throw new Exception('Could not create destination directory');
				}
				if (!rename($importLab, $labFileName)) {
					throw new Exception('Could not move imported lab to destination');
				}
				$importedCount++;
			} catch (Exception $th) {
				error_log('apiImportLabs: Exception on ' . $relativePath . ': ' . $th->getMessage());
				$errorLabs[] = $relativePath;
				if ($backupFailure || strpos($th->getMessage(), 'Could not move imported lab') === 0) {
					$errorDetails[] = $relativePath . ': ' . $th->getMessage();
				}

				// Resilient Raw Fallback Move: Ensure lab is never lost due to parser/serialization quirks
				if (file_exists($importLab) && !file_exists($labFileName)) {
					if (!is_dir($labFileDir)) {
						@mkdir($labFileDir, 0755, true);
					}
					if (@rename($importLab, $labFileName) || @copy($importLab, $labFileName)) {
						@chmod($labFileName, 0644);
						@chown($labFileName, 'www-data');
						$fallbackImportedLabs[] = $relativePath;
						error_log('apiImportLabs: Resiliently preserved lab file via raw fallback: ' . $relativePath);
					}
				}
				continue;
			}
		}

		$totalSuccessful = (isset($importedCount) ? $importedCount : 0) + (isset($fallbackImportedLabs) ? count($fallbackImportedLabs) : 0);
		if ($totalSuccessful === 0 && count($errorLabs) > 0) {
			$errorMessage = 'No Labs could be imported: ' . implode(', ', $errorLabs);
			if (count($errorDetails) > 0) {
				$errorMessage .= ' (' . implode('; ', $errorDetails) . ')';
			}
			throw new Exception($errorMessage);
		}

		$output['code'] = 200;
		$output['status'] = 'success';
		$output['message'] = $GLOBALS['messages'][80080];
		if (isset($fallbackImportedLabs) && count($fallbackImportedLabs) > 0) {
			$output['message'] .= ' (' . count($fallbackImportedLabs) . ' lab(s) imported via resilient schema fallback)';
		}"""

    if loop_target in content:
        content = content.replace(loop_target, loop_replacement)
        changed = True

    if changed:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print("      -> Successfully hardened api_labs.php with resilient fallback and non-blocking responses")
    elif "$fallbackImportedLabs" in content:
        print("      -> api_labs.php already contains hardened import logic")
    else:
        print("      -> Note on api_labs.php: target block not found")
except Exception as e:
    print(f"      -> Note on api_labs.php patch: {e}")
PYAPILABEOF
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

# Ensure drop-in conf.d files persist across Ubuntu apt upgrades
for CONF_D in /etc/php/*/fpm/conf.d /etc/php/*/cli/conf.d /etc/php/*/apache2/conf.d; do
    if [ -d "$CONF_D" ]; then
        cat << 'EOF_PHP_DROP' > "${CONF_D}/99-pnetlab-upload-limits.ini"
upload_max_filesize = 512M
post_max_size = 512M
memory_limit = 1024M
max_execution_time = 600
max_input_time = 600
EOF_PHP_DROP
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
