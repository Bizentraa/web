# Bizentra Back Office Initial Deployment Guide

**Purpose:** deploy `bizentra-backoffice` after the API is live  
**Applies to:** `apps/backoffice` on Vercel, connected to `https://bizentra-api.onrender.com/api/v1`  
**Current demo API:** `https://bizentra-api.onrender.com`

---

## 1. Deployment Order

Deploy Back Office after the API is healthy:

```text
Supabase PostgreSQL: migrated
Render API: live
Vercel POS: optional but recommended first
Vercel Back Office: this guide
```

Back Office is the management app. Use it for setup, catalog, customers, suppliers, inventory, finance, appearance, access, reports, store reliability, and production-readiness screens.

## 2. Local Development Check

From the repository root:

```powershell
cd C:\projects\Thb\Bizentra
nvm use 24.19.0
corepack prepare pnpm@10.28.1 --activate
pnpm install
pnpm dev:backoffice
```

Open:

```text
http://localhost:3001
```

For a local full-stack check, also run the API:

```powershell
pnpm dev:api
```

Expected local API URL:

```text
http://localhost:4000/api/v1
```

## 3. Required Vercel Environment

Set this in the Vercel Back Office project:

```dotenv
NEXT_PUBLIC_API_URL=https://bizentra-api.onrender.com/api/v1
```

Do not add database URLs, migration URLs, or private secrets to Vercel Back Office. Browser-facing apps must only receive public-safe values.

## 4. Vercel Project Settings

Create a new Vercel project from the same GitHub repository:

| Setting | Value |
|---|---|
| Project name | `bizentra-backoffice` |
| Framework | Next.js |
| Root directory | `apps/backoffice` |
| Install command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build command | `cd ../.. && pnpm turbo run build --filter=@bizentra/backoffice` |
| Output directory | Next.js default |

Deploy from `main`.

## 5. API CORS Update

After Vercel gives the Back Office URL, update the Render API environment variable:

```dotenv
ALLOWED_WEB_ORIGINS=https://bizentra-pos.vercel.app,https://bizentra-backoffice.vercel.app
```

If Vercel gives different project URLs, use the exact URLs Vercel shows.

Then restart or redeploy the Render API.

## 6. API Demo Identity

For the current demo mode, Render API should already have:

```dotenv
AUTH_MODE=development
DEVELOPMENT_BUSINESS_ID=<demo-business-id>
DEVELOPMENT_USER_ID=<demo-owner-user-id>
PRISMA_TRANSACTION_TIMEOUT_MS=20000
```

The current verified demo values are:

```dotenv
DEVELOPMENT_BUSINESS_ID=bedeb522-2f0a-4ead-9477-cf3b33a41d7a
DEVELOPMENT_USER_ID=b7557b6e-4da1-4b11-8ac5-868a099992c4
```

Use throw-away demo data only while `AUTH_MODE=development` is enabled.

## 7. Post-Deploy Check

Open the deployed Back Office URL and check:

1. The dashboard loads.
2. The API health badge or loaded data does not show a connection error.
3. `/setup` can read the demo Business.
4. `/catalog` opens.
5. `/appearance` opens and can read theme settings.
6. Browser console has no CORS error.
7. Render API health remains:

```text
https://bizentra-api.onrender.com/api/v1/health/ready
```

Expected:

```json
{
  "status": "ok",
  "checks": {
    "database": "up"
  }
}
```

## 8. First Troubleshooting Checks

If Back Office cannot connect:

- confirm `NEXT_PUBLIC_API_URL` is exactly `https://bizentra-api.onrender.com/api/v1`;
- confirm Render has the Back Office URL in `ALLOWED_WEB_ORIGINS`;
- redeploy/restart Render after changing CORS;
- redeploy Vercel after changing `NEXT_PUBLIC_API_URL`;
- check `https://bizentra-api.onrender.com/api/v1/health/ready`;
- check browser console for the exact failing URL.

## 9. Production Upgrade Reminder

Before real users:

- replace `AUTH_MODE=development` with OIDC;
- rotate the exposed Supabase database password;
- move beyond free-tier reliability for API/database if stores depend on the app;
- keep Back Office and POS talking only to the API, not directly to Supabase tables.
