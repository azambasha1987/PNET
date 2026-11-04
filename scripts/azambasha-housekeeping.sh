#!/usr/bin/env bash
# ==============================================================================
# AzamLabs System Housekeeping & Log Purge Engine (azambasha-housekeeping.sh)
#
# Reclaims disk space, clears accumulated application logs, vacuums systemd
# journals, cleans temporary files, and refreshes log permissions safely.
#
# Usage:
#   sudo bash scripts/azambasha-housekeeping.sh
#   azam-clean
# ==============================================================================
set -Eeuo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${CYAN}${BOLD}============================================================${RESET}"
echo -e "${CYAN}${BOLD}       AzamLabs System Housekeeping & Log Purge Engine       ${RESET}"
echo -e "${CYAN}${BOLD}============================================================${RESET}"

if [ "$(id -u)" -ne 0 ]; then
    echo -e "${YELLOW}[ERROR] This housekeeping script must be run as root.${RESET}" >&2
    exit 1
fi

# 1. Snapshot Initial Disk Space
INITIAL_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
echo -e "${CYAN}[*] Initial disk space available on /: ${BOLD}${INITIAL_AVAIL}${RESET}\n"

# 2. Clean UNetLab Application Logs
echo -e "${CYAN}[1/6] Purging UNetLab Node & API Logs...${RESET}"
LOGS_DIR="/opt/unetlab/data/Logs"
if [ -d "$LOGS_DIR" ]; then
    rm -f "${LOGS_DIR}"/*.1 "${LOGS_DIR}"/*.2 "${LOGS_DIR}"/*.gz 2>/dev/null || true
    for f in api.txt unl_wrapper.txt access.txt error.txt ssl-access.log ssl-error.log; do
        if [ -f "${LOGS_DIR}/${f}" ]; then
            : > "${LOGS_DIR}/${f}"
        else
            touch "${LOGS_DIR}/${f}"
        fi
        chown www-data:www-data "${LOGS_DIR}/${f}" 2>/dev/null || true
        chmod 664 "${LOGS_DIR}/${f}" 2>/dev/null || true
    done
    echo -e "${GREEN}      -> Re-initialized /opt/unetlab/data/Logs/ (access.txt, api.txt, error.txt, unl_wrapper.txt, ssl logs)${RESET}"
fi

# 2b. Clean Cluster Job Logs
if [ -d "/opt/unetlab/html/cluster/jobs" ]; then
    rm -f /opt/unetlab/html/cluster/jobs/*.log 2>/dev/null || true
    echo -e "${GREEN}      -> Purged old cluster deployment task logs in /opt/unetlab/html/cluster/jobs/${RESET}"
fi

# 3. Clean Apache Web Server Logs
echo -e "${CYAN}[2/6] Truncating Apache2 Web Logs...${RESET}"
if [ -d /var/log/apache2 ]; then
    rm -f /var/log/apache2/*.gz /var/log/apache2/*.1 /var/log/apache2/*.2 2>/dev/null || true
    for log in /var/log/apache2/*.log; do
        if [ -f "$log" ]; then
            : > "$log"
        fi
    done
    echo -e "${GREEN}      -> Truncated active logs in /var/log/apache2/${RESET}"
fi

# 4. Clean AzamLabs Installer & System Logs
echo -e "${CYAN}[3/6] Purging AzamLabs Installer & System Logs...${RESET}"
for azlog in /var/log/azambasha-install.log /var/log/azambasha-trim.log /var/log/azamlabs-*.log; do
    if [ -f "$azlog" ]; then
        : > "$azlog"
    fi
done
rm -f /var/log/*.gz /var/log/*.1 /var/log/*.2.gz /var/log/*.old 2>/dev/null || true
for syslog in /var/log/auth.log /var/log/kern.log /var/log/syslog /var/log/dpkg.log /var/log/alternatives.log; do
    if [ -f "$syslog" ]; then
        : > "$syslog"
    fi
done
echo -e "${GREEN}      -> Purged rotated logs and truncated active logs in /var/log/${RESET}"

# 5. Vacuum Systemd Journal
echo -e "${CYAN}[4/6] Vacuuming Systemd Journal Logs...${RESET}"
if command -v journalctl &>/dev/null; then
    JOURNAL_BEFORE=$(journalctl --disk-usage 2>/dev/null | awk '{print $NF}' || echo "unknown")
    journalctl --vacuum-time=1d --vacuum-size=10M >/dev/null 2>&1 || true
    echo -e "${GREEN}      -> Systemd journal vacuumed (retained max 10MB / 1 day)${RESET}"
fi

# 6. Clean Temporary Files & Stale Sockets
echo -e "${CYAN}[5/6] Cleaning Stale Temporary Files...${RESET}"
rm -rf /tmp/netio* /tmp/deb_rebuild_workspace 2>/dev/null || true
rm -f /tmp/*.log /tmp/*.tmp /tmp/*.deb /tmp/*.py /tmp/run_*.sh /tmp/verify_*.deb /tmp/subiquity* /tmp/curtin* 2>/dev/null || true
# Clean APT package archives
if command -v apt-get &>/dev/null; then
    apt-get clean 2>/dev/null || true
    echo -e "${GREEN}      -> Cleaned APT local archive cache (/var/cache/apt/archives)${RESET}"
fi

# 7. Refresh System Permissions & Recheck Disk Space
echo -e "${CYAN}[6/6] Verifying Web & Virtualization Permissions...${RESET}"
if [ -x /opt/unetlab/wrappers/unl_wrapper ]; then
    /opt/unetlab/wrappers/unl_wrapper -a fixpermissions >/dev/null 2>&1 || true
fi
chmod 755 /opt/unetlab 2>/dev/null || true
chown -R www-data:www-data /opt/unetlab/html 2>/dev/null || true

FINAL_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
echo -e "\n${GREEN}${BOLD}============================================================${RESET}"
echo -e "${GREEN}${BOLD}    [SUCCESS] AzamLabs Housekeeping & Log Purge Complete!   ${RESET}"
echo -e "${GREEN}${BOLD}============================================================${RESET}"
echo -e "  Available Disk Before: ${BOLD}${INITIAL_AVAIL}${RESET}"
echo -e "  Available Disk After:  ${BOLD}${FINAL_AVAIL}${RESET}"
echo -e "  All active log streams reset to zero bytes cleanly.\n"

