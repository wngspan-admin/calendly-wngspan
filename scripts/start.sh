#!/bin/sh
set -eux

# Replace the statically built BUILT_NEXT_PUBLIC_WEBAPP_URL with run-time NEXT_PUBLIC_WEBAPP_URL
# NOTE: if these values are the same, this will be skipped.
scripts/replace-placeholder.sh "$BUILT_NEXT_PUBLIC_WEBAPP_URL" "$NEXT_PUBLIC_WEBAPP_URL"

# Derive DATABASE_HOST from DATABASE_URL if not explicitly set (e.g. on Railway)
if [ -z "${DATABASE_HOST:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_HOST=$(echo "$DATABASE_URL" | sed 's|.*@\([^/]*\)/.*|\1|')
fi
if [ -n "${DATABASE_HOST:-}" ]; then
  scripts/wait-for-it.sh "${DATABASE_HOST}" -- echo "database is up"
fi

if [ "${RUN_DB_MIGRATIONS_AT_STARTUP:-1}" = "1" ]; then
  npx prisma migrate deploy --schema /calcom/packages/prisma/schema.prisma
else
  echo "Skipping prisma migrate deploy because RUN_DB_MIGRATIONS_AT_STARTUP is disabled"
fi

if [ "${RUN_APP_STORE_SEED_AT_STARTUP:-0}" = "1" ]; then
  npx ts-node --transpile-only /calcom/scripts/seed-app-store.ts
else
  echo "Skipping app store seed because RUN_APP_STORE_SEED_AT_STARTUP is disabled"
fi

exec yarn start
