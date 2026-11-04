#!/usr/bin/env bash
# ==============================================================================
# PNetLab Modular Subsystem Manager (pnet-mod)
# Inspects, manages, and applies the three custom pillars independently.
# ==============================================================================
set -euo pipefail

GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
CYAN='\033[1;36m'
RESET='\033[0m'
BOLD='\033[1m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd || echo "/opt/pnet")"
[ -d "$REPO_ROOT/Custom-Features" ] || REPO_ROOT="/opt/pnet"

show_banner() {
    echo -e "${CYAN}${BOLD}================================================================${RESET}"
    echo -e "${BOLD}       PNetLab Modular Subsystem Manager (pnet-mod)             ${RESET}"
    echo -e "${CYAN}${BOLD}================================================================${RESET}"
}

usage() {
    show_banner
    echo -e "${BOLD}Usage:${RESET} sudo pnet-mod [COMMAND]"
    echo ""
    echo -e "${BOLD}Commands:${RESET}"
    echo "  status               Show live status and health of all three pillars"
    echo "  apply all            Run master orchestrator for all three pillars"
    echo "  apply performance    Re-apply Ultra-KSM, cgroups v2, and CPU governor"
    echo "  apply customization  Re-apply templates, Cyber-Glass login, and branding"
    echo "  apply features       Re-apply Web-UI consoles, syntax engine, and APIs"
    echo "  list                 List all modules, tools, and templates across pillars"
    echo "  help                 Show this guidance reference"
    echo ""
    exit 0
}

cmd_status() {
    show_banner
    echo -e "${BOLD}1. Custom-Features Subsystem:${RESET}"
    if systemctl is-active --quiet pnet-ops-api 2>/dev/null || systemctl is-active --quiet azam-ops-api 2>/dev/null; then
        echo -e "   Operations API:       ${GREEN}[✔] ACTIVE (Port 8889)${RESET}"
    else
        echo -e "   Operations API:       ${YELLOW}[⚠] INACTIVE${RESET}"
    fi
    if [ -f /opt/unetlab/html/pnet-ops/pnet-docked-console.js ]; then
        echo -e "   Web-UI Docked Console:${GREEN}[✔] INSTALLED${RESET}"
    else
        echo -e "   Web-UI Docked Console:${YELLOW}[⚠] NOT INSTALLED${RESET}"
    fi

    echo ""
    echo -e "${BOLD}2. Custom-Customization Subsystem:${RESET}"
    if [ -f /opt/unetlab/html/login/login.css ]; then
        echo -e "   Cyber-Glass Login:    ${GREEN}[✔] ACTIVE${RESET}"
    else
        echo -e "   Cyber-Glass Login:    ${YELLOW}[⚠] NOT INSTALLED${RESET}"
    fi
    local tpl_count=$(find /opt/unetlab/html/templates/ -maxdepth 1 -name "*.yml" 2>/dev/null | wc -l || echo 0)
    echo -e "   Appliance Templates:  ${GREEN}[✔] $tpl_count Active Templates${RESET}"

    echo ""
    echo -e "${BOLD}3. Custom-Performance Subsystem:${RESET}"
    if [ -f /sys/kernel/mm/ksm/run ] && [ "$(cat /sys/kernel/mm/ksm/run 2>/dev/null)" = "1" ]; then
        local shared_pages=$(cat /sys/kernel/mm/ksm/pages_sharing 2>/dev/null || echo 0)
        local saved_mb=$(( shared_pages * 4 / 1024 ))
        echo -e "   Ultra-KSM 4KB Engine: ${GREEN}[✔] ACTIVE (${saved_mb}MB RAM Deduplicated)${RESET}"
    else
        echo -e "   Ultra-KSM 4KB Engine: ${YELLOW}[⚠] INACTIVE${RESET}"
    fi
    if systemctl is-active --quiet pnet-cpu-governor 2>/dev/null || systemctl is-active --quiet azambasha-cpu-governor 2>/dev/null; then
        echo -e "   CPU Dynamic Governor: ${GREEN}[✔] ACTIVE${RESET}"
    else
        echo -e "   CPU Dynamic Governor: ${YELLOW}[⚠] INACTIVE${RESET}"
    fi
    if systemctl is-active --quiet pnet-watchdog 2>/dev/null || systemctl is-active --quiet azambasha-watchdog 2>/dev/null; then
        echo -e "   24/7 Health Watchdog: ${GREEN}[✔] ACTIVE${RESET}"
    else
        echo -e "   24/7 Health Watchdog: ${YELLOW}[⚠] INACTIVE${RESET}"
    fi
    echo -e "${CYAN}================================================================${RESET}"
}

cmd_apply() {
    local target="${1:-all}"
    case "$target" in
        perf|performance)
            if [ -f "$REPO_ROOT/Custom-Performance/apply-performance.sh" ]; then
                bash "$REPO_ROOT/Custom-Performance/apply-performance.sh"
            else
                echo -e "${RED}[✘] Hook not found: $REPO_ROOT/Custom-Performance/apply-performance.sh${RESET}"
            fi
            ;;
        cust|customization)
            if [ -f "$REPO_ROOT/Custom-Customization/apply-customization.sh" ]; then
                bash "$REPO_ROOT/Custom-Customization/apply-customization.sh"
            else
                echo -e "${RED}[✘] Hook not found: $REPO_ROOT/Custom-Customization/apply-customization.sh${RESET}"
            fi
            ;;
        feat|features)
            if [ -f "$REPO_ROOT/Custom-Features/apply-features.sh" ]; then
                bash "$REPO_ROOT/Custom-Features/apply-features.sh"
            else
                echo -e "${RED}[✘] Hook not found: $REPO_ROOT/Custom-Features/apply-features.sh${RESET}"
            fi
            ;;
        all|"")
            if [ -f "$REPO_ROOT/apply-all-custom.sh" ]; then
                bash "$REPO_ROOT/apply-all-custom.sh"
            else
                echo -e "${RED}[✘] Master hook not found: $REPO_ROOT/apply-all-custom.sh${RESET}"
            fi
            ;;
        *)
            echo -e "${RED}[✘] Unknown subsystem: $target. Choose performance, customization, features, or all.${RESET}"
            exit 1
            ;;
    esac
}

ACTION="${1:-status}"
shift || true

case "$ACTION" in
    status|-s) cmd_status ;;
    apply|-a)  cmd_apply "${1:-all}" ;;
    list|-l)
        show_banner
        echo "Custom-Features tools:       $(ls "$REPO_ROOT/Custom-Features/scripts" 2>/dev/null | wc -l) scripts"
        echo "Custom-Customization tools:  $(ls "$REPO_ROOT/Custom-Customization/scripts" 2>/dev/null | wc -l) scripts"
        echo "Custom-Performance tools:    $(ls "$REPO_ROOT/Custom-Performance/scripts" 2>/dev/null | wc -l) scripts"
        echo "Appliance Templates:         $(find "$REPO_ROOT/Custom-Customization/templates" -name "*.yml" 2>/dev/null | wc -l) templates"
        ;;
    help|-h|--help) usage ;;
    *) usage ;;
esac
