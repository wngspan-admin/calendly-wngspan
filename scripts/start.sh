#!/bin/sh
set -x

# Replace the statically built BUILT_NEXT_PUBLIC_WEBAPP_URL with run-time NEXT_PUBLIC_WEBAPP_URL
# NOTE: if these values are the same, this will be skipped.
scripts/replace-placeholder.sh "$BUILT_NEXT_PUBLIC_WEBAPP_URL" "$NEXT_PUBLIC_WEBAPP_URL"

# Derive DATABASE_HOST from DATABASE_URL if not explicitly set (e.g. on Railway)
if [ -z "$DATABASE_HOST" ] && [ -n "$DATABASE_URL" ]; then
  DATABASE_HOST=$(echo "$DATABASE_URL" | sed 's|.*@\([^/]*\)/.*|\1|')
fi
scripts/wait-for-it.sh ${DATABASE_HOST} -- echo "database is up"
npx prisma migrate deploy --schema /calcom/packages/prisma/schema.prisma
npx ts-node --transpile-only /calcom/scripts/seed-app-store.ts
yarn start
