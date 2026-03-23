# AWS Production Deployment

Reference for deploying apps to AWS via SST — the production tier.

---

## Overview

[SST](https://sst.dev) (built on Pulumi) provides high-level components that handle IAM, networking, and CDN configuration automatically. A fullstack app can be defined in ~30-50 lines in `sst.config.ts`. This is dramatically simpler than raw CDK or Pulumi, which require 200-400 lines and deep AWS knowledge.

**Key features:**
- App-level abstractions (`StaticSite`, `Function`, `Postgres`, etc.)
- Live development with `sst dev` (proxies Lambda to local machine)
- Branch-based stages for environment isolation
- GitHub Actions CI/CD integration
- SST v4 is stable and open-source; built on Pulumi, so migration is straightforward if needed

---

## SST Configuration

### Minimal Fullstack App (`sst.config.ts`)

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "my-app",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Database
    const db = new sst.aws.Postgres("Database", {
      scaling: { min: "0.5 ACU", max: "2 ACU" },
    });

    // API
    const api = new sst.aws.Function("Api", {
      handler: "src/server/index.handler",
      link: [db],
      url: true,
    });

    // Frontend
    const site = new sst.aws.StaticSite("Web", {
      path: ".",
      build: {
        command: "pnpm build",
        output: "dist/client",
      },
      environment: {
        VITE_API_URL: api.url,
      },
    });

    return { url: site.url, api: api.url };
  },
});
```

### Key SST Concepts

| Concept | What it does |
|---|---|
| `sst.config.ts` | Single file defining all infrastructure |
| **Components** | High-level resources: `StaticSite`, `Function`, `Postgres`, `Bucket`, `Cron`, `Queue` |
| **Linking** | `link: [db]` auto-grants permissions and injects connection info as env vars |
| **Stages** | Each deploy target is a stage (e.g., `production`, `dev`, `pr-42`). Resources are isolated per stage. |
| **`sst dev`** | Live development — proxies Lambda invocations to your local machine for instant feedback |
| **`sst deploy`** | Deploy a stage to AWS |
| **`sst remove`** | Tear down a stage |

### Common Components

| Component | Use case |
|---|---|
| `sst.aws.StaticSite` | React/Vite frontend — auto-creates S3 + CloudFront |
| `sst.aws.Function` | Lambda function — can expose via `url: true` for HTTP |
| `sst.aws.ApiGatewayV2` | HTTP API with routes mapped to Lambda handlers |
| `sst.aws.Postgres` | RDS PostgreSQL (Aurora Serverless) |
| `sst.aws.Bucket` | S3 bucket for file storage |
| `sst.aws.Cron` | Scheduled Lambda execution |
| `sst.aws.Queue` | SQS queue with Lambda consumer |

---

## GitHub Actions CI/CD

### Deploy Workflow (`.github/workflows/deploy.yml`)

```yaml
name: Deploy

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

# Prevent concurrent deploys to the same stage
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

permissions:
  id-token: write   # For OIDC auth with AWS
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - run: pnpm install --frozen-lockfile

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: npx sst deploy --stage production

      - name: Deploy to staging
        if: github.ref == 'refs/heads/dev'
        run: npx sst deploy --stage staging

      - name: Deploy PR preview
        if: github.event_name == 'pull_request'
        run: npx sst deploy --stage pr-${{ github.event.number }}
```

### Required GitHub Secrets

| Secret | Value | How to get it |
|---|---|---|
| `AWS_ROLE_ARN` | IAM role ARN for OIDC | Create via AWS IAM with GitHub OIDC provider trust |
| App-specific secrets | API keys, etc. | Set in GitHub repo settings > Secrets |

### Branch-to-Stage Mapping

| Branch/trigger | SST stage | Purpose |
|---|---|---|
| `main` | `production` | Live production environment |
| `dev` | `staging` | Pre-production testing |
| Pull request | `pr-<number>` | Isolated preview per PR |

### The Ideal Flow

```
Developer writes code
  → git push to GitHub
    → GitHub Actions triggers
      → runs typecheck + tests
        → if pass: sst deploy --stage <branch-name>
          → app is live
```

---

## Infrastructure Phase Template

```markdown
# Phase NN — AWS Infrastructure & CI/CD

You are setting up AWS deployment infrastructure for [app name].

**Context:** Phases 01–(NN-1) have built the complete application with passing tests. This phase adds SST infrastructure configuration and GitHub Actions for automated deployment.

## Overview

- Initialize SST in the project
- Define infrastructure resources (static site, API, database)
- Create GitHub Actions workflow (test -> deploy)
- Configure environment-based stages
- Deploy to a dev stage and verify

## Steps

### 1. Initialize SST

Run `npx sst@latest init` in the project root, then customize `sst.config.ts`.

**Files to create/modify:** `sst.config.ts`, `package.json` (adds sst dependency)

[Include complete sst.config.ts tailored to the app's needs]

### 2. Create GitHub Actions workflow

**Files to create:** `.github/workflows/deploy.yml`

[Include complete workflow file]

### 3. Configure local development

Update the dev workflow to use `sst dev` for live Lambda development:

**Files to modify:** `package.json`

[Update dev scripts if needed]

### 4. Document deployment

**Files to create/modify:** `README.md` or deployment docs

Document:
- Required AWS setup (IAM role, OIDC provider)
- Required GitHub secrets
- How to deploy manually (`npx sst deploy --stage <name>`)
- How to tear down a stage (`npx sst remove --stage <name>`)

## Verification

[Deploy to a dev stage]
[Verify the app is accessible at the output URL]
[Verify GitHub Actions workflow syntax is valid]

## When done

Report: files created/modified, deploy URL, and any issues encountered.
```

---

## AWS Setup Checklist

Before the first deploy, these AWS resources need to exist:

1. **AWS account** with billing enabled
2. **GitHub OIDC identity provider** in IAM (one-time setup)
3. **IAM role** with trust policy for GitHub Actions and permissions for SST to manage resources
4. **GitHub secrets** configured in the repository settings

SST handles everything else (S3 buckets, CloudFront, Lambda, RDS, IAM policies for the app) automatically.

---

## Adapting for App Type

| App type | SST components needed |
|---|---|
| Frontend only (static) | `StaticSite` |
| Frontend + API (serverless) | `StaticSite` + `Function` (with `url: true`) or `ApiGatewayV2` |
| Fullstack + database | `StaticSite` + `Function`/`ApiGatewayV2` + `Postgres` |
| API only (no frontend) | `Function` or `ApiGatewayV2` |
| Background jobs | `Cron`, `Queue` |

For local-only or simple cloud apps, skip this entirely — use Docker Compose or Railway instead.
