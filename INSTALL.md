# PiControl OS — Installation & Deployment Guide

This guide provides step-by-step instructions for deploying PiControl OS onto a Raspberry Pi 5 without disrupting existing applications (such as CasaOS, Nginx, MongoDB, Samba, and Cloudflare Tunnel).

---

## 1. Prerequisites

- **Hardware**: Raspberry Pi 5 (4GB or 8GB recommended).
- **Operating System**: Raspberry Pi OS (64-bit / Debian 12 Bookworm) or Ubuntu Server 24.04 ARM64.
- **Docker**: Docker Engine 24+ and Docker Compose plugin installed.
- **Storage**: At least 1.5 GB free disk space for containers and metrics retention.

---

## 2. Safe Pre-Flight Audit

Before starting, run the pre-flight check script to audit your system:

```bash
cd /opt/picontrol-os   # or your chosen directory
bash scripts/preflight-check.sh
```

The script verifies:
1. Architecture is ARM64 (`aarch64`).
2. Hardware model is Raspberry Pi 5.
3. Thermal sensor `/sys/class/thermal/thermal_zone0/temp` is accessible.
4. Port `8090` is free. (If occupied, you will be prompted to adjust `.env`).

---

## 3. Configuration Setup

Copy the environment template:

```bash
cp .env.example .env
```

Review or modify `.env` as required:
```ini
# Dashboard port (default: 8090)
PICONTROL_PORT=8090

# Generate a strong random JWT secret:
JWT_SECRET=$(openssl rand -hex 32)

# Default admin credentials
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASSWORD=picontrol2026
```

---

## 4. Launching PiControl OS

Start the platform using Docker Compose:

```bash
docker compose up -d --build
```

Verify all three containers are healthy:
```bash
docker compose ps
```

You should see:
- `picontrol-server` (healthy, port 8090)
- `picontrol-prometheus` (running, port 127.0.0.1:9090)
- `picontrol-node-exporter` (running, port 127.0.0.1:9100)

---

## 5. Integrating with Existing Top-Level Nginx (Optional)

If your Raspberry Pi is already running Nginx on port 80/443 (e.g. for hosted websites or CasaOS), you can route PiControl OS under a subdomain or custom path without stopping Nginx:

1. Open your Nginx site configuration (e.g., `/etc/nginx/sites-available/default` or CasaOS Nginx config).
2. Copy the contents of `nginx/picontrol-snippet.conf` into your `server { ... }` block:

```nginx
location /picontrol/ {
    proxy_pass http://127.0.0.1:8090/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

location /picontrol/api/metrics/live {
    proxy_pass http://127.0.0.1:8090/api/metrics/live;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_read_timeout 86400s;
}
```

3. Reload Nginx safely:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Accessing the Dashboard

Open your web browser and navigate to:
```
http://<raspberry-pi-ip>:8090
```

Log in with:
- **Username**: `admin`
- **Password**: `picontrol2026`

Navigate to **Settings** -> **Administrator Password** to update your password immediately.
