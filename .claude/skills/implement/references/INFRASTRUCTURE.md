# Infrastructure Overview

Reference for choosing and configuring the right deployment tier.

---

## Deployment Tiers

This project supports three deployment tiers. Choose based on the user's needs and technical comfort level.

### Tier 1 — Local Only

**When:** Prototyping, learning, demos, personal tools, no mention of deployment.

**Platform:** Docker Compose with PostgreSQL in a container.

**What to do:**
- Add a Docker phase using [DOCKER.md](DOCKER.md) templates
- PostgreSQL runs as a `db` service in `docker-compose.yml`
- No cloud accounts, no CI/CD, no deployment config
- Everything runs with `docker compose up`

**Best for:** Non-developers exploring ideas, early prototyping, local-only tools.

---

### Tier 2 — Simple Cloud (Railway)

**When:** User wants to share the app, deploy for others to access, or is a non-developer who needs simple hosting.

**Platform:** [Railway](https://railway.com) — zero-config PaaS with `railway up` deployment.

**What to do:**
- Add a Railway infrastructure phase using [INFRASTRUCTURE_RAILWAY.md](INFRASTRUCTURE_RAILWAY.md)
- Provision PostgreSQL as a Railway service (one-click)
- Configure environment variables via Railway dashboard or CLI
- Deploy via `railway up` or GitHub auto-deploy

**Best for:** Non-developers, small teams, prototypes that need to be shared, apps that don't need enterprise-grade infrastructure.

**Cost:** $5/month minimum (Hobby tier) with usage-based billing.

---

### Tier 3 — Production (AWS + SST)

**When:** Production workloads, enterprise requirements, scaling needs, CI/CD pipelines, multiple environments.

**Platform:** AWS via SST (built on Pulumi) with GitHub Actions CI/CD.

**What to do:**
- Add an AWS infrastructure phase using [INFRASTRUCTURE_AWS.md](INFRASTRUCTURE_AWS.md)
- Define all resources in `sst.config.ts`
- Set up GitHub Actions for automated test + deploy
- Configure branch-based stages (`main` → production, `dev` → staging, PR → preview)

**Best for:** Advanced users, production apps, teams needing CI/CD, compliance requirements, auto-scaling.

**Cost:** Pay-as-you-go AWS pricing. Requires an AWS account with billing enabled.

---

## Tier Selection Guide

| Signal | Tier |
|---|---|
| "just for me", "prototype", "demo", "local" | Local |
| "deploy", "share", non-developer, "simple hosting" | Simple cloud |
| "production", "scale", "enterprise", "CI/CD", advanced user | Production |
| Unclear | Ask: "How do you want to run this? Locally only, simple cloud deploy, or full production setup?" |

## Database Across Tiers

PostgreSQL is the standard database across all tiers. This ensures zero migration friction when moving between tiers:

| Tier | PostgreSQL setup |
|---|---|
| Local | `postgres:17` Docker container |
| Simple cloud | Railway PostgreSQL service (one-click provisioning) |
| Production | AWS RDS Aurora Serverless via `sst.aws.Postgres` |

TypeORM entities and migrations work identically across all three.

## Infrastructure Phase Placement

Infrastructure is typically the **final phase** in a plan (after implementation and tests pass), or a **parallel track** if someone is dedicated to it.

```
Implementation phases (01–N)
  └──► Unit tests (N+1)
         └──► Infrastructure (N+2)    ← deploys the tested app
                └──► E2E tests (last) ← runs against deployed or local app
```

For simple cloud (Railway), the infrastructure phase is lightweight — often just 2-3 steps. For production (AWS), it's a full phase with SST config, GitHub Actions, and secrets management.
