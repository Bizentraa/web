# Bizentra Local Development Setup

**Purpose:** run the Common Core P0, P1 and P2 development slices on Windows  
**Architecture source:** [`07_TECHNICAL_ARCHITECTURE_MERMAID_DIAGRAMS.md`](../technology/07_TECHNICAL_ARCHITECTURE_MERMAID_DIAGRAMS.md)  
**Requirements source:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)

## 1. What Is Already Installed on This Development Machine

| Tool | Selected version | Why it is used |
|---|---:|---|
| Node.js | 24.19.0 LTS | Runs Next.js, NestJS, build tools and workers |
| pnpm | 10.28.1 | Installs one consistent monorepo dependency graph |
| Git | 2.52.0 | Source control |
| Docker Desktop | 29.4.2 | Runs PostgreSQL and Redis locally |
| Docker Compose | 5.1.3 | Starts the local services together |

Node 24.19.0 was installed through NVM for Windows. Docker Desktop is installed but its engine must be running before `pnpm infra:up` can work.

## 2. Required Software

You do **not** need to install PostgreSQL or Redis directly on Windows. Docker runs isolated local copies.

Local PostgreSQL uses two accounts: `bizentra_admin` owns migrations, while the API uses the non-superuser `bizentra_app` role. This separation is required for PostgreSQL row-level Business isolation to be testable; the API must never run as the database superuser.

Required:

1. NVM for Windows and Node.js 24 LTS.
2. pnpm 10 through Corepack.
3. Docker Desktop with Linux containers enabled.
4. Git.

Useful but optional:

- Visual Studio Code or another TypeScript editor;
- an API tool such as Bruno or Postman;
- DBeaver or Prisma Studio for viewing local development data.

Keycloak or another OIDC provider is **not required for this first local slice**. Local development uses an explicit development identity adapter. OIDC must replace it before any shared or production environment is used.

## 3. First-Time Setup

Open PowerShell in the repository root:

```powershell
cd C:\projects\Thb\Bizentra
nvm use 24.19.0
corepack prepare pnpm@10.28.1 --activate
Copy-Item .env.example .env
pnpm install
```

The repository already contains a local `.env`. Copying `.env.example` is needed only on another computer or after deliberately removing the local file.

Start Docker Desktop from the Windows Start menu. Wait until it reports that the engine is running. Then run:

```powershell
pnpm infra:up
pnpm db:generate
pnpm db:migrate:deploy
```

## 4. Start the Platform

Run every deployable in one terminal:

```powershell
pnpm dev
```

Or run them separately while debugging:

```powershell
pnpm dev:api
pnpm dev:worker
pnpm dev:backoffice
pnpm dev:pos
```

| Application | Local address | Meaning |
|---|---|---|
| POS | <http://localhost:3000> | Store-facing deployable; sales arrive in P2 |
| Back Office | <http://localhost:3001> | Business setup and management deployable |
| Appearance settings | <http://localhost:3001/appearance> | Business theme, brand colours and display modes |
| Master data | <http://localhost:3001/catalog> | P1 catalog defaults, items, prices, customers and suppliers |
| API | <http://localhost:4000/api/v1/health/ready> | Business rules and database access |
| API documentation | <http://localhost:4000/api/docs> | Interactive OpenAPI documentation |
| Worker | no browser address | Background BullMQ process using Redis |

## 5. Create the First P0 Business

With the API running, use PowerShell:

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
    externalSubject = "local-owner-001"
    email = "owner@example.test"
    displayName = "Demo Owner"
  }
} | ConvertTo-Json -Depth 6

$created = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:4000/api/v1/setup/business-foundation `
  -ContentType "application/json" `
  -Body $body

$created
```

The response contains `businessId` and `ownerUserId`. Use them as the local development identity:

```powershell
$headers = @{
  "x-business-id" = $created.businessId
  "x-user-id" = $created.ownerUserId
}

Invoke-RestMethod `
  -Uri "http://localhost:4000/api/v1/businesses/$($created.businessId)/foundation" `
  -Headers $headers
```

This is only a local adapter. A real user must later authenticate with OIDC; the server will derive the user identity from a verified token instead of trusting headers.

To let both web applications load that Business automatically during local development, add the returned IDs to the ignored root `.env`:

```dotenv
DEVELOPMENT_BUSINESS_ID=<businessId>
DEVELOPMENT_USER_ID=<ownerUserId>
```

Restart POS and Back Office after changing these values. Open <http://localhost:3001/appearance> to select from the controlled industry presets. The saved Business theme is shared through PostgreSQL; each browser origin keeps its own local cache for fast, flash-free startup.

Open <http://localhost:3001/catalog> to start P1 master data. Use **Initialize P1 defaults** first, then create the first item, customer and supplier for the active Business.

## 6. Quality Checks

Before committing a change:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Or run the combined command:

```powershell
pnpm check
```

## 7. Stop or Reset Local Services

Stop containers without removing the saved database/Redis data:

```powershell
pnpm infra:down
```

To view service state or logs:

```powershell
pnpm infra:status
pnpm infra:logs
```

Removing Docker volumes deletes local development data. Do that only when a deliberate clean database is required.

## 8. Common Problems

### Docker API or named-pipe error

Docker Desktop is installed but its engine is not running. Start Docker Desktop and wait for it to become ready.

### Wrong Node version

```powershell
nvm use 24.19.0
node --version
```

The result must start with `v24`.

### Port already in use

The default ports are `3000`, `3001`, `4000`, `5432` and `6379`. Stop the conflicting local program, or change both `.env` and the related Compose/application port.

### Prisma cannot reach PostgreSQL

Run `pnpm infra:status`. PostgreSQL must be healthy before migrations or API startup.

### Back Office says the API needs attention

Start PostgreSQL, apply migrations, and start the API. Then refresh <http://localhost:3001>.

## 9. Deployment Meaning

The monorepo is one repository, but it produces four separate deployables:

```text
apps/pos         -> POS web deployment
apps/backoffice  -> Back Office web deployment
apps/api         -> API container
apps/worker      -> Worker container
```

The packages are compiled into those applications; they are not deployed as separate services. PostgreSQL and Redis are local Docker services during development and managed services in staging/production.

## 9. End-to-End Smoke Run

After the infrastructure, migrations and API are running, one command exercises the whole Common
Core from Business setup to a returned sale:

```powershell
node scripts/smoke-common-core.mjs
```

It creates a throw-away Business each time it runs and checks, among other things, that:

- a cashier is denied a screen they do not have permission for;
- a large discount is refused until an approval request is granted by a different user;
- a register cannot open two shifts at once;
- retrying the same idempotency key returns the same sale instead of creating a second one;
- a retried payment does not charge twice;
- a receipt number is allocated only when the sale is fully paid;
- a partial return refunds the exact proportional share including its tax;
- store credit issued by a refund can be spent on a later sale;
- a shift cannot close on a cash difference without a reason;
- a user from another Business is refused.

The run prints one line per check and exits non-zero if anything fails. Use it before and after any
change to the domain services.

## 10. Applying the Latest Migration

The `20260826090000_p0_approvals_p1_import_p2_commerce` migration adds approval requests, the import
apply/rollback lifecycle and every P2 commerce table, with row-level security and the new
permissions. Apply it the same way as the earlier ones:

```powershell
pnpm db:migrate:deploy
pnpm db:generate
```

Existing Businesses keep working: the migration grants the new permissions to their Owner Role, and
new feature definitions and Role templates are created the first time each screen is opened.
