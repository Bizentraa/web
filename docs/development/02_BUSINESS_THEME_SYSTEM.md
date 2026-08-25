# Business Theme System

**Implemented:** 2026-08-26
**Scope:** Common Core Business appearance shared by Back Office and POS

## 1. Outcome

Bizentra uses one design system and 30 controlled industry presets. A Business Owner can select a preset, choose the Business default display mode, allow or prevent per-device changes, and optionally set primary/accent brand colours.

The Business selection is saved in PostgreSQL. Browser storage is only a validated performance cache; it is never the source of truth.

```text
PostgreSQL Business Theme (source of truth)
               |
               v
      Permission-checked API
               |
       +-------+-------+
       |               |
       v               v
  Back Office         POS
  origin cache    origin cache
       |               |
       +-------+-------+
               |
        shared CSS tokens
```

POS and Back Office use different ports/domains, so browser security intentionally gives them separate local-storage areas. Both independently refresh from the same Business record and therefore converge on the same saved theme.

## 2. Priority Rules

The final appearance follows this order:

1. Common neutral foundation and fixed semantic status colours.
2. Selected business-type preset.
3. Optional Business primary/accent brand override.
4. Allowed device preference: Business default, light, dark or system.

Semantic colours never change between industries:

- green: success;
- amber: warning;
- red: danger/error;
- blue: information;
- violet: pending.

This prevents a Restaurant brand colour, for example, from changing the meaning of a dangerous action.

## 3. Data Model

`business_themes` is a one-to-one Business-scoped table containing:

| Field | Meaning |
|---|---|
| `businessId` | Business owner and primary key |
| `preset` | One of the 30 controlled industry presets |
| `defaultMode` | `LIGHT`, `DARK` or `SYSTEM` |
| `allowUserModeChange` | Whether a device may override the default |
| `brandPrimary` | Optional validated `#RRGGBB` override |
| `brandAccent` | Optional validated `#RRGGBB` override |
| `revision` | Optimistic concurrency version |
| `createdAt`, `updatedAt` | Change timestamps |

Database check constraints protect revisions and colour formats. Forced PostgreSQL row-level security uses `app.current_business_id`, exactly like the rest of the P0 Business data.

## 4. API

```http
GET /api/v1/businesses/{businessId}/theme
PUT /api/v1/businesses/{businessId}/theme
```

- Reading requires `BUSINESS_VIEW`.
- Updating requires `BUSINESS_UPDATE`.
- The request includes `expectedRevision`.
- A concurrent stale update returns `409 CONFLICT` instead of silently overwriting another owner's choice.
- A successful update creates a `BusinessTheme` audit event and a `BusinessThemeUpdated` outbox event in the same transaction.

## 5. Browser Cache

The theme runtime stores only validated theme settings and resolved CSS tokens. Cache keys are versioned and Business-specific.

On document load:

1. A `beforeInteractive` script reads the last active cache.
2. Only known `--color-*` properties with six-digit hexadecimal values are applied.
3. React starts with those colours already visible, preventing a default-theme flash.
4. The provider reads the active Business identity.
5. It refreshes the theme from the API.
6. A newer database revision replaces the local cache and CSS tokens.

If the API is temporarily unavailable, the last valid cache remains visible and the screen reports that it is using cached data.

## 6. Local Development Identity

OIDC is not connected in P0. Local development uses these ignored root `.env` values:

```dotenv
AUTH_MODE=development
DEVELOPMENT_BUSINESS_ID=<Business UUID>
DEVELOPMENT_USER_ID=<Owner user UUID>
```

The root development commands load this file before starting individual apps. Production must obtain Business/User context from a verified OIDC session and must not trust development headers or browser identity values.

## 7. Main Implementation Files

- `packages/themes/src/index.ts`: preset definitions, validation, token resolution and cache contract.
- `packages/design-system/src/theme.tsx`: theme provider, API refresh state and device-mode cache.
- `packages/database/prisma/schema.prisma`: persisted Business theme model.
- `packages/domains/business-access/src/application/business-access.service.ts`: permission, audit, outbox and concurrency logic.
- `apps/backoffice/src/app/appearance`: Business Owner settings UI.
- `apps/pos/src/app/theme-status-card.tsx`: POS theme confirmation.

## 8. Deployment Behavior

The Business theme table is deployed through the normal Prisma migration pipeline. Every frontend deployment contains the same preset/token engine. Managed PostgreSQL remains the shared source of truth.

When applications are hosted on different domains, each domain maintains its own cache. No attempt should be made to bypass browser origin isolation. Synchronization occurs through the API and database.
