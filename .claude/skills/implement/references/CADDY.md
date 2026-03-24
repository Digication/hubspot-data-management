# Caddy — Shared Reverse Proxy for Local Development

Reference for setting up Caddy as a shared reverse proxy so multiple apps can run simultaneously without port conflicts. Each app gets a clean domain like `https://myapp.localhost` with automatic HTTPS — no mkcert or certificate setup needed.

---

## Why Caddy?

When you run multiple apps locally, they all want the same default ports (Vite: 5173, API: 4000, PostgreSQL: 5432). Caddy solves this by:

- Routing traffic by **domain name** instead of port number
- **Auto-discovering** containers via Docker labels (using the caddy-docker-proxy plugin)
- **Automatic HTTPS** for `.localhost` domains — Caddy has a built-in Certificate Authority, no mkcert needed
- Keeping databases and APIs **internal** to Docker — no host ports exposed
- Only Caddy itself uses host ports (80 and 443)

```
Browser → Caddy (port 80/443) → routes by domain name
              ├── app1.localhost  →  Vite container (:5173 internal)
              ├── app2.localhost  →  Vite container (:5173 internal)
              ├── api1.localhost  →  Node API container (:4000 internal)
              └── databases stay internal, no ports exposed
```

---

## Prerequisites

- Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- `.localhost` subdomains resolve to `127.0.0.1` in modern browsers (Chrome, Firefox, Edge) — no `/etc/hosts` editing needed

---

## One-Time Setup

This setup lives **outside any project**. It runs once on the developer's machine and serves all projects.

### 1. Create the shared Docker network

```bash
docker network create web
```

This network is the "hallway" that connects Caddy to all app containers. It only needs to be created once — it persists across Docker restarts.

### 2. Create the Caddy directory

Choose a stable location (e.g., `~/caddy/` or `~/.local/caddy/`):

```bash
mkdir -p ~/caddy
```

### 3. Create `docker-compose.yml`

**File:** `~/caddy/docker-compose.yml`

```yaml
services:
  caddy:
    image: lucaslorentz/caddy-docker-proxy:2.9
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - caddy_data:/data
    environment:
      # Tell Caddy which Docker network to use for reaching containers
      CADDY_INGRESS_NETWORKS: web
    networks:
      - web
    restart: unless-stopped

volumes:
  caddy_data: {}

networks:
  web:
    external: true
```

That's the entire Caddy setup — no extra config files, no certificate generation, no dynamic config.

### 4. Start Caddy

```bash
cd ~/caddy && docker compose up -d
```

Caddy now watches for new containers on the `web` network.

### 5. Trust Caddy's root certificate (one-time)

Caddy generates its own Certificate Authority inside the container. Since it's running in Docker, it can't automatically add this to your macOS Keychain. You need to extract and trust it once:

```bash
# Extract the root CA certificate from the Caddy data volume
docker cp caddy:/data/caddy/pki/authorities/local/root.crt ~/caddy/caddy-root-ca.crt

# Add it to the macOS Keychain as a trusted certificate
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ~/caddy/caddy-root-ca.crt
```

After this, all `https://*.localhost` domains will show a green padlock in Chrome, Edge, and Safari.

**Firefox note:** Firefox uses its own certificate store. To trust Caddy's CA in Firefox:
1. Open Firefox → Settings → Privacy & Security → Certificates → View Certificates
2. Import `~/caddy/caddy-root-ca.crt` under the Authorities tab
3. Check "Trust this CA to identify websites"

This is truly one-time — the certificate persists across Caddy restarts.

---

## Per-Project Configuration

Each project's `docker-compose.yml` needs two things:

1. **Caddy labels** on the service that should be accessible from the browser
2. **Join the `web` network**

### Labels Reference

```yaml
labels:
  # The domain name for this app
  caddy: <app-name>.localhost
  # Use Caddy's internal CA for automatic HTTPS
  caddy.tls: internal
  # Route traffic to this container's internal port
  caddy.reverse_proxy: "{{upstreams <internal-port>}}"
```

Replace `<app-name>` with a unique identifier (e.g., `todo-app`, `oair-frontend`). Replace `<internal-port>` with the port the dev server uses inside the container.

### Network Configuration

```yaml
networks:
  web:
    external: true
```

Add this to the top-level `networks` section. Each service that needs Caddy routing must also list `web` under its own `networks`.

---

## Routing Patterns by App Type

### Frontend-Only (Vite)

One route for the dev server:

```yaml
services:
  app:
    # ... image, command, volumes ...
    labels:
      caddy: <app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 5173}}"
    networks:
      - web

networks:
  web:
    external: true
```

Access at: `https://<app-name>.localhost`

### Backend-Only (Node API)

One route for the API:

```yaml
services:
  app:
    # ... image, command, volumes ...
    labels:
      caddy: <app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 4000}}"
    networks:
      - web
      - default

  db:
    # ... postgres config ...
    # NO labels — database stays internal, no browser access needed
    networks:
      - default

networks:
  web:
    external: true
```

Access at: `https://<app-name>.localhost`

### Fullstack (Vite + Node API)

Two separate services, each with their own domain:

```yaml
services:
  frontend:
    # ... image, command, volumes for Vite ...
    labels:
      caddy: <app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 5173}}"
    networks:
      - web

  api:
    # ... image, command, volumes for Node API ...
    labels:
      caddy: api.<app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 4000}}"
    networks:
      - web
      - default

  db:
    # ... postgres config ...
    networks:
      - default

networks:
  web:
    external: true
```

Access at: `https://<app-name>.localhost` (frontend) and `https://api.<app-name>.localhost` (API)

**Single-service fullstack alternative** — if both frontend and API run in one container (common with `pnpm dev` that starts both), use path-based routing or a single domain. If the Vite dev server proxies API calls internally, only one label set is needed:

```yaml
services:
  app:
    # ... single container running both Vite + API ...
    labels:
      caddy: <app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 5173}}"
    networks:
      - web
      - default

  db:
    # ... postgres config ...
    networks:
      - default

networks:
  web:
    external: true
```

Configure Vite's `server.proxy` in `vite.config.ts` to forward `/api/*` requests to the backend port internally within the container. This keeps the Docker setup simple.

---

## Database Access from Host

When databases stay internal (no exposed ports), you can't reach them from host tools like pgAdmin or DataGrip directly. Two options:

**Option A — Expose the DB port only when needed:**

Temporarily add a port mapping to the `db` service:

```yaml
db:
  ports:
    - "5432:5432"  # Remove when not debugging
```

**Option B — Use `docker compose exec`:**

```bash
docker compose exec db psql -U dev -d <app-name>
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `curl: (7) Failed to connect` | Caddy not running | `cd ~/caddy && docker compose up -d` |
| "No upstreams available" in Caddy logs | Container not on `web` network | Add `networks: [web]` to the service and ensure `CADDY_INGRESS_NETWORKS=web` is set |
| Browser shows "not secure" | Caddy's root CA not trusted on host | Extract and install the root cert (see one-time setup step 5) |
| Firefox shows certificate warning | Firefox uses its own cert store | Import `caddy-root-ca.crt` in Firefox settings (see step 5) |
| Domain doesn't resolve | Browser doesn't support `.localhost` subdomains | Use Chrome, Firefox, or Edge. Safari may need `/etc/hosts` entries. |
| Port 80/443 already in use | Another service on port 80 (Apache, nginx, Traefik, etc.) | Stop the other service, or change Caddy to different ports (e.g., `8000:80`) |
| `network web declared as external, but could not be found` | Shared network not created yet | `docker network create web` |
| Container starts but Caddy doesn't route to it | Missing labels or wrong label format | Verify labels match the format exactly — `caddy:` not `caddy.host:` |

---

## Fallback: No Caddy (Port-Based)

If Caddy is not desired (user explicitly opts out, or non-Docker setup), fall back to exposing ports directly. Use environment variables in `.env` so ports are configurable:

```yaml
ports:
  - "${VITE_PORT:-5173}:${VITE_PORT:-5173}"
```

```bash
# .env
VITE_PORT=5173
API_PORT=4000
DB_PORT=5432
```

This requires manual port coordination across projects to avoid conflicts.
