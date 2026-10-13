#!/usr/bin/env bash
# ==============================================================================
# PiControl OS — Raspberry Pi 5 Hardware Telemetry Node Exporter Collector
# ==============================================================================
# This script samples vcgencmd throttled bitmask and core temps, formatting
# them into Prometheus metrics for node-exporter's textfile collector directory.
#
# Recommended cron setup:
# * * * * * root /path/to/scripts/rpi-thermal-collector.sh /var/lib/node_exporter/textfile_collector/rpi.prom

TEXTFILE_DIR="${1:-/tmp/picontrol-prom-textfile}"
mkdir -p "$TEXTFILE_DIR"
PROM_FILE="$TEXTFILE_DIR/rpi_hardware.prom"
TMP_FILE="$PROM_FILE.$$"

# Default values
THROTTLED_HEX="0x0"
TEMP_C="44.0"

# 1. Read throttled bitmask
if command -v vcgencmd >/dev/null 2>&1; then
    RAW=$(vcgencmd get_throttled 2>/dev/null || echo "throttled=0x0")
    if [[ "$RAW" =~ throttled=(0x[0-9a-fA-F]+) ]]; then
        THROTTLED_HEX="${BASH_REMATCH[1]}"
    fi
fi

THROTTLED_DEC=$((THROTTLED_HEX))

# Bit breakdown
UNDERVOLT=$(( (THROTTLED_DEC & 1) ))
FREQ_CAPPED=$(( (THROTTLED_DEC & 2) >> 1 ))
CURRENTLY_THROTTLED=$(( (THROTTLED_DEC & 4) >> 2 ))
SOFT_TEMP=$(( (THROTTLED_DEC & 8) >> 3 ))

# 2. Read temperature
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP_RAW=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$(awk "BEGIN {printf \"%.1f\", $TEMP_RAW/1000}")
fi

# Write Prometheus metrics
cat <<EOF > "$TMP_FILE"
# HELP rpi_throttled_bitmask Raw throttled bitmask from Raspberry Pi firmware
# TYPE rpi_throttled_bitmask gauge
rpi_throttled_bitmask $THROTTLED_DEC

# HELP rpi_undervoltage_active Indicates active under-voltage condition
# TYPE rpi_undervoltage_active gauge
rpi_undervoltage_active $UNDERVOLT

# HELP rpi_frequency_capped Indicates ARM frequency is currently capped
# TYPE rpi_frequency_capped gauge
rpi_frequency_capped $FREQ_CAPPED

# HELP rpi_currently_throttled Indicates hardware throttling is active
# TYPE rpi_currently_throttled gauge
rpi_currently_throttled $CURRENTLY_THROTTLED

# HELP rpi_soc_temperature_celsius SoC temperature in degrees Celsius
# TYPE rpi_soc_temperature_celsius gauge
rpi_soc_temperature_celsius $TEMP_C
EOF

mv -f "$TMP_FILE" "$PROM_FILE"
