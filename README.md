# WNGSPAN

WNGSPAN is a self-hosted scheduling platform built from the Cal.com/Cal.diy lineage and adapted for the current WNGSPAN product and deployment model.

This repository is a Yarn/Turbo monorepo with:

- `apps/web` for the main Next.js application
- `packages/trpc` for the shared tRPC API layer
- `packages/prisma` for schema, migrations, and generated Prisma artifacts
- `packages/features` for product features such as teams, organizations, bookings, apps, and workflows

## Current Product Scope

This codebase is not a stripped-down "no enterprise features" fork anymore. The live application includes code for:

- Teams
- Organizations
- Admin organization and team management
- Workflows and cron-driven background jobs
- App store integrations
- Booking audit and scheduling infrastructure

Branding and default product identity are WNGSPAN-driven through environment variables and shared brand utilities.

## Requirements

- Node.js `20.x`
- Yarn `1.x`
- PostgreSQL `13+`

Optional local tooling:

- Docker Desktop for `yarn dx`
- MailHog for local email inspection

## Local Development

1. Clone the repository.
2. Install dependencies:

```sh
yarn
```

3. Copy `.env.example` to `.env`.
4. Set the required values in `.env`.
5. If you are on Windows and Prisma has trouble with the symlinked env file, replace `packages/prisma/.env` with a real copy of `.env`.
6. Run database migrations:

```sh
yarn workspace @calcom/prisma db-migrate
```

7. Start the app:

```sh
yarn dev
```

The main app runs at `http://localhost:3000`.

### Quick Start With Docker

If Docker is available, the fastest local bootstrap is:

```sh
yarn dx
```

That starts the repo's development stack through Turbo, including the local database flow used by the workspace.

## Environment Model

The source of truth for runtime configuration is [.env.example](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/.env.example:1).

Minimum required variables for the web app:

- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `NEXT_PUBLIC_WEBAPP_URL`
- `NEXT_PUBLIC_WEBSITE_URL`
- `NEXT_PUBLIC_EMBED_LIB_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `CALENDSO_ENCRYPTION_KEY`
- `CRON_API_KEY`
- `API_KEY_PREFIX`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_SERVER_HOST`
- `EMAIL_SERVER_PORT`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_COMPANY_NAME`

Important notes:

- `NEXTAUTH_URL` should match the public app URL, not `/api/auth`.
- `DATABASE_DIRECT_URL` should match `DATABASE_URL` unless you are using a separate direct connection.
- Organizations are supported and gated by `ORGANIZATIONS_ENABLED`.
- SMTP is the default documented email path for WNGSPAN.

## Useful Commands

```sh
yarn dev
yarn dx
yarn build
yarn workspace @calcom/prisma db-migrate
yarn workspace @calcom/prisma db-deploy
yarn type-check:ci --force
yarn biome check --write .
TZ=UTC yarn test
```

## Testing

Before pushing changes, the baseline checks are:

```sh
yarn type-check:ci --force
yarn biome check --write .
TZ=UTC yarn test
```

Targeted test runs are preferred for scoped changes. Full E2E runs are available through Playwright when needed.

## Deployment

The primary containerized deployment path in this repository uses the root [Dockerfile](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/Dockerfile:1) and [scripts/start.sh](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/scripts/start.sh:1).

At startup the container:

1. Rewrites statically baked `NEXT_PUBLIC_WEBAPP_URL` values if the runtime URL differs.
2. Optionally waits for `DATABASE_HOST` if that variable is provided.
3. Runs `prisma migrate deploy`.
4. Seeds app-store metadata.
5. Starts the web app.

Railway-specific notes are documented in [deploy/README.md](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/deploy/README.md:1).

## Documentation Status

This README is intended to describe the actual WNGSPAN codebase and deploy path. If behavior conflicts with this file, prefer:

1. `.env.example`
2. `Dockerfile`
3. `scripts/start.sh`
4. package-level scripts in `package.json`

## Security

Read [SECURITY.md](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/SECURITY.md:1) for security policy and reporting guidance.

## Contributing

Read [CONTRIBUTING.md](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/CONTRIBUTING.md:1) and [AGENTS.md](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/AGENTS.md:1) before making changes.
