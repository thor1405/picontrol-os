#!/usr/bin/env bash
# ==============================================================================
# PiControl OS — Safe Installation & Startup Script
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}${BOLD}"
echo "  ____  _  ____            _             _    ___  ____  "
echo " |  _ \(_)/ ___|___  _ __ | |_ _ __ ___ | |  / _ \/ ___| "
echo " | |_) | | |   / _ \| '_ \| __| '__/ _ \| | | | | \___ \ "
echo " |  __/| | |__| (_) | | | | |_| | | (_) | | | |_| |___) |"
echo " |_|   |_|\____\___/|_| |_|\__|_|  \___/|_|  \___/|____/ "
echo -e "${NC}"
echo -e "Your Server. Total Control. — Production Raspberry Pi 5 Deployment\n"

cd "$ROOT_DIR"

# Step 1: Run Pre-Flight Checks
bash scripts/preflight-check.sh

# Step 2: Initialize .env configuration
if [ ! -f .env ]; then
    echo -e "\n${BOLD}[1/3] Generating secure .env configuration...${NC}"
    cp .env.example .env
    
    # Generate random secret key if openssl is available
    if command -v openssl >/dev/null 2>&1; then
        RAND_SECRET=$(openssl rand -hex 32)
        sed -i "s/change-this-to-a-strong-random-secret-key-for-rpi5/$RAND_SECRET/" .env
    fi
    echo -e "${GREEN}Created .env with default port 8090.${NC}"
else
    echo -e "\n${BOLD}[1/3] Found existing .env file. Preserving user configuration.${NC}"
fi

# Step 3: Check Docker Compose command
echo -e "\n${BOLD}[2/3] Checking Docker Compose support...${NC}"
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}Error: Docker Compose is not available. Please install docker compose.${NC}"
    exit 1
fi
echo -e "${GREEN}Using: $COMPOSE_CMD${NC}"

# Step 4: Build and Launch Containers
echo -e "\n${BOLD}[3/3] Deploying PiControl OS stack...${NC}"
$COMPOSE_CMD up -d --build

PORT=$(grep -E '^PICONTROL_PORT=' .env | cut -d '=' -f 2 || echo "8090")
[ -z "$PORT" ] && PORT="8090"

echo -e "\n${GREEN}${BOLD}======================================================${NC}"
echo -e "${GREEN}${BOLD}  PiControl OS is successfully running!${NC}"
echo -e "${GREEN}${BOLD}======================================================${NC}"
echo -e "Dashboard URL:      ${BOLD}http://localhost:${PORT}${NC}"
echo -e "Default Admin:      ${BOLD}admin${NC}"
echo -e "Default Password:   ${BOLD}picontrol2026${NC}"
echo -e "\nTip: Change your password inside Settings -> Administrator Password."
echo -e "Tip: Existing services (CasaOS, Nginx, MongoDB) remain untouched."
