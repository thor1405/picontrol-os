# PiControl OS — Diagnostics & Troubleshooting Guide

## 1. Raspberry Pi 5 Thermal & Throttling Diagnostics

### Issue: "Hardware Throttling Active" Alert
On Raspberry Pi 5, the Broadcom BCM2712 SoC implements automatic thermal and power throttling.

To inspect the throttling reason:
1. Open the **CPU & Temperature** view.
2. Review the **Raspberry Pi 5 PMIC & Thermal Throttling Status** table.
   - **Under-voltage detected**: Your USB-C power supply is not supplying 5V / 5A (27W Power Delivery standard). Use the official 27W Raspberry Pi power supply.
   - **Currently throttled**: CPU temperature has exceeded 80°C - 85°C. Install or clean the official Active Cooler fan.
   - **ARM frequency capped**: The firmware has temporarily stepped down clock speeds to protect the silicon.

Manual verification command on host terminal:
```bash
vcgencmd get_throttled
```
Interpretation:
- `0x0`: Everything normal.
- `0x50000`: Under-voltage occurred in the past.
- `0x50005`: Currently under-voltage and throttled.

---

## 2. Docker Socket Permission Issues

### Issue: "Docker socket not found or access denied"
If `picontrol-server` reports that it cannot communicate with Docker:

1. Verify that the Docker socket is mounted in `docker-compose.yml`:
   ```yaml
   volumes:
     - /var/run/docker.sock:/var/run/docker.sock:ro
   ```
2. On the host, verify permissions:
   ```bash
   ls -la /var/run/docker.sock
   ```
3. If necessary, add your local user to the `docker` group:
   ```bash
   sudo usermod -aG docker $USER
   ```

---

## 3. Server-Sent Events (SSE) Stalling Behind Reverse Proxies

### Issue: Telemetry indicators freeze or only update after 60 seconds
If PiControl OS is placed behind an existing Nginx instance or Cloudflare Tunnel, proxy buffering must be disabled for the SSE stream:

Add this to your Nginx configuration block:
```nginx
location /api/metrics/live {
    proxy_pass http://127.0.0.1:8090/api/metrics/live;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
    proxy_read_timeout 86400s;
}
```

---

## 4. Resetting the Administrator Password

If you lose access to the admin account:
1. Stop the server container:
   ```bash
   docker compose stop picontrol-server
   ```
2. Reset the admin hash using the CLI tool:
   ```bash
   docker compose run --rm picontrol-server node -e "
     const { DatabaseSync } = require('node:sqlite');
     const bcrypt = require('bcryptjs');
     const db = new DatabaseSync('/app/data/picontrol.db');
     const hash = bcrypt.hashSync('picontrol2026', 10);
     db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'admin');
     console.log('Password successfully reset to: picontrol2026');
   "
   ```
3. Restart the container:
   ```bash
   docker compose start picontrol-server
   ```

---

## 5. Reviewing Container Logs

To view real-time diagnostic output:
```bash
docker compose logs -f picontrol-server
```
