# Common Core P8 - Implementation Status

- **Started:** 2026-08-27
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **UI/UX plan:** [`01_COMMON_UIUX_DESIGN_SYSTEM.md`](../ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **Back Office production-readiness workspace:** <http://localhost:3001/production-readiness>

## Current Delivery Slice

P8 adds the first security, operations and production-readiness evidence foundation. It does not
replace infrastructure-level monitoring, backup tools or identity-provider controls. Instead, it
stores Business-visible evidence that production readiness can be reviewed and audited:

```text
Back Office production-readiness workspace
    -> API production-readiness controller
    -> Production Readiness service
    -> Business-scoped Prisma transaction
    -> PostgreSQL security event, backup run, readiness check, privacy request and release-readiness records
    -> Audit records + Business Events
```

The key business rule is evidence before go-live. A production release should not be treated as ready
unless tests, migrations, backup/restore, rollback and operational checks have visible evidence.

## Requirement Status

| Requirement | Status | Current evidence | Remaining P8 work |
|---|---|---|---|
| CC-P8-001 Security | Started | Security event records capture severity, subject, details and metadata for sensitive activity. | Add enforced transport/security headers, secret-vault integration and automated security scans. |
| CC-P8-002 Authentication | Not started | - | Add production OIDC/session/MFA policy integration and privileged-user MFA enforcement. |
| CC-P8-003 Audit Integrity | Started | P0 audit records exist; P8 overview counts audit records and security events. | Add database-level immutable audit protection in migration tests and broader critical-action audit assertions. |
| CC-P8-004 Backup | Implemented for current scope | Backup run records store scope, status, storage reference, size and failure reason. | Add scheduler integration and automatic failure alerts. |
| CC-P8-005 Disaster Recovery | Started | Backup run records include RPO/RTO fields and restore-tested evidence. | Add formal DR scenario tests and restore-run verification automation. |
| CC-P8-006 Observability | Started | Readiness checks can record observability status and measured values. | Add logs, metrics, traces and dashboard integration. |
| CC-P8-007 Performance | Started | Readiness checks can store performance targets and measured values. | Add automated load tests and POS response-time thresholds. |
| CC-P8-008 Scalability | Started | Readiness checks can track scalability checks without changing business logic. | Add volume tests for Businesses, Branches, transactions and stock records. |
| CC-P8-009 Privacy | Implemented for current scope | Privacy requests track requester, type, Customer link, due date, resolution and status. | Add data export/delete execution, retention policy enforcement and approval workflow. |
| CC-P8-010 Release | Implemented for current scope | Release readiness stores version, status, checklist, migration plan and rollback plan. | Add deployment pipeline gate, rollback automation and release approval workflow. |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-018 Auditor reviews sensitive changes | Partially implemented | Audit records, security events, readiness checks and release records are visible through P8 overview. Full auditor workflow and immutable audit tests remain pending. |

## API Surface

```http
GET   /api/v1/businesses/{businessId}/production-readiness/overview
POST  /api/v1/businesses/{businessId}/production-readiness/security-events
POST  /api/v1/businesses/{businessId}/production-readiness/backup-runs
POST  /api/v1/businesses/{businessId}/production-readiness/readiness-checks
POST  /api/v1/businesses/{businessId}/production-readiness/privacy-requests
PATCH /api/v1/businesses/{businessId}/production-readiness/privacy-requests/{privacyRequestId}
POST  /api/v1/businesses/{businessId}/production-readiness/releases
```

## Role and Permission Sync

P8 follows the additive sync rule:

- new P8 permission codes are part of the shared permission catalogue;
- Business Owner and Business Administrator receive P8 permissions automatically;
- the Security / Operations Admin template receives security, operations, privacy and release
  management permissions;
- Finance User and Auditor receive read visibility for readiness evidence;
- runtime sync updates existing Businesses without removing custom Role choices.

## Back Office UI/UX

The `/production-readiness` workspace follows the common UI/UX pattern:

- KPI cards for critical security events, failed backups, failed checks and open privacy requests;
- tabs for security, backup/DR, readiness checks, privacy and release readiness;
- responsive tables with internal scroll panels;
- quick-create forms for security events, backup evidence, readiness checks, privacy requests and
  release-readiness records;
- loading, permission, error and empty states through the shared `ResourceState` wrapper.

## Main Implementation Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260827100101_p7_p8_reporting_readiness/migration.sql`
- `packages/contracts/src/index.ts`
- `packages/api-client/src/index.ts`
- `packages/domains/business-access/src/application/production-readiness.service.ts`
- `packages/domains/business-access/src/domain/permissions.ts`
- `packages/domains/business-access/src/application/access-sync.ts`
- `apps/api/src/controllers/production-readiness.controller.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/composition/providers.ts`
- `apps/backoffice/src/app/production-readiness/page.tsx`
- `apps/backoffice/src/app/lib/workspace.tsx`
- `packages/design-system/src/index.tsx`
- `scripts/smoke-common-core.mjs`

## Verification

- Prisma schema formatted and client generated.
- Migration `20260827100101_p7_p8_reporting_readiness` applied locally with deploy mode.
- `pnpm --filter @bizentra/contracts build` passed.
- `pnpm --filter @bizentra/database build` passed.
- `pnpm --filter @bizentra/domain-business-access typecheck` passed.
- `pnpm --filter @bizentra/domain-business-access build` passed.
- `pnpm --filter @bizentra/api-client build` passed.
- `pnpm --filter @bizentra/api build` passed.
- `pnpm --filter @bizentra/backoffice typecheck` passed.

## Next P8 Slices

1. Production OIDC/session/MFA integration and privileged-user MFA controls.
2. Infrastructure backup scheduler integration and restore-test automation.
3. Logs, metrics, traces and alert dashboards.
4. Automated load tests and POS response-time thresholds.
5. Data export/delete execution and retention-policy enforcement.
6. Deployment pipeline gate, release approvals and rollback automation.
7. Database-level audit immutability tests for critical financial/stock actions.
