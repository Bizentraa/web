# Bizentra POS Initial Deployment Guide

**Purpose:** deploy `bizentra-pos` as the first hosted Bizentra application  
**Applies to:** `apps/pos`, supported by hosted `apps/api`, PostgreSQL, and Redis  
**Recommended first target:** Vercel for POS, Render for API, Supabase for PostgreSQL, Upstash for Redis, GitHub Actions for CI/CD  
**Important limit:** The free stack is acceptable for a demo. It is not reliable enough for real store checkout, payments, stock, finance, or customer records.

---

## 1. What Must Be Running

The POS is not a standalone database application. It calls the Bizentra API, and the API owns the real sale, payment, stock, permission, approval, and audit rules.

```text
Cashier browser
  -> bizentra-pos on Vercel
  -> Bizentra API on Render
  -> Supabase PostgreSQL
  -> Upstash Redis for worker/queue support
```

For the first deployment, deploy in this order:

1. Create hosted PostgreSQL.
2. Create hosted Redis.
3. Deploy the API.
4. Deploy the POS.
5. Run the smoke checks.

Do not deploy POS first unless the hosted API URL is already known. POS needs `NEXT_PUBLIC_API_URL` at build/runtime.

## 2. Local Readiness Checklist

From the repository root:

```powershell
cd C:\projects\Thb\Bizentra
nvm use 24.19.0
corepack prepare pnpm@10.28.1 --activate
pnpm install
pnpm infra:up
pnpm db:migrate:deploy
pnpm db:generate
pnpm dev:api
pnpm dev:pos
```

Open:

```text
POS: http://localhost:3000
API health: http://localhost:4000/api/v1/health/ready
```

Before pushing:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/smoke-common-core.mjs
```

If the full check is slow, at minimum run:

```powershell
pnpm --filter @bizentra/pos typecheck
pnpm --filter @bizentra/pos build
pnpm --filter @bizentra/api typecheck
pnpm --filter @bizentra/api build
```

## 3. Required Environment Variables

### POS on Vercel

```dotenv
NEXT_PUBLIC_API_URL=https://<your-api-host>/api/v1
```

Only public browser-safe values may be placed in `NEXT_PUBLIC_*`.

### API on Render

```dotenv
NODE_ENV=production
API_PORT=4000
DATABASE_URL=<supabase-pooled-runtime-url>
MIGRATION_DATABASE_URL=<supabase-direct-migration-url>
REDIS_URL=<upstash-redis-url>
ALLOWED_WEB_ORIGINS=https://<your-pos-vercel-domain>,https://<your-backoffice-domain-later>
AUTH_MODE=development
DEVELOPMENT_BUSINESS_ID=<demo-business-id>
DEVELOPMENT_USER_ID=<demo-user-id>
```

For the first private demo, `AUTH_MODE=development` can be used only with throw-away demo data. Before any shared or real customer environment, replace it with OIDC.

## 4. Supabase PostgreSQL Setup

1. Create a Supabase project named `bizentra-demo`.
2. Choose the region closest to the first demo users.
3. Copy the direct connection URL for migrations.
4. Copy the pooled connection URL for API and worker runtime.
5. Store them as secrets in Render and GitHub Actions.

Use:

```text
DATABASE_URL = pooled connection
MIGRATION_DATABASE_URL = direct connection
```

Run migrations once from a controlled machine or CI job:

```powershell
$env:DATABASE_URL="<supabase-pooled-runtime-url>"
$env:MIGRATION_DATABASE_URL="<supabase-direct-migration-url>"
pnpm db:migrate:deploy
pnpm db:generate
```

Supabase Free is enough for a demo database, but it has small storage and inactivity limits. Do not store production business data there without a paid backup and restore plan.

## 5. Upstash Redis Setup

1. Create one Redis database named `bizentra-demo-redis`.
2. Copy the Redis URL.
3. Add it to Render as `REDIS_URL`.
4. Use it for the worker and any API queue/cache integration.

The free tier is suitable for low-volume testing only.

## 6. Render API Setup

Create a Render web service:

| Setting | Value |
|---|---|
| Name | `bizentra-api` |
| Runtime | Node |
| Root | repository root |
| Build command | `corepack enable && corepack prepare pnpm@10.28.1 --activate && pnpm install --frozen-lockfile && pnpm turbo run build --filter=@bizentra/api` |
| Start command | `pnpm --filter @bizentra/api start` |
| Health check path | `/api/v1/health/ready` |

Add the API environment variables from section 3.

After deployment, verify:

```text
https://<your-api-host>/api/v1/health/live
https://<your-api-host>/api/v1/health/ready
```

The `ready` endpoint must return `status: "ok"` before deploying POS.

## 7. Vercel POS Setup

Create a Vercel project connected to the Git repository:

| Setting | Value |
|---|---|
| Project name | `bizentra-pos` |
| Framework | Next.js |
| Root directory | `apps/pos` |
| Install command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build command | `cd ../.. && pnpm turbo run build --filter=@bizentra/pos` |
| Output directory | Next.js default |

Add this environment variable:

```dotenv
NEXT_PUBLIC_API_URL=https://<your-api-host>/api/v1
```

Deploy from `main`. Vercel will create a production URL first, for example:

```text
https://bizentra-pos.vercel.app
```

After you know that URL, update the API service:

```dotenv
ALLOWED_WEB_ORIGINS=https://bizentra-pos.vercel.app
```

Redeploy or restart the API so the new CORS allowlist is active.

## 8. Create Demo Business Data

With the hosted API running, create one demo Business using the same request from local setup, but point it at the hosted API:

```powershell
$body = @{
  business = @{
    name = "Demo Grocery"
    slug = "demo-grocery"
    legalName = "Demo Grocery (Private) Limited"
    email = "owner@example.test"
    phone = "+94 11 000 0000"
    defaultCurrency = "LKR"
    timeZone = "Asia/Colombo"
    countryCode = "LK"
  }
  firstBranch = @{
    code = "COL01"
    name = "Colombo Main Branch"
  }
  firstLocation = @{
    code = "FLOOR"
    name = "Shop Floor"
    type = "SHOP_FLOOR"
  }
  owner = @{
    externalSubject = "demo-owner-001"
    email = "owner@example.test"
    displayName = "Demo Owner"
  }
} | ConvertTo-Json -Depth 6

$created = Invoke-RestMethod `
  -Method Post `
  -Uri https://<your-api-host>/api/v1/setup/business-foundation `
  -ContentType "application/json" `
  -Body $body

$created
```

Copy the returned IDs into Render:

```dotenv
DEVELOPMENT_BUSINESS_ID=<businessId>
DEVELOPMENT_USER_ID=<ownerUserId>
```

Restart the API. The hosted POS can now load the demo Business.

## 9. GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.28.1
      - uses: actions/setup-node@v4
        with:
          node-version: 24.19.0
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
```

After CI is stable, protect `main` so deployments happen only after checks pass.

## 10. Post-Deploy Smoke Check

Check these after every POS deployment:

1. Open the Vercel POS URL.
2. Confirm the page loads without a browser CORS error.
3. Confirm the POS can read demo Business/session data.
4. Confirm the API health endpoint is `ok`.
5. Complete a basic POS flow that is already implemented in the current phase.
6. Refresh the browser and confirm the POS still loads the same demo context.
7. Check Render logs for API errors.
8. Check Supabase database tables for created or changed records.

## 11. What Not To Do

- Do not put database credentials in Vercel POS variables.
- Do not connect POS directly to Supabase tables for sales, stock, payment, or finance.
- Do not run Prisma migrations from every API startup.
- Do not use free tiers for real production checkout.
- Do not leave `AUTH_MODE=development` enabled for real users.
- Do not add separate business-pack POS apps such as `apps/grocery-pos`; use the existing POS with enabled business capabilities.

## 12. First Production Upgrade Path

When the demo works, upgrade in this order:

1. Paid managed PostgreSQL with backups and restore testing.
2. Always-on API.
3. Always-on worker.
4. Paid Redis or managed key-value service.
5. OIDC login.
6. Domain names and TLS:
   - `pos.<domain>`
   - `api.<domain>`
   - later `app.<domain>`
7. Deployment approval before production.
8. Monitoring for API errors, database connections, failed jobs, and outbox age.

This keeps the initial deployment small while preserving the architecture needed for a serious POS SaaS.
