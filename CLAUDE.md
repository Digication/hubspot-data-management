# Environment
- Package manager: pnpm
- Language: TypeScript
- **Dev setup**: Docker + Caddy reverse proxy. Start with `docker compose up -d --build`. The app is served at `https://<name>.localhost` via Caddy labels. Do NOT use `pnpm dev` directly on the host. Do NOT add `ports:` mappings to docker-compose.yml as a workaround — if the app isn't accessible, ensure Caddy is running (`cd ~/caddy && docker compose up -d`).
- **Unit tests**: `docker compose exec <app-name> pnpm test`
- **E2e tests**: `docker compose run --rm e2e`

# HubSpot

- **Portal ID:** `7162402` (Digication's HubSpot account)
- **API auth:** Service Key in local `.env` as `HUBSPOT_ACCESS_TOKEN`. See `.env.example` for required scopes. Service Keys replaced legacy Private Apps in 2026.
- **API client:** `scripts/phase2/lib/hubspot.ts` (thin wrapper, no SDK dependency)
- **UI deep-link patterns** (replace `{id}` with the relevant artifact ID):
  - Workflow: `https://app.hubspot.com/workflows/7162402/platform/flow/{id}`
  - Report: `https://app.hubspot.com/reports-list/7162402/{id}/`
  - Property: `https://app.hubspot.com/property-settings/7162402/properties?action=edit&type={contact|company|deal}&property={name}`
