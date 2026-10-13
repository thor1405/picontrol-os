# PiControl OS — Deployment Safety & Coexistence Guide

This document details how PiControl OS guarantees safe operation alongside existing Raspberry Pi 5 workloads, including **CasaOS**, **top-level Nginx**, **Cloudflare Tunnel**, **Samba**, and **MongoDB**.

---

## 🛡️ Core Safety Principles

### 1. Zero Overwrite Guarantee
- PiControl OS runs entirely inside its own isolated containers and project directory.
- It will **never** alter `/etc/nginx/`, `/var/www/`, `/DATA`, or any existing system configuration files.

### 2. Port Collision Prevention
The table below illustrates port allocation to ensure coexistence:

| Service | Default Port | PiControl OS Allocation | Conflict Risk |
|---|---|---|---|
| **CasaOS Web UI** | `80` or `81` | None | **None** |
| **Existing Nginx** | `80` / `443` | None | **None** |
| **PiControl OS Web** | - | `8090` (configurable) | **None** |
| **Existing MongoDB**| `27017` | Monitored via TCP probe | **None** |
| **Samba SMB/CIFS** | `445` / `139` | Monitored via TCP probe | **None** |
| **Prometheus TSDB** | `9090` | `127.0.0.1:9090` (Local only) | **None** |
| **Node Exporter** | `9100` | `127.0.0.1:9100` (Local only) | **None** |

If port `8090` is already in use by another container on your server, simply modify `PICONTROL_PORT` in `.env`:
```ini
PICONTROL_PORT=8095
```

### 3. Read-Only Telemetry Collectors
- Telemetry interfaces (`/proc`, `/sys/class/thermal`, `/var/run/docker.sock`) are mounted as `:ro` (read-only) inside collectors.
- Hardware throttling checks via `vcgencmd get_throttled` are strictly non-modifying telemetry reads.

### 4. Guarded Docker Actions
- Container Start, Stop, and Restart actions are **disabled by default**.
- If enabled by the administrator in Settings, an explicit confirmation modal is required for every container action.
- The raw Docker socket is never mounted to the client browser or exposed via an unauthenticated REST API.

### 5. CasaOS `/DATA` Mount Preservation
- The storage collector recognizes `/DATA` and displays it with a dedicated badge.
- PiControl OS reads available capacity using `statvfs` without touching any user files.
