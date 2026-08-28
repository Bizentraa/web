# Bizentra Free Hosting and CI/CD Deployment Strategy

**Status:** Proposed deployment baseline for demo, staging, and first production planning  
**Planning date:** 2026-08-28  
**Applies to:** Current Bizentra monorepo with POS, Back Office, API, Worker, PostgreSQL, Redis/BullMQ, and Prisma migrations  
**Important limit:** A free deployment can prove the product and CI/CD flow, but it must not be treated as reliable production for real stores, payments, stock, or finance.

---

## 1. Current Codebase Fit

Bizentra currently builds as a pnpm/Turborepo monorepo:

| Source | Technology | Deployment meaning |
|---|---|---|
| `apps/pos` | Next.js 16 + React | Public POS web app, ideally `pos.<domain>` |
| `apps/backoffice` | Next.js 16 + React | Management app, ideally `app.<domain>` |
| `apps/api` | NestJS + Fastify | Versioned API, ideally `api.<domain>` |
| `apps/worker` | NestJS application context + BullMQ | Background jobs, outbox, reports, sync, retries |
| `packages/database` | Prisma 7 + PostgreSQL migrations | Database client and migration history |
| `infrastructure/local` | Docker Compose | Local PostgreSQL 18 and Redis 8 only |

The architecture documents already say the right thing: the monorepo is one source repository but produces four deployables. Packages are compiled into the apps and are not deployed separately.

## 2. Recommended Free/Demo Topology

Use this for demos, investor previews, internal testing, and early feature validation:

```text
GitHub repository
  |
  +-- GitHub Actions
  |     - install pnpm
  |     - lint/typecheck/test/build
  |     - run Prisma migration job for staging/demo
  |
  +-- Vercel project: bizentra-pos
  |     - root directory: apps/pos
  |     - domain: pos-demo.<domain>
  |
  +-- Vercel project: bizentra-backoffice
  |     - root directory: apps/backoffice
  |     - domain: app-demo.<domain>
  |
  +-- Render web service: bizentra-api
  |     - build from repo root
  |     - start apps/api
  |
  +-- Render or paid fallback: bizentra-worker
  |     - start apps/worker
  |
  +-- Supabase Free
  |     - PostgreSQL
  |     - optional Auth and Storage later
  |
  +-- Upstash Redis Free
        - Redis-compatible queue/cache endpoint
```

### Why this split

- Vercel is the simplest free fit for the two Next.js apps.
- Render is a simple fit for a Node API service.
- Supabase is the best free hosted PostgreSQL fit for this codebase because the project already uses Prisma/PostgreSQL.
- Upstash Redis is a practical free Redis-compatible endpoint for BullMQ testing.
- GitHub Actions gives the project a normal CI/CD control point and avoids relying only on platform auto-builds.

## 3. Free-Tier Reality Check

| Area | Free choice | Current free limit/risk | Bizentra decision |
|---|---|---|---|
| Frontend hosting | Vercel Hobby | Free Hobby is for personal/non-commercial usage and has usage caps | OK for demo and development previews; upgrade before commercial usage |
| API hosting | Render Free web service | Free web services can spin down and have monthly free-instance limits | OK for demo; not acceptable for live checkout traffic |
| Worker hosting | Render background worker or small paid service | Free support for always-on workers is weaker than web services and may require payment | For a serious demo, run worker as a separate service; for production, use paid always-on compute |
| PostgreSQL | Supabase Free | 500 MB database, shared compute, limited egress, projects can pause after inactivity | OK for prototype/demo; production needs Pro or another paid managed PostgreSQL |
| Redis | Upstash Redis Free | 256 MB and 500K commands/month | OK for low-volume queue/cache tests; production needs paid Redis or managed Render Key Value |
| CI/CD | GitHub Actions | Public repos have free standard runner usage; private GitHub Free has monthly minute/storage limits | OK if workflows are kept focused and cached |

## 4. Required Codebase Changes Before First Hosted Demo

### 4.1 Environment separation

Create clear variable groups:

```dotenv
# Frontend public values
NEXT_PUBLIC_API_URL=https://api-demo.<domain>/api/v1

# API/worker runtime values
NODE_ENV=production
API_PORT=4000
DATABASE_URL=<pooled runtime database URL>
MIGRATION_DATABASE_URL=<direct migration database URL>
REDIS_URL=<redis URL>
AUTH_MODE=oidc
OIDC_ISSUER_URL=<issuer>
OIDC_AUDIENCE=<audience>
```

Do not deploy with `AUTH_MODE=development`. The current development identity headers are useful locally, but production or shared demos need OIDC before real users or customer data.

### 4.2 CORS

`apps/api/src/main.ts` currently allows only localhost origins. Before hosting, make CORS configurable:

```text
ALLOWED_WEB_ORIGINS=https://pos-demo.<domain>,https://app-demo.<domain>
```

The API should reject browser origins outside that allowlist.

### 4.3 Health checks

The API already has readiness endpoints. Keep using:

```text
/api/v1/health/ready
```

Add a worker health or heartbeat status before relying on background processing in a demo. The worker currently starts as an application context, so the platform needs a clear way to know it is alive.

### 4.4 Database URLs

Use two different database URLs:

| Variable | Use |
|---|---|
| `DATABASE_URL` | Runtime API and worker traffic through the pooler |
| `MIGRATION_DATABASE_URL` | Direct database connection for `prisma migrate deploy` |

This matches the existing `.env.example` and avoids running migrations through a transaction pooler.

### 4.5 Build commands

Use root-level Turborepo filters so each deployable builds with its workspace dependencies:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @bizentra/database db:generate
pnpm turbo run build --filter=@bizentra/pos
pnpm turbo run build --filter=@bizentra/backoffice
pnpm turbo run build --filter=@bizentra/api
pnpm turbo run build --filter=@bizentra/worker
```

## 5. CI/CD Plan

### 5.1 Pull request workflow

Run this on every pull request:

```text
Install locked dependencies
  -> Prisma generate
  -> format check
  -> lint
  -> typecheck
  -> tests
  -> build affected deployables
```

For now, keep this simple and run the existing root command:

```powershell
pnpm check
```

When the workflow becomes too slow, replace it with affected Turbo filters.

### 5.2 Demo/staging deployment workflow

Run this on merge to `main`:

```text
1. Run quality checks.
2. Generate Prisma client.
3. Apply database migrations with MIGRATION_DATABASE_URL.
4. Deploy API.
5. Deploy worker.
6. Deploy POS and Back Office.
7. Run smoke check against hosted URLs.
```

For demo speed, platform auto-deploy can be enabled, but the migration step must stay controlled. Do not let every app instance run migrations on startup.

### 5.3 Production workflow later

```text
1. Build immutable artifacts.
2. Deploy to staging.
3. Run migration against staging.
4. Run smoke, integration, and key POS tests.
5. Manually approve production.
6. Run production migration job.
7. Deploy API and worker.
8. Deploy compatible POS and Back Office.
9. Watch health, logs, outbox age, queue failures, and database connections.
```

## 6. Suggested GitHub Actions Workflows

Create these files when ready:

```text
.github/workflows/ci.yml
.github/workflows/deploy-demo.yml
```

`ci.yml` should run on pull requests and pushes:

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

`deploy-demo.yml` should run only after CI passes on `main` and should keep database migration as one explicit job before application rollout.

## 7. Deployment Configuration By Service

### POS on Vercel

| Setting | Value |
|---|---|
| Project name | `bizentra-pos` |
| Root directory | `apps/pos` |
| Install command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build command | `cd ../.. && pnpm turbo run build --filter=@bizentra/pos` |
| Output | Next.js default |
| Environment | `NEXT_PUBLIC_API_URL=https://api-demo.<domain>/api/v1` |

### Back Office on Vercel

| Setting | Value |
|---|---|
| Project name | `bizentra-backoffice` |
| Root directory | `apps/backoffice` |
| Install command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build command | `cd ../.. && pnpm turbo run build --filter=@bizentra/backoffice` |
| Output | Next.js default |
| Environment | `NEXT_PUBLIC_API_URL=https://api-demo.<domain>/api/v1` |

### API on Render

| Setting | Value |
|---|---|
| Service type | Web service |
| Build command | `corepack enable && corepack prepare pnpm@10.28.1 --activate && pnpm install --frozen-lockfile && pnpm turbo run build --filter=@bizentra/api` |
| Start command | `pnpm --filter @bizentra/api start` |
| Health check path | `/api/v1/health/ready` |
| Required secrets | `DATABASE_URL`, `REDIS_URL`, OIDC values, allowed origins |

### Worker

| Setting | Value |
|---|---|
| Service type | Background worker or always-on Node service |
| Build command | `corepack enable && corepack prepare pnpm@10.28.1 --activate && pnpm install --frozen-lockfile && pnpm turbo run build --filter=@bizentra/worker` |
| Start command | `pnpm --filter @bizentra/worker start` |
| Required secrets | `DATABASE_URL`, `REDIS_URL`, worker provider secrets |

If a free host cannot keep the worker alive, do not fake worker correctness. Either run it locally for demos or move the worker to a small paid always-on instance.

## 8. Supabase Setup

### 8.1 Project setup

1. Create one Supabase project for `bizentra-demo`.
2. Use the region closest to the first users.
3. Create an application database role equivalent to local `bizentra_app`.
4. Keep a separate migration/admin credential.
5. Store credentials only in GitHub/Vercel/Render secrets.

### 8.2 Prisma connection setup

Use the pooled connection for runtime:

```text
DATABASE_URL=<Supabase pooled connection URL with a small connection_limit>
```

Use the direct connection only for migrations:

```text
MIGRATION_DATABASE_URL=<Supabase direct connection URL>
```

Run:

```powershell
pnpm db:migrate:deploy
pnpm db:generate
```

### 8.3 Backup policy

Supabase Free is not enough for important data. For demo data, export seed data and accept reset risk. For any real business data, upgrade to a paid database tier with backups, restore testing, and deletion protection.

## 9. Database and Queue Safety Gates

Before public demo:

- hosted migrations run cleanly from an empty database;
- smoke script passes against hosted API;
- API rejects cross-Business access;
- POS and Back Office use hosted API URL;
- CORS only allows approved frontend origins;
- no real secrets are committed;
- worker can process at least one queue job;
- Redis outage does not corrupt sales, stock, finance, or audit truth.

Before real production:

- OIDC replaces development headers;
- Supabase Free or expiring/free database tiers are removed from production;
- backups and restore exercises are documented;
- API and worker are always-on;
- queue backlog and failed jobs are monitored;
- database connection pool limits are tuned;
- Prisma migrations use expand-and-contract for risky changes;
- payment and stock reconciliation flows are tested;
- POS service worker/offline schema migration is tested across releases.

## 10. Recommended Phase Plan

### Phase A: Free hosted demo

Goal: prove external URLs, migrations, CI, and the basic app flow.

```text
Vercel POS
Vercel Back Office
Render API
Supabase Free PostgreSQL
Upstash Free Redis
GitHub Actions CI
```

Accept the limits: cold starts, small database, possible project pausing, no production reliability.

### Phase B: Stable pilot

Goal: let one friendly business test without risking production records.

```text
Paid PostgreSQL with backups
Always-on API
Always-on worker
Paid Redis/Key Value
OIDC login
Smoke tests after every deploy
Manual production approval
```

This is the minimum credible pilot for a POS platform.

### Phase C: First production

Goal: serve real business operations.

```text
Managed PostgreSQL with PITR
Always-on API/worker
Separate migration job
Object storage for files
Telemetry and alerts
Rollback/forward-fix runbook
Regular restore test
Payment and stock reconciliation
```

Do not add Kubernetes, microservices, or separate business-pack apps at this stage unless measured evidence requires them.

## 11. Current Decisions

| Decision | Answer |
|---|---|
| Can Bizentra use Supabase? | Yes, for PostgreSQL and possibly Auth/Storage, but runtime code should still go through the NestJS API. |
| Should frontends write directly to Supabase? | No. POS and Back Office must call the API so permissions, stock, finance, approvals, idempotency, and audit stay authoritative. |
| Can everything be free forever? | No, not for real production POS. Free is for demo/staging learning only. |
| Best immediate free stack | Vercel + Render + Supabase + Upstash + GitHub Actions. |
| Best first paid upgrade | Database and worker/API uptime first, then observability and backups. |

## 12. References Checked On 2026-08-28

- [Supabase pricing](https://supabase.com/pricing)
- [Supabase database connection docs](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Prisma docs](https://supabase.com/docs/guides/database/prisma)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel monorepo docs](https://vercel.com/docs/monorepos)
- [Turborepo on Vercel](https://vercel.com/docs/monorepos/turborepo)
- [Render free deployments](https://render.com/docs/free)
- [Render service types](https://render.com/docs/service-types)
- [Upstash Redis pricing](https://upstash.com/pricing/redis)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub Actions limits](https://docs.github.com/en/actions/reference/limits)
