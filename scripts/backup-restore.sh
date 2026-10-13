#!/usr/bin/env bash
# ==============================================================================
# PiControl OS — SQLite and Settings Backup/Restore Tool
# ==============================================================================
set -euo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

case "${1:-}" in
    backup)
        mkdir -p "$BACKUP_DIR"
        BACKUP_FILE="$BACKUP_DIR/picontrol_backup_$TIMESTAMP.tar.gz"
        echo "Creating backup archive: $BACKUP_FILE"
        tar -czf "$BACKUP_FILE" data/ .env
        echo "Backup created successfully: $BACKUP_FILE"
        ;;
    restore)
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 restore <path-to-backup.tar.gz>"
            exit 1
        fi
        RESTORE_FILE="$2"
        if [ ! -f "$RESTORE_FILE" ]; then
            echo "Error: Backup archive $RESTORE_FILE not found."
            exit 1
        fi
        echo "Restoring configuration from $RESTORE_FILE..."
        tar -xzf "$RESTORE_FILE"
        echo "Restore complete. Restart PiControl OS to load restored data."
        ;;
    *)
        echo "Usage: $0 {backup|restore <file>}"
        exit 1
        ;;
esac
