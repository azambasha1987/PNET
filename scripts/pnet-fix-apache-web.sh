#!/usr/bin/env bash
# ==============================================================================
# PNetLab Apache Web Stack Provisioner & Fixer (pnet-fix-apache-web.sh)
# Ensures Apache2 is installed, mod_ssl & proxy modules enabled, SSL certificates
# generated, and /opt/unetlab/html vhosts active for Web-UI access.
# ==============================================================================
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)." >&2
    exit 1
fi

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
CYAN="\033[1;36m"
BOLD="\033[1m"
RESET="\033[0m"

log_info() { echo -e "${CYAN}[*]${RESET} $*"; }
log_ok()   { echo -e "${GREEN}[✔]${RESET} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${RESET} $*"; }

echo -e "${CYAN}${BOLD}================================================================${RESET}"
echo -e "${BOLD}      PNetLab Apache & Web-UI Stack Provisioner                ${RESET}"
echo -e "${CYAN}${BOLD}================================================================${RESET}"

# 1. Install Apache2 and dependencies if not present
log_info "Checking Apache2 web server..."
if ! command -v apache2 >/dev/null 2>&1 || ! systemctl list-unit-files | grep -q "apache2.service"; then
    log_warn "Apache2 not installed. Installing via apt-get..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y || true
    apt-get install -y --no-install-recommends apache2 libapache2-mod-fcgid ssl-cert || true
fi

# 2. Enable required modules
log_info "Enabling Apache modules (ssl, rewrite, proxy, websockets)..."
a2enmod rewrite ssl proxy proxy_http proxy_wstunnel headers http2 2>/dev/null || true

# 3. Generate self-signed certificate if needed
log_info "Verifying SSL certificates..."
mkdir -p /etc/ssl/certs /etc/ssl/private
MASTER_IP=$(hostname -I | awk '{print $1}' || echo "127.0.0.1")
[ -z "$MASTER_IP" ] && MASTER_IP="127.0.0.1"

if [ ! -f /etc/ssl/certs/pnetlab-selfsigned.crt ] || [ ! -f /etc/ssl/private/pnetlab-selfsigned.key ]; then
    log_info "Generating self-signed TLS certificate for IP: $MASTER_IP..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
        -keyout /etc/ssl/private/pnetlab-selfsigned.key \
        -out /etc/ssl/certs/pnetlab-selfsigned.crt \
        -subj '/CN=pnetlab' \
        -addext "subjectAltName=DNS:pnetlab,DNS:localhost,IP:${MASTER_IP},IP:127.0.0.1" 2>/dev/null || \
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
        -keyout /etc/ssl/private/pnetlab-selfsigned.key \
        -out /etc/ssl/certs/pnetlab-selfsigned.crt \
        -subj "/CN=${MASTER_IP}" 2>/dev/null
    chmod 0600 /etc/ssl/private/pnetlab-selfsigned.key
    log_ok "Certificate generated."
fi

# 4. Write PNetLab VirtualHost configurations
log_info "Writing Apache VirtualHost configurations..."
mkdir -p /etc/apache2/sites-available /etc/apache2/sites-enabled /opt/unetlab/html

cat > /etc/apache2/sites-available/pnetlab.conf << 'APACHE_HTTP'
<VirtualHost *:80>
    DocumentRoot /opt/unetlab/html
    RewriteEngine On
    RewriteCond %{REMOTE_ADDR} !^127\.
    RewriteCond %{REMOTE_ADDR} !^::1$
    RewriteRule ^/?(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
    <Directory /opt/unetlab/html/>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
        DirectoryIndex index.php index.html
    </Directory>
    <Directory /opt/unetlab/data/Exports/>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
APACHE_HTTP

cat > /etc/apache2/sites-available/pnetlab-ssl.conf << 'APACHE_SSL'
<IfModule mod_ssl.c>
<VirtualHost *:443>
    DocumentRoot /opt/unetlab/html
    <Directory /opt/unetlab/html/>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
        DirectoryIndex index.php index.html
    </Directory>
    <Directory /opt/unetlab/data/Exports/>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/pnetlab-selfsigned.crt
    SSLCertificateKeyFile /etc/ssl/private/pnetlab-selfsigned.key
    ProxyPass /telnet/ ws://127.0.0.1:8022/ upgrade=websocket
    ProxyPassReverse /telnet/ ws://127.0.0.1:8022/
    ProxyPass /vnc/ ws://127.0.0.1:6080/ upgrade=websocket
    ProxyPassReverse /vnc/ ws://127.0.0.1:6080/
    ProxyPass /guac/ ws://127.0.0.1:8081/ upgrade=websocket
    ProxyPassReverse /guac/ ws://127.0.0.1:8081/
    ProxyPass /shell/ ws://127.0.0.1:8023/ upgrade=websocket
    ProxyPassReverse /shell/ ws://127.0.0.1:8023/
    ProxyPass /labstate/ ws://127.0.0.1:8024/ upgrade=websocket
    ProxyPassReverse /labstate/ ws://127.0.0.1:8024/
    ProxyPass /console/http/ http://127.0.0.1:8025/ upgrade=websocket
    ProxyPassReverse /console/http/ http://127.0.0.1:8025/
</VirtualHost>
</IfModule>
APACHE_SSL

# 5. Enable PNetLab sites and disable default sites
log_info "Enabling pnetlab sites in Apache..."
a2dissite 000-default default-ssl 2>/dev/null || true
a2ensite pnetlab pnetlab-ssl 2>/dev/null || true

# 6. Ensure permissions on /opt/unetlab/html
log_info "Setting web permissions..."
chown -R www-data:www-data /opt/unetlab/html 2>/dev/null || true
chmod -R 755 /opt/unetlab/html 2>/dev/null || true

# 7. Start / reload services
log_info "Restarting Apache2 and PHP engines..."
systemctl daemon-reload || true
for php_svc in $(systemctl list-unit-files | grep -o 'php[0-9.]*-fpm\.service' || echo ""); do
    systemctl restart "$php_svc" 2>/dev/null || true
done

systemctl restart apache2 2>/dev/null || systemctl start apache2 2>/dev/null || true
systemctl enable apache2 2>/dev/null || true

if systemctl is-active --quiet apache2; then
    log_ok "Apache2 is RUNNING and serving /opt/unetlab/html on HTTPS (port 443)."
    echo -e "\n${GREEN}${BOLD}Web-UI is now ACTIVE!${RESET}"
    echo -e "Access URL : ${CYAN}https://${MASTER_IP}/${RESET}"
else
    log_warn "Apache2 service could not be started directly. Checking journalctl -u apache2..."
    journalctl -u apache2 -n 10 --no-pager 2>/dev/null || true
fi
