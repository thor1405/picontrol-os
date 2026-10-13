# PiControl OS — Security Architecture & Guidelines

## 1. Authentication & Session Security

- **Password Hashing**: Passwords are cryptographically salted and hashed using `bcrypt` (10 rounds).
- **Session Tokens**: JWTs are signed with a server-side secret (`JWT_SECRET`) and issued in `httpOnly`, `sameSite: lax` cookies or `Authorization: Bearer` headers.
- **Brute Force Protection**: The `/api/auth/login` endpoint is rate-limited to 20 failed attempts per 15 minutes per IP address.
- **API Rate Limiting**: General API requests are restricted to 180 requests per minute per IP via `express-rate-limit`.

---

## 2. SSRF Protection (Website Uptime Monitoring)

Server-Side Request Forgery (SSRF) is a primary risk in uptime monitors because attackers can abuse monitoring pings to probe private infrastructure or cloud metadata APIs.

PiControl OS enforces strict SSRF boundaries:
1. Destination URLs are parsed and hostnames are inspected.
2. The following address ranges are **blocked by default**:
   - Loopback: `127.0.0.1`, `localhost`, `::1`
   - Private RFC1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - Link-Local & Cloud Metadata: `169.254.0.0/16`
3. If an administrator legitimately wishes to monitor an internal LAN service, they must explicitly tick the **"Allow LAN / Private RFC1918 IPs"** checkbox when creating the target.

---

## 3. Automated Secret Masking (System Logs)

The log aggregator automatically scrubs sensitive tokens before log lines are sent to the user interface:
- Bearer tokens: `Bearer [REDACTED_SECRET]`
- Passwords and tokens: `password: [REDACTED_SECRET]`
- API keys: `api_key: [REDACTED_SECRET]`
- RSA/EC/OpenSSH private keys: `[REDACTED_PRIVATE_KEY]`

---

## 4. Administrative Audit Trails

All privileged actions are recorded in the SQLite `audit_logs` table:
- User login / logout events
- Administrator password modifications
- System alert threshold edits
- Monitored website additions / deletions
- Docker container Start / Stop / Restart executions
- Client IP address and timestamp are captured for forensic traceability.

---

## 5. Remote Access via Cloudflare Tunnel (Optional)

To access PiControl OS remotely over the internet securely without exposing open ports on your home router:

1. Use Cloudflare Zero Trust (Tunnels).
2. Create a tunnel pointing to `http://localhost:8090`.
3. Protect the tunnel endpoint with Cloudflare Access (OAuth / Email Pin OTP).
4. Do **not** forward port 8090 on your home gateway directly without TLS and firewall filtering.
