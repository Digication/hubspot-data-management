# Caddy — Per-Project Routing Patterns

Reference for configuring Docker Compose services to work with the shared Caddy reverse proxy. Each app gets a unique `https://<name>.localhost` domain via Docker labels.

> **Caddy not running?** The shared Caddy proxy is set up during `/onboard` (Step 7). Run `/onboard` to set it up, or see `onboard/references/CADDY_SETUP.md` for manual steps.

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
