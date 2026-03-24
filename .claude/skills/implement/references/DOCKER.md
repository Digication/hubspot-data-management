# Docker Development Environment

Reference for adding Docker-based local development environments to TypeScript projects.

---

## When to Add Docker

Docker is useful for local development when:
- The app has system-level dependencies (databases, browsers, native tools)
- Team members need a reproducible, one-command dev setup (consistent Node.js, pnpm, and build environment)
- E2E tests require specific browser versions (e.g., Playwright)
- You want to avoid "works on my machine" issues — even frontend-only apps benefit from pinning the exact runtime environment

Docker is NOT needed when:
- The user explicitly says they don't want Docker

**Default to including Docker** for all app types (frontend, backend, fullstack). It ensures consistent environments across the team with minimal overhead.

---

## Architecture Decisions

### Always Multi-Container

Always use Docker Compose with separate services, even if the app only has one process today. This keeps the setup consistent across all projects and makes it trivial to add databases, caches, or other services later without restructuring.

- Frontend-only app: one `app` service
- Backend-only app: one `app` service + database service if needed
- Fullstack app: one `app` service (both servers) + database service if needed

### Base Image Selection

Always use the **latest stable Node.js version** (currently Node 24) with the `bookworm` variant. Do not use Alpine (musl libc breaks native modules).

| Need | Image |
|---|---|
| Default | `node:24-bookworm` |
| Project uses Playwright | `mcr.microsoft.com/playwright:v<version>-noble` |

If the project includes Playwright for E2E testing, use the Playwright image for **all** development — not just for running tests. It already includes Node.js and all browser binaries, so it replaces the Node image entirely. This avoids maintaining two images or installing browsers separately.

Prefer using a pre-built image directly in `docker-compose.yml` (no custom Dockerfile) when possible.

---

## Docker Compose Templates

All templates use **Caddy labels** for routing instead of exposing ports to the host. This eliminates port conflicts when running multiple apps simultaneously. Each app is accessed via `https://<app-name>.localhost` with automatic HTTPS. See [CADDY.md](CADDY.md) for the shared Caddy setup.

> **Prerequisite:** The shared Caddy proxy and `web` Docker network must be running. See [CADDY.md](CADDY.md) for one-time setup.

### Frontend-Only App

```yaml
services:
  app:
    image: node:24-bookworm
    container_name: <app-name>-dev
    working_dir: /app
    command:
      - sh
      - -c
      - |
        corepack enable &&
        corepack prepare --activate &&
        pnpm install &&
        pnpm dev
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      CHOKIDAR_USEPOLLING: "true"
      WATCHPACK_POLLING: "true"
    labels:
      caddy: <app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 5173}}"
    networks:
      - web
    stdin_open: true
    tty: true

networks:
  web:
    external: true
```

Access at: `https://<app-name>.localhost`

### Backend-Only App

```yaml
services:
  app:
    image: node:24-bookworm
    container_name: <app-name>-dev
    working_dir: /app
    command:
      - sh
      - -c
      - |
        corepack enable &&
        corepack prepare --activate &&
        pnpm install &&
        pnpm dev
    env_file:
      - .env
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
    labels:
      caddy: <app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 4000}}"
    networks:
      - web
      - default
    stdin_open: true
    tty: true

  db:
    image: postgres:17
    container_name: <app-name>-db
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: <app-name>
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - default

networks:
  web:
    external: true

volumes:
  pgdata:
```

Access at: `https://<app-name>.localhost`

Database stays internal — no exposed ports. See [CADDY.md](CADDY.md) for how to access the DB from host tools when needed.

### Fullstack App

```yaml
services:
  app:
    image: node:24-bookworm
    container_name: <app-name>-dev
    working_dir: /app
    command:
      - sh
      - -c
      - |
        corepack enable &&
        corepack prepare --activate &&
        pnpm install &&
        pnpm dev
    env_file:
      - .env
    environment:
      CHOKIDAR_USEPOLLING: "true"
      WATCHPACK_POLLING: "true"
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
    labels:
      # Frontend route — Vite dev server
      caddy: <app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 5173}}"
    networks:
      - web
      - default
    stdin_open: true
    tty: true

  db:
    image: postgres:17
    container_name: <app-name>-db
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: <app-name>
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - default

networks:
  web:
    external: true

volumes:
  pgdata:
```

Access at: `https://<app-name>.localhost`

For fullstack apps where both frontend and API run in one container, configure Vite's `server.proxy` in `vite.config.ts` to forward `/api/*` requests to the backend port internally. This avoids needing a separate API domain.

If the API must be accessible separately (e.g., for mobile clients or external testing), split into two services — see [CADDY.md](CADDY.md) for the fullstack pattern with separate frontend and API routes.

### Fullstack App with Playwright (E2E-ready)

Use when the project includes Playwright E2E tests:

```yaml
services:
  app:
    image: mcr.microsoft.com/playwright:v<version>-noble
    container_name: <app-name>-dev
    working_dir: /app
    command:
      - sh
      - -c
      - |
        corepack enable &&
        corepack prepare --activate &&
        pnpm install &&
        pnpm dev
    env_file:
      - .env
    environment:
      CHOKIDAR_USEPOLLING: "true"
      WATCHPACK_POLLING: "true"
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
    labels:
      caddy: <app-name>.localhost
      caddy.tls: internal
      caddy.reverse_proxy: "{{upstreams 5173}}"
    networks:
      - web
      - default
    stdin_open: true
    tty: true

  db:
    image: postgres:17
    container_name: <app-name>-db
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: <app-name>
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - default

networks:
  web:
    external: true

volumes:
  pgdata:
```

---

## Key Patterns

### Volume Mounts

```yaml
volumes:
  - .:/app                # Bind mount — live code editing from host
  - /app/node_modules     # Anonymous volume — keeps node_modules in container only
```

The anonymous `node_modules` volume is critical for performance. Without it, Docker syncs the entire `node_modules` directory between host and container, which is extremely slow on macOS.

### File Watching on macOS

Docker on macOS uses bind mounts that don't support native `inotify` events. These environment variables enable polling-based file watching:

```yaml
environment:
  CHOKIDAR_USEPOLLING: "true"    # Used by many Node.js file watchers
  WATCHPACK_POLLING: "true"       # Used by Webpack/Vite
```

Include these whenever the container runs a dev server with hot reload.

### Environment Variables

```yaml
env_file:
  - .env          # Load secrets from .env file (gitignored)
environment:
  KEY: "value"    # Non-secret, dev-specific variables set inline
```

- Use `env_file` for secrets (API keys, credentials) loaded from a `.env` file
- Use `environment` for non-secret dev configuration (polling flags, debug flags)
- Always provide a `.env.example` with placeholder values for documentation

### Interactive Mode

```yaml
stdin_open: true    # Keeps stdin open (docker run -i)
tty: true           # Allocates pseudo-TTY (docker run -t)
```

Enables interactive shell access via `docker compose exec app sh` and proper signal handling for graceful shutdown.

### Startup Command Pattern

```yaml
command:
  - sh
  - -c
  - |
    corepack enable &&
    corepack prepare --activate &&
    pnpm install &&
    pnpm dev
```

This pattern:
1. Enables Corepack (Node.js package manager version manager)
2. Activates the pnpm version specified in `package.json`
3. Installs dependencies (idempotent — skips if already installed)
4. Starts the development server

Add additional setup steps (codegen, migrations, seeding) between `pnpm install` and the final dev command as needed.

---

## .dockerignore Template

```
node_modules
dist
build
.git
.gitignore
.DS_Store
*.log
pnpm-debug.log*
npm-debug.log*
```

Add project-specific entries for:
- Test result directories (e.g., `playwright-report`, `coverage`)
- IDE config (e.g., `.vscode`, `.idea`)
- Tool-specific directories (e.g., `.playwright-mcp`)

---

## Docker Phase Template

When a plan includes Docker setup, use this phase template:

```markdown
# Phase NN — Docker Development Environment

You are setting up a Docker development environment for [app name].

**Context:** [What prior phases produced — project structure, dependencies, dev scripts, etc.]

## Overview

- Create Docker Compose configuration for local development
- Create .dockerignore to optimize build context
- Create .env.example with placeholder values
- [Optional] Create convenience scripts for non-technical users
- Update documentation with Docker usage instructions

## Steps

### 1. Create Docker Compose configuration

**Files to create:** `docker-compose.yml`

[Include complete docker-compose.yml tailored to the app type — use the appropriate template from this guide]

### 2. Create .dockerignore

**Files to create:** `.dockerignore`

[Include complete .dockerignore]

### 3. Create environment template

**Files to create:** `.env.example`

[Include all required environment variables with placeholder values and comments]

### 4. Update documentation

**Files to modify:** `README.md`

Document:
- Prerequisites (Docker Desktop or OrbStack)
- How to start: `docker compose up`
- How to stop: `docker compose down`
- How to run commands inside: `docker compose exec app <command>`
- How to run tests: `docker compose exec app pnpm test`
- How to rebuild: `docker compose up --build`

## Verification

```bash
docker network create web 2>/dev/null  # Ensure shared network exists
docker compose up -d
docker compose exec app pnpm --version
# Verify dev server is accessible at https://<app-name>.localhost (requires Caddy running)
docker compose down
```

Expected: Container starts, pnpm is available, dev server responds via Caddy domain.

## When done

Report: files created/modified, container status, and any issues encountered.
```

---

## Adapting for App Type

| App type | Base image | Caddy route | Volumes | Database |
|---|---|---|---|---|
| Frontend only | `node:24-bookworm` | `<app-name>.localhost` → :5173 | `.:/app`, `/app/node_modules` | None |
| Backend only | `node:24-bookworm` | `<app-name>.localhost` → :4000 | `.:/app`, `/app/node_modules` | PostgreSQL (`postgres:17`) |
| Fullstack | `node:24-bookworm` | `<app-name>.localhost` → :5173 (API via Vite proxy) | `.:/app`, `/app/node_modules` | PostgreSQL (`postgres:17`) |
| With Playwright E2E | `mcr.microsoft.com/playwright:v<ver>-noble` | Same as fullstack | `.:/app`, `/app/node_modules` | PostgreSQL (`postgres:17`) |

No host ports are exposed from individual apps — Caddy handles all routing. See [CADDY.md](CADDY.md) for setup.

## Docker Commands Reference

Include these in the plan's documentation step:

```bash
docker compose up                      # Start dev environment (foreground)
docker compose up -d                   # Start in background
docker compose down                    # Stop and remove containers
docker compose exec app sh             # Shell into the container
docker compose exec app pnpm test      # Run tests
docker compose exec app pnpm test:e2e  # Run E2E tests (if Playwright image)
docker compose logs -f                 # Follow container logs
docker compose up --build              # Rebuild and start
```
