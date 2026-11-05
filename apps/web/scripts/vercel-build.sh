#!/usr/bin/env sh
# Build na Vercel: aplica as migrations antes do `next build`.
#
# - Produção: sempre migra (o deploy falha se a migration falhar, mantendo a versão anterior no ar).
# - Preview: só migra com MIGRATE_ON_BUILD=1 — use isso apenas se cada preview tiver o próprio
#   branch de banco no Neon; caso contrário um PR não mergeado alteraria o banco de produção.
set -e

if [ "$VERCEL_ENV" = "production" ] || [ "$MIGRATE_ON_BUILD" = "1" ]; then
  echo "▶ Aplicando migrations ($VERCEL_ENV)…"
  pnpm --filter @boramarcar/db db:migrate
else
  echo "▶ Migrations ignoradas ($VERCEL_ENV). Defina MIGRATE_ON_BUILD=1 para migrar neste ambiente."
fi

pnpm next build
