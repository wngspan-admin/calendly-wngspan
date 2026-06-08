# Railway Deployment

This repository deploys the web app through the root `Dockerfile`.

## What The Container Does

Build stage:

- installs the monorepo dependencies
- builds `@calcom/trpc`
- builds the embed bundle
- copies app-store static assets into the web app
- builds `@calcom/web`

Runtime stage:

- serves the built web app
- rewrites `NEXT_PUBLIC_WEBAPP_URL` in static output if the runtime URL changes
- optionally waits for `DATABASE_HOST`
- runs `prisma migrate deploy`
- seeds app-store metadata
- starts the application with `yarn start`

The runtime entrypoint is [scripts/start.sh](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/scripts/start.sh:1).

## Required Railway Variables

Set these before the first deploy:

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

Recommended WNGSPAN defaults:

- `NEXT_PUBLIC_APP_NAME=WNGSPAN`
- `NEXT_PUBLIC_COMPANY_NAME=WNGSPAN`
- `EMAIL_FROM_NAME=WNGSPAN`

## Common Optional Variables

Configure these only if the feature is in use:

- `ORGANIZATIONS_ENABLED`
- `PROJECT_ID_VERCEL`
- `TEAM_ID_VERCEL`
- `AUTH_BEARER_TOKEN_VERCEL`
- `STRIPE_*`
- `SENTRY_*`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `GOOGLE_*`
- `OUTLOOK_*`

The current canonical list lives in [.env.example](/C:/Users/samor/coding/wngspan_infra/calendly-wngspan/.env.example:1).

## Railway Notes

- Railway should expose the app through `PORT`; the container health check uses that value.
- `NEXTAUTH_URL` should be the public base URL of the deployed app.
- `NEXT_PUBLIC_WEBAPP_URL`, `NEXT_PUBLIC_WEBSITE_URL`, and `NEXTAUTH_URL` should usually all point at the same public origin.
- If you are not using a pooler, set `DATABASE_DIRECT_URL` equal to `DATABASE_URL`.
- `DATABASE_HOST` is optional. If present, startup waits for it before migrations.

## First Deploy Checklist

1. Provision PostgreSQL.
2. Add the required variables.
3. Trigger a deploy from `dev` or the intended release branch.
4. Confirm the migration step succeeds.
5. Confirm app-store seeding succeeds.
6. Verify the health check turns green.
7. Log in and verify core flows: auth, bookings, settings, and any enabled org features.

## If A Deploy Fails

Check these first:

- missing or mismatched `NEXTAUTH_URL`
- invalid `CALENDSO_ENCRYPTION_KEY`
- unreachable database
- missing SMTP settings
- build-time env values not present in Railway

If the app boots but static URLs are wrong, confirm `NEXT_PUBLIC_WEBAPP_URL` is set to the final public Railway URL.
