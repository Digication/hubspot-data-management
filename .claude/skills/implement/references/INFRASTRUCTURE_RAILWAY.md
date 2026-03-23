# Railway Deployment

Reference for deploying apps to Railway — the simple cloud tier.

---

## Overview

[Railway](https://railway.com) is a zero-config PaaS. It auto-detects your framework, builds, and deploys on every push. The CLI command `railway up` deploys the current directory with no configuration files needed.

**Key features:**
- Auto-detection of language, framework, and build settings
- One-click PostgreSQL provisioning
- Environment variables per service and per environment
- Private networking between services
- PR preview environments (Hobby tier and above)
- Usage-based pricing ($5/month minimum on Hobby)

---

## CLI Setup

### Install

```bash
# macOS
brew install railway

# npm (cross-platform)
npm i -g @railway/cli
```

### Authenticate

```bash
railway login
```

### Link to Project

```bash
# Create a new project
railway init

# Or link to an existing project
railway link
```

---

## Project Configuration

### `railway.json` (optional)

Railway auto-detects most settings. Use `railway.json` only when you need to override defaults:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/server/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

For most TypeScript apps, no config file is needed — Railway detects `package.json` and runs the `build` and `start` scripts automatically.

### Monorepo Setup

For monorepo projects with separate frontend/backend services:

1. Create one Railway service per app component
2. Set the **root directory** for each service (e.g., `/frontend`, `/backend`)
3. Configure **watch paths** so each service only rebuilds when its files change

---

## Database Setup

### Provision PostgreSQL

```bash
# Via CLI — add a PostgreSQL service to your project
railway add --plugin postgresql
```

Or via the Railway dashboard: click **+ New** → **Database** → **PostgreSQL**.

Railway auto-injects these environment variables into linked services:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full connection string (use this in TypeORM config) |
| `PGHOST` | PostgreSQL host |
| `PGPORT` | PostgreSQL port |
| `PGUSER` | PostgreSQL user |
| `PGPASSWORD` | PostgreSQL password |
| `PGDATABASE` | Database name |

### TypeORM Configuration

Use `DATABASE_URL` from Railway's auto-injected environment:

```typescript
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false, // Use migrations in production
  entities: ["src/entities/**/*.ts"],
  migrations: ["src/migrations/**/*.ts"],
});
```

---

## Environment Variables

```bash
# Set a variable
railway variables set API_KEY=your-key-here

# View all variables
railway variables

# Run a local command with Railway env vars injected
railway run pnpm dev
```

Variables can also be managed via the Railway dashboard. Use **shared variables** for values needed across multiple services.

---

## Deployment

### Deploy from CLI

```bash
# Deploy the current directory
railway up

# Deploy with logs
railway up --detach=false
```

### Deploy from GitHub

1. Connect your GitHub repo in the Railway dashboard
2. Select the branch to auto-deploy (e.g., `main`)
3. Every push to that branch triggers a build and deploy

### PR Preview Environments

Railway automatically creates isolated environments for pull requests when configured:

1. In the Railway dashboard, go to **Settings** → **Environments**
2. Enable **PR environments**
3. Each PR gets its own deployment URL and database instance

---

## Infrastructure Phase Template

```markdown
# Phase NN — Railway Deployment

You are setting up Railway deployment for [app name].

**Context:** Phases 01–(NN-1) have built the complete application with passing tests. This phase deploys it to Railway.

## Overview

- Initialize Railway project
- Provision PostgreSQL database
- Configure environment variables
- Deploy the application
- Verify it's accessible

## Steps

### 1. Initialize Railway

Run `railway init` in the project root to create a new Railway project.

### 2. Add PostgreSQL

Add a PostgreSQL database service:

```bash
railway add --plugin postgresql
```

### 3. Configure environment variables

Set any required environment variables (API keys, secrets):

```bash
railway variables set NODE_ENV=production
# Add any app-specific variables
```

**Note:** `DATABASE_URL` is auto-injected — do not set it manually.

### 4. Add railway.json (if needed)

**Files to create:** `railway.json` (only if custom start command or health check is needed)

[Include railway.json if the app needs custom configuration]

### 5. Deploy

```bash
railway up
```

### 6. Verify

Open the deployment URL provided by Railway and confirm the app is working.

## Verification

```bash
railway status
# Check deployment URL is accessible
curl -f <deployment-url>/health
```

Expected: App is deployed and responding at the Railway URL.

## When done

Report: Railway project URL, deployment URL, database status, and any issues encountered.
```

---

## Local Development with Railway Env Vars

Use `railway run` to inject Railway environment variables into local commands. This lets you develop locally against the Railway database:

```bash
# Run dev server with Railway env vars
railway run pnpm dev

# Run migrations against Railway database
railway run pnpm typeorm migration:run
```

For fully local development (recommended), use Docker Compose with a local PostgreSQL container instead. See [DOCKER.md](DOCKER.md).

---

## Cost Summary

| Tier | Monthly minimum | What's included |
|---|---|---|
| Hobby | $5 | $5 in credits, 5 GB storage, PR environments |
| Pro | $20 | $20 in credits, 1 TB storage, team features |

Usage beyond included credits is billed per-second:
- CPU: ~$0.50/vCPU/month
- Memory: ~$10/GB/month
- Storage: ~$0.16/GB/month

A small TypeScript app with PostgreSQL typically runs well within the $5/month Hobby tier.
