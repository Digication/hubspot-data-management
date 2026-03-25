# Tech Stack Preferences

When building a **brand-new app**, suggest from these preferred technologies. Adapt based on the type of app — frontend-only, fullstack, backend-only, CLI, etc.

## Core

| Layer | Preferred | Notes |
|---|---|---|
| Package manager | pnpm | Always pnpm, not npm or yarn |
| Language | TypeScript (strict mode) | For both frontend and backend |

## Frontend

| Layer | Preferred | Notes |
|---|---|---|
| Framework | React | Latest stable version |
| UI library | Material UI (MUI) | With @mui/icons-material for icons |
| Build tool | Vite | For frontend bundling |

## Backend

| Layer | Preferred | Notes |
|---|---|---|
| GraphQL schema | TypeGraphQL | Code-first, decorator-based — pairs with TypeORM |
| GraphQL server | GraphQL Yoga | Runtime for serving the TypeGraphQL schema |
| ORM | TypeORM | Decorator-based entities, PostgreSQL driver |
| Database | PostgreSQL | Portable across all deployment tiers (local Docker, Railway, AWS RDS) |
| Real-time | SSE (Server-Sent Events) | Preferred over WebSockets for subscriptions |

## Client-Side GraphQL

| Layer | Preferred | Notes |
|---|---|---|
| GraphQL client | Apollo Client | With graphql-codegen for typed client hooks |
| Code generation | graphql-codegen | Client-side only — generates types/hooks from introspected schema |

## Testing

| Layer | Preferred | Notes |
|---|---|---|
| Unit testing | Vitest | Fast, TypeScript-native |
| E2E testing | Playwright | Cross-browser, reliable |

## Guidelines

- These are suggestions, not requirements — discuss with the user before committing to a stack
- If the project already has an established stack, follow it — don't introduce new technologies
- Always use the **latest stable version** of chosen libraries
- For frontend-only apps, skip backend-specific tools (ORM, GraphQL server)
- For CLI tools or scripts, skip frontend-specific tools
- Suggest additional libraries as appropriate (e.g., state management, auth, file upload)
- Document stack decisions and rationale in the plan's `00-overview.md`
