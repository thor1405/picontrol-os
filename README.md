# PiControl OS — Your Server. Total Control.
## World-Class Raspberry Pi 5 Server Monitoring Platform

PiControl OS is a production-grade, self-hosted infrastructure monitoring and control platform purpose-built for the **Raspberry Pi 5 (ARM64)** and modern Linux servers. It features an executive dark-first user interface inspired by Linear, Datadog, and Vercel, delivering genuine real-time hardware telemetry, Prometheus-backed historical analytics, website uptime monitoring, Docker container lifecycle controls, multi-service tracking, and intelligent alerting.

---

## 🌟 Key Capabilities

- **Executive Overview Dashboard**: High-level health status, CPU, memory, storage, and network summary with 1500ms real-time updates.
- **Pi 5 Hardware Telemetry**: Direct `/sys/class/thermal/` sampling, Broadcom BCM2712 Cortex-A76 per-core frequencies, and full `vcgencmd get_throttled` bitmask decoding (under-voltage, frequency capping, thermal throttling).
- **Accurate Linux Memory Accounting**: Parses `/proc/meminfo` properly separating real available memory from reclaimable page cache and buffers.
- **Storage & CasaOS Mount Explorer**: Tracks root MicroSD/NVMe, mounted USB/SSD partitions, and dedicated CasaOS `/DATA` storage mounts.
- **Network Analytics**: Bandwidth telemetry (TX/RX), packet counters, network error rates, and integrated Cloudflare/DNS latency probes.
- **Docker & CasaOS Integration**: Container resource accounting (CPU %, RAM, Network I/O), healthcheck status, live container logs, and protected Start/Stop/Restart controls.
- **Applications & Services Health**: Automated tracking of Nginx, Docker, CasaOS, SSH, Samba, Cloudflare Tunnel, Node.js, and MongoDB.
- **Website Uptime Monitor with SSRF Guard**: HTTP/HTTPS/TCP health checks, SSL certificate expiry countdowns, response time charts, and strict protection against internal loopback attacks.
- **Centralized System Logs**: Streams Docker logs, systemd journal, and Nginx logs with automated token, password, and private key redaction.
- **Configurable Alerting**: Multi-condition rules with cooldowns, active incident states, and direct dispatch to **Telegram Bot** and **SMTP Email**.
- **Historical Analytics**: Interactive time-series explorer backed by Prometheus TSDB for 15m, 1h, 6h, 24h, 7d, and 30d windows with CSV export.
- **Zero-Disruption Coexistence**: Safely runs on non-conflicting port `8090` without disturbing existing CasaOS, Nginx, or Docker deployments.

---

## 🏗️ Architecture

```
Raspberry Pi 5 Hardware & Linux Kernel (/proc, /sys, vcgencmd)
   │
   ├── Node Exporter (:9100) ──> Prometheus TSDB (:9090)
   │                                  │
   └── Native Telemetry Reader        │ (15m to 30d queries)
           │                          ▼
           └───> PiControl Backend (:8090) ──[SSE Stream]──> React Frontend
                     │ (SQLite Database)
                     └── Website Pinger & Alert Engine
```

---

## 🚀 Quick Start (Production)

### 1. Clone & Run Safe Pre-Flight Audit
```bash
git clone <repo-url> picontrol-os
cd picontrol-os
bash scripts/preflight-check.sh
```

### 2. Deploy with Docker Compose
```bash
bash scripts/install.sh
# Or manually:
cp .env.example .env
docker compose up -d --build
```

### 3. Access the Platform
- **URL**: `http://<your-pi-ip>:8090`
- **Default Username**: `admin`
- **Default Password**: `picontrol2026`

*(You can immediately change the password in **Settings -> Administrator Password**).*

---

## 📂 Project Structure

```
picontrol-os/
├── docker-compose.yml              # Production Docker Compose orchestration
├── .env.example                    # Exhaustive environment variables template
├── prometheus/
│   ├── prometheus.yml              # Scrape jobs for Node Exporter & server
│   └── alert.rules.yml             # Prometheus alert rule definitions
├── nginx/
│   ├── nginx.conf                  # Standalone Nginx reverse proxy
│   └── picontrol-snippet.conf      # Drop-in snippet for existing Nginx instances
├── scripts/
│   ├── preflight-check.sh          # System safety & port collision auditor
│   ├── install.sh                  # One-step safe installer
│   ├── rpi-thermal-collector.sh   # Hardware telemetry collector for Node Exporter
│   └── backup-restore.sh           # SQLite and config backup tool
├── server/                         # Express.js + TypeScript + SQLite Backend
│   ├── src/
│   │   ├── collectors/             # Linux hardware, Prometheus & Docker collectors
│   │   ├── services/               # Uptime monitoring, alerting & logging
│   │   ├── routes/                 # Authenticated REST & SSE API endpoints
│   │   └── index.ts                # Application server
│   └── Dockerfile                  # Multi-arch production Dockerfile
└── client/                         # React 18 + Vite + Tailwind CSS Frontend
    ├── src/
    │   ├── views/                  # 13 dedicated functional views
    │   ├── components/             # Design system components, charts & layout
    │   └── context/                # Real-time SSE metrics and Auth state
    └── Dockerfile                  # Production frontend container
```

---

## ⚙️ Navigation Views

| # | View | Description |
|---|---|---|
| 1 | **Overview** | Executive system summary, live telemetry gauges, 4 core cards, time-series chart |
| 2 | **System Performance** | 1m, 5m, 15m load averages compared to core count, saturation ratios, scheduler state |
| 3 | **CPU & Temperature** | Quad Cortex-A76 core gauges, thermal envelope, RPi 5 throttled bitmask decoder, top CPU procs |
| 4 | **Memory & Processes** | Precise Linux memory breakdown, reclaimable page cache, top RSS memory consumers |
| 5 | **Storage & Disks** | Root MicroSD/NVMe, USB drives, CasaOS `/DATA` detection, read/write throughput |
| 6 | **Network Analytics** | Real-time TX/RX bandwidth, network adapters (eth0/wlan0), packets, gateway/DNS latency |
| 7 | **Docker Containers** | Container telemetry, CasaOS tags, live log inspect, protected Start/Stop/Restart |
| 8 | **Applications & Services** | Nginx, Docker, CasaOS, SSH, Samba, Cloudflare Tunnel, MongoDB, and Node.js tracking |
| 9 | **Website Monitoring** | Target endpoint latency, HTTP status, SSL certificate expiry countdown, SSRF protection |
| 10 | **System Logs** | Centralized streaming log viewer with full-text search and automated secret masking |
| 11 | **Alerts & Notifications** | Threshold rules, active incidents, cooldowns, and Telegram & SMTP dispatch |
| 12 | **Historical Analytics** | Prometheus TSDB time-range queries (15m to 30d) with statistical summary & CSV export |
| 13 | **Settings** | Monitoring thresholds, container permissions, SMTP/Telegram config, security audit logs |

---

## 🔒 Security Guarantee

- **Non-destructive**: Never terminates or modifies existing processes without explicit administrator command.
- **Port-safe**: Defaults to port `8090` leaving ports 80/443 for existing web applications (CasaOS / Nginx).
- **SSRF Protected**: Rejects private RFC1918 scans unless explicitly toggled by admin.
- **Secret Redaction**: Masks Bearer tokens, private keys, and passwords before streaming logs.
- **Read-Only Docker Integration**: Raw Docker socket is never exposed to the frontend; destructive controls require explicit setting enablement.
