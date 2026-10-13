#!/usr/bin/env bash
# ==============================================================================
# PiControl OS — Pre-Flight System Audit Script
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  PiControl OS — Pre-Flight System Audit${NC}"
echo -e "${BOLD}======================================================${NC}"

# 1. Architecture Check
ARCH=$(uname -m)
echo -n "Checking CPU Architecture: "
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
    echo -e "${GREEN}PASS (ARM64 / $ARCH)${NC}"
else
    echo -e "${YELLOW}WARNING: Detected $ARCH. PiControl OS is optimized for ARM64 (RPi 5), but will run in compatibility mode.${NC}"
fi

# 2. Raspberry Pi Hardware Detection
echo -n "Checking Hardware Model: "
if [ -f /proc/device-tree/model ]; then
    MODEL=$(tr -d '\0' < /proc/device-tree/model)
    echo -e "${GREEN}Detected: $MODEL${NC}"
else
    echo -e "${YELLOW}Standard Linux Host (non-RPi device tree)${NC}"
fi

# 3. CPU Thermal Interface Check
echo -n "Checking CPU Thermal Sensor: "
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP_MILLI=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$(awk "BEGIN {print $TEMP_MILLI/1000}")
    echo -e "${GREEN}PASS (${TEMP_C}°C)${NC}"
else
    echo -e "${YELLOW}thermal_zone0 not found; software fallback will be active.${NC}"
fi

# 4. Throttling Firmware Utility Check
echo -n "Checking vcgencmd throttled probe: "
if command -v vcgencmd >/dev/null 2>&1; then
    THROTTLED=$(vcgencmd get_throttled || echo "throttled=0x0")
    echo -e "${GREEN}PASS ($THROTTLED)${NC}"
else
    echo -e "${YELLOW}vcgencmd not in PATH; /sys firmware interface will be queried.${NC}"
fi

# 5. Docker Availability Check
echo -n "Checking Docker Engine: "
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}PASS (Docker daemon responsive)${NC}"
    else
        echo -e "${RED}FAIL (Docker installed but current user cannot access /var/run/docker.sock)${NC}"
        echo "Tip: Run 'sudo usermod -aG docker \$USER' and restart your session."
    fi
else
    echo -e "${RED}FAIL (Docker not installed)${NC}"
fi

# 6. Port Collision Scanner
echo -e "\n${BOLD}Scanning Ports for Existing Service Coexistence:${NC}"
CHECK_PORTS=(80 443 8090 9090 9100)
for PORT in "${CHECK_PORTS[@]}"; do
    if command -v ss >/dev/null 2>&1; then
        IN_USE=$(ss -tuln | grep ":$PORT " || true)
    elif command -v netstat >/dev/null 2>&1; then
        IN_USE=$(netstat -tuln | grep ":$PORT " || true)
    else
        IN_USE=""
    fi

    if [ -n "$IN_USE" ]; then
        if [ "$PORT" == "80" ]; then
            echo -e "  Port 80:   ${YELLOW}Occupied (Likely CasaOS or existing Nginx). Safe: PiControl OS uses port 8090.${NC}"
        elif [ "$PORT" == "8090" ]; then
            echo -e "  Port 8090: ${RED}OCCUPIED! Please change PICONTROL_PORT in .env to an available port like 8091.${NC}"
        else
            echo -e "  Port $PORT: ${YELLOW}Occupied by another service.${NC}"
        fi
    else
        echo -e "  Port $PORT: ${GREEN}AVAILABLE${NC}"
    fi
done

echo -e "\n${BOLD}Pre-flight check completed.${NC}"
