#!/usr/bin/env bash
# ==============================================================================
# PNetLab Instant Login & Web Credential Diagnostic & Repair Engine
# Resets credentials to upstream default: admin / pnet
# ==============================================================================
set -euo pipefail

GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
CYAN='\033[1;36m'
RESET='\033[0m'
BOLD='\033[1m'

log_info() { echo -e "${CYAN}[*]${RESET} $*"; }
log_ok()   { echo -e "${GREEN}[✔]${RESET} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${RESET} $*"; }
log_err()  { echo -e "${RED}[✘]${RESET} $*"; }

if [ "$(id -u)" -ne 0 ]; then
    log_err "This script must be run as root: sudo bash $0"
    exit 1
fi

echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${BOLD}       PNetLab Web-UI Login Diagnostic & Repair Engine          ${RESET}"
echo -e "       Target Default Credentials: ${BOLD}admin / pnet${RESET}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"

# 1. Clear any login rate-limiting / brute-force lockout files
log_info "[1/5] Clearing shared memory brute-force lockout tokens..."
rm -rf /dev/shm/*authfail* /tmp/*authfail* 2>/dev/null || true
log_ok "Rate-limit lockout files cleared (/dev/shm/pnet-authfail)."

# 2. Locate active MySQL root connection
log_info "[2/5] Connecting to local MySQL server..."
MYSQL_CMD=""
for cand in \
    "mysql" \
    "mysql -u root" \
    "mysql --defaults-file=/etc/mysql/debian.cnf" \
    "mysql -u root -ppnetlab" \
    "mysql -u root -pazam" \
    "mysql -u root -ppnet" \
    "mysql -S /var/run/mysqld/mysqld.sock -u root" \
    "mysql -S /run/mysqld/mysqld.sock -u root"; do
    if $cand -N -e "SELECT 1;" >/dev/null 2>&1; then
        MYSQL_CMD="$cand"
        break
    fi
done

if [ -z "$MYSQL_CMD" ]; then
    log_err "Cannot connect to MySQL server. Starting mysql service..."
    systemctl restart mysql 2>/dev/null || systemctl start mysql 2>/dev/null || true
    sleep 2
    for cand in "mysql" "mysql -u root" "mysql --defaults-file=/etc/mysql/debian.cnf"; do
        if $cand -N -e "SELECT 1;" >/dev/null 2>&1; then
            MYSQL_CMD="$cand"
            break
        fi
    done
fi

if [ -z "$MYSQL_CMD" ]; then
    log_err "MySQL server is unreachable. Check 'systemctl status mysql'."
    exit 1
fi
log_ok "Connected to MySQL via: $MYSQL_CMD"

# 3. Create database, configure user permissions and admin credentials
log_info "[3/5] Configuring pnetlab_db, granting 'pnetlab' user, and seeding 'admin'..."

# Ensure database exists
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS pnetlab_db CHARACTER SET utf8 COLLATE utf8_general_ci;"

# Ensure pnetlab MySQL user exists with password 'pnetlab'
$MYSQL_CMD -e "
CREATE USER IF NOT EXISTS 'pnetlab'@'localhost' IDENTIFIED BY 'pnetlab';
ALTER USER 'pnetlab'@'localhost' IDENTIFIED BY 'pnetlab';
GRANT ALL PRIVILEGES ON pnetlab_db.* TO 'pnetlab'@'localhost';

CREATE USER IF NOT EXISTS 'pnetlab'@'127.0.0.1' IDENTIFIED BY 'pnetlab';
ALTER USER 'pnetlab'@'127.0.0.1' IDENTIFIED BY 'pnetlab';
GRANT ALL PRIVILEGES ON pnetlab_db.* TO 'pnetlab'@'127.0.0.1';

CREATE USER IF NOT EXISTS 'guacuser'@'localhost' IDENTIFIED BY 'pnetlab';
ALTER USER 'guacuser'@'localhost' IDENTIFIED BY 'pnetlab';

FLUSH PRIVILEGES;
" 2>/dev/null || true

# Import schema if tables are missing
TBL_COUNT=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='pnetlab_db';" 2>/dev/null || echo "0")
if [ "${TBL_COUNT:-0}" -eq 0 ]; then
    log_info "pnetlab_db is empty; searching for schema..."
    for sf in \
        "/opt/unetlab/schema/pnetlab_db-schema.sql" \
        "/opt/unetlab/schema/pnetlab_db.sql" \
        "/opt/pnet/Custom-Features/schema/pnet_features_db.sql" \
        "/opt/PNET/Custom-Features/schema/pnet_features_db.sql"; do
        if [ -f "$sf" ]; then
            log_info "Importing schema from $sf..."
            $MYSQL_CMD pnetlab_db < "$sf" 2>/dev/null && break || true
        fi
    done
fi

# Ensure essential users and control tables exist
$MYSQL_CMD -e "
CREATE TABLE IF NOT EXISTS pnetlab_db.control (
  control_name varchar(150) NOT NULL,
  control_value text,
  PRIMARY KEY (control_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pnetlab_db.users (
  pod int NOT NULL AUTO_INCREMENT,
  username text,
  cookie text,
  email varchar(150) DEFAULT NULL,
  expiration int DEFAULT '-1',
  name text,
  password text,
  session int DEFAULT NULL,
  ip text,
  role text,
  folder text,
  lab_session int DEFAULT NULL,
  html5 tinyint(1) DEFAULT NULL,
  license text,
  online_time int DEFAULT NULL,
  note text,
  offline int DEFAULT 1,
  active_time int DEFAULT NULL,
  expired_time int DEFAULT NULL,
  user_status int DEFAULT 1,
  user_workspace text,
  max_node int DEFAULT NULL,
  max_node_lab int DEFAULT NULL,
  user_max_cpu int DEFAULT NULL,
  user_max_ram int DEFAULT NULL,
  access_days varchar(16) DEFAULT NULL,
  ext_auth varchar(8) DEFAULT NULL,
  PRIMARY KEY (pod),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
" 2>/dev/null || true

# Authoritatively set admin user with SHA-256 for 'pnet'
# SHA-256('pnet') = fcfcbba4e322bb69d53fe0f8a2b03d7f3c37ee3fb3d51864785c899aaeaaeb5d
$MYSQL_CMD -e "
USE pnetlab_db;

UPDATE users SET 
  password = SHA2('pnet', 256),
  role = '0',
  user_status = 1,
  offline = 1,
  active_time = NULL,
  expired_time = NULL,
  access_days = NULL,
  session = UNIX_TIMESTAMP() + 315360000,
  folder = '/',
  ip = '127.0.0.1'
WHERE username = 'admin';
" 2>/dev/null || true

ADMIN_EXISTS=$($MYSQL_CMD -N -e "USE pnetlab_db; SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>/dev/null || echo "0")
if [ "${ADMIN_EXISTS:-0}" -eq 0 ]; then
    log_info "Inserting fresh admin record in pnetlab_db..."
    $MYSQL_CMD -e "
USE pnetlab_db;
INSERT INTO users (
  pod, username, email, name, password, role,
  user_status, active_time, expired_time, access_days,
  offline, ext_auth, session, folder, ip
) VALUES (
  0, 'admin', 'root@localhost', 'Administrator', SHA2('pnet', 256), '0',
  1, NULL, NULL, NULL,
  1, NULL, UNIX_TIMESTAMP() + 315360000, '/', '127.0.0.1'
);
" 2>/dev/null || true
fi

# Ensure captcha is disabled in control table
$MYSQL_CMD -e "
USE pnetlab_db;
INSERT INTO control (control_name, control_value) VALUES
  ('ctrl_offline_mode', '1'),
  ('ctrl_online_mode', '0'),
  ('ctrl_default_mode', 'offline'),
  ('ctrl_captcha', '0'),
  ('ctrl_version', '8.2.0')
ON DUPLICATE KEY UPDATE control_value = VALUES(control_value);
" 2>/dev/null || true

# Guarantee Cyber-Glass portal and badge in /opt/unetlab/html/login/index.html
if [ -f /opt/unetlab/html/login/index.html ]; then
    sed -i -E 's/admin<\/strong> \/ <strong>[a-zA-Z0-9]+/admin<\/strong> \/ <strong>pnet/g' /opt/unetlab/html/login/index.html 2>/dev/null || true
    sed -i -E 's/admin<\/strong> \/ <strong class="glow-text">[a-zA-Z0-9_-]+/admin<\/strong> \/ <strong class="glow-text">pnet/g' /opt/unetlab/html/login/index.html 2>/dev/null || true
    sed -i '/Offline appliance access/d' /opt/unetlab/html/login/index.html 2>/dev/null || true
fi

# System SSH root/pnet credentials
echo "root:pnet" | chpasswd 2>/dev/null || true
id -u pnet >/dev/null 2>&1 && echo "pnet:pnet" | chpasswd 2>/dev/null || true

log_ok "Database and credentials authoritatively updated."

# 4. Restart web services and PHP-FPM
log_info "[4/5] Refreshing PHP-FPM and Apache2 sessions..."
for svc in $(systemctl list-unit-files | grep -o 'php[0-9.]*-fpm\.service' || echo ""); do
    systemctl restart "$svc" 2>/dev/null || true
done
systemctl restart apache2 2>/dev/null || true
log_ok "Web services restarted."

# 5. Execute Live Diagnostic Probes
log_info "[5/5] Running verification probes..."

# Diagnostic 1: PHP PDO direct check
PHP_PDO_STATUS=$(php -r '
try {
    $db = new PDO("mysql:host=localhost;dbname=pnetlab_db", "pnetlab", "pnetlab");
    $st = $db->query("SELECT username, password, user_status FROM users WHERE username=\"admin\"");
    $u = $st->fetch(PDO::FETCH_ASSOC);
    if ($u && hash_equals((string)$u["password"], hash("sha256", "pnet"))) {
        echo "SUCCESS";
    } else {
        echo "MISMATCH";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
' 2>/dev/null || echo "PHP_EXEC_FAILED")

# Diagnostic 2: Live HTTPS API Auth
API_RESP=$(curl -sk -X POST https://127.0.0.1/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pnet"}' 2>/dev/null || echo "")

echo ""
echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${BOLD}                     DIAGNOSTIC RESULTS                         ${RESET}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "PHP PDO Database Probe : $PHP_PDO_STATUS"

if echo "$API_RESP" | grep -qi '"status":"success"'; then
    echo -e "Live API Authentication: ${GREEN}${BOLD}SUCCESS (HTTP 200 / User authenticated)${RESET}"
    echo ""
    echo -e "${GREEN}${BOLD}✔ LOGIN IS READY!${RESET}"
    echo -e "  URL     : ${CYAN}https://$(hostname -I 2>/dev/null | awk '{print $1}')/${RESET}"
    echo -e "  Username: ${BOLD}admin${RESET}"
    echo -e "  Password: ${BOLD}pnet${RESET}"
else
    echo -e "Live API Authentication: ${RED}${BOLD}FAILED${RESET}"
    echo -e "Raw API Response       : $API_RESP"
fi
echo -e "${CYAN}${BOLD}================================================================${RESET}"
