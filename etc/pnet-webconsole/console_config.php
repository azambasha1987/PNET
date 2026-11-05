<?php
/**
 * console_config.php — shared constants for the web console.
 *
 * Keep this file OUTSIDE the web root or deny direct access. GUAC_CRYPT_KEY is
 * a shared secret with guacamole-lite-server.js (env GUAC_CRYPT_KEY) and MUST
 * be identical on both sides.
 */

// Where short-lived telnet/vnc tokens are written. tmpfs is ideal (cleared on
// reboot, never hits disk). Must match PNET_TOKEN_DIR for the bridge/websockify.
define('TOKEN_DIR', '/dev/shm/pnet-tokens');

// Token lifetime hint (seconds) returned to the client. Enforce real expiry by
// reaping TOKEN_DIR (see janitor note in README).
define('TOKEN_TTL', 60);

// AES-256 key for guacamole-lite RDP tokens. EXACTLY 32 bytes.
// Generate once, e.g.:  head -c 32 /dev/urandom | base64 | cut -c1-32
define('GUAC_CRYPT_KEY', 'CHANGE_ME_32_byte_shared_secret!');
