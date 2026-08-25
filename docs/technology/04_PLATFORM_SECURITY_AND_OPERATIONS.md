# Platform, Security, Delivery, and Operations Plan

**Decision:** Deploy containerized stateless applications on a managed container platform with managed PostgreSQL, Redis-compatible queue/cache, object storage, standards-based identity, and vendor-neutral telemetry.

## 1. Platform Principles

1. Prefer managed stateful services; do not make the product team operate databases, Redis clusters, or object storage without a strong reason.
2. Keep cloud-specific implementation behind infrastructure modules and application adapters.
3. Start with managed containers, not Kubernetes.
4. Separate environments and credentials; do not treat staging as a namespace inside production.
5. Make releases repeatable from source, lockfile, migration history, container digest, and infrastructure code.
6. Treat observability, restore, reconciliation, and rollback as product features.
7. Keep payment card data out of Bizentra through provider tokenization/certified terminals.

## 2. Environment Topology

| Environment | Purpose | Data policy |
|---|---|---|
| Local | Developer feedback and integration tests | Generated/seed data only |
| CI | Automated build/test/security checks | Ephemeral containers/databases |
| Development | Shared integration and demonstrations | Synthetic data |
| Staging | Production-like release, migration, load, and recovery validation | Synthetic or approved anonymized data |
| Production | Customer operations | Protected live data |
| Recovery test | Isolated backup restore and runbook validation | Access-controlled restored copy, destroyed after test |

Each environment has separate networks, identities, keys, databases, Redis, object-storage buckets, webhook secrets, payment provider accounts, and monitoring labels.

## 3. Production Components

| Component | Requirement |
|---|---|
| DNS/CDN/WAF | TLS, caching for static assets, DDoS/WAF controls, controlled origins, rate protection |
| Next.js POS | independently deployable; immutable image; POS-specific CSP and origin |
| Next.js Back Office | independently deployable; server/client rendering; BFF/session support |
| Core API | at least two instances for paid production tiers; health/readiness; autoscaling limits |
| Worker | separate deployments/queues by criticality; controlled concurrency and graceful shutdown |
| Realtime gateway | optional separate scaling for WebSocket/SSE connections |
| PostgreSQL | managed HA, PITR, encryption, direct and pooled endpoints, replicas when justified |
| Redis-compatible service | managed HA, TLS, authentication/ACLs, persistence appropriate for BullMQ |
| Object storage | encrypted, versioned/lifecycle-managed buckets, signed URLs, malware scanning path |
| Identity provider | OIDC, MFA/passkeys, federation, secure admin, backups/upgrades |
| Telemetry collector | OpenTelemetry ingest, sampling/redaction, backend export |
| Secret manager/KMS | application secrets, provider credentials, signing/encryption keys, rotation |

## 4. Why Kubernetes Is Not the Initial Default

Bizentra initially needs approximately four main workloads: POS web, Back Office web, API, and Worker. A managed container service can provide replicas, health checks, autoscaling, revisions, secrets, and networking with less operational burden.

Adopt Kubernetes only when measured needs include several of the following:

- many independently deployed services and worker pools;
- specialized scheduling or sidecars;
- multi-region/multi-cluster requirements;
- a platform team able to own cluster security and upgrades;
- portability requirements not met by managed containers;
- service-mesh or advanced traffic policy with a demonstrated use case;
- cost/scale analysis showing a clear advantage.

Kubernetes is a decision gate, not a measure of scalability.

## 5. Infrastructure as Code

Use OpenTofu/Terraform-compatible modules for:

- networks, private subnets, security groups/firewalls, NAT/egress controls;
- DNS, certificates, CDN, WAF, and rate policies;
- container registries, services, autoscaling, and deployment identities;
- PostgreSQL, pooler configuration, Redis-compatible service, and object storage;
- queues/topics if a cloud broker is later selected;
- secret manager/KMS keys and rotation permissions;
- logs, metrics, traces, alerts, dashboards, uptime checks, and budgets;
- backup policies and cross-region copies where required.

Rules:

- require reviewed plans before production apply;
- store remote state encrypted with locking;
- do not store secret values in the repository or plan artifacts;
- prohibit console-only production resources except emergency actions recorded and reconciled into code;
- use reusable modules but separate environment state;
- tag resources by product, environment, owner, data class, cost center, and criticality.

## 6. Identity and Authentication

### 6.1 Protocol

Use OpenID Connect Authorization Code flow with PKCE where appropriate. Do not build password storage, MFA, passkeys, recovery, federation, or token issuance from scratch.

### 6.2 Provider

Default cloud-neutral option: current stable Keycloak, operated as its own protected service. A managed OIDC provider is an acceptable substitution through an ADR if the team prefers lower operational burden.

The application must depend on OIDC standards rather than Keycloak-specific session internals.

### 6.3 Responsibility split

| Identity provider | Bizentra application |
|---|---|
| login, credentials, MFA, passkeys, recovery | Business membership |
| identity federation and SSO | Branch assignment |
| token/session issuance | roles, permissions, approval limits |
| suspicious login controls | feature-pack access |
| IdP administrative audit | business action audit |
| global subject identity | separation of duties and contextual authorization |

Do not put every Business/Branch permission into large long-lived tokens. Tokens establish identity and coarse claims; Bizentra evaluates current application authorization for sensitive work.

### 6.4 Sessions and service identity

- use short-lived access tokens;
- protect refresh/session tokens in secure server-managed storage/cookies where possible;
- rotate/revoke sessions after password/MFA/admin changes;
- require step-up authentication for highly sensitive support/admin operations where risk requires it;
- use workload identity or short-lived machine credentials for services;
- never share user tokens between jobs;
- audit impersonation/support access with reason, time limit, and visible evidence.

## 7. Authorization and Approval

Use application-owned Role-Based Access Control with contextual conditions:

```text
allow if
  User is an active member of Business
  AND User has access to Branch/Location
  AND Role grants operation
  AND record state permits operation
  AND amount/discount/refund is within limit
  AND required approval exists
  AND terminal/device policy permits it
```

Sensitive capabilities are separate permissions:

- view cost/margin;
- manual price override;
- discount beyond threshold;
- refund, void, exchange without receipt;
- stock adjustment and count approval;
- purchase-order and supplier-bill approval;
- cash drawer/no-sale and cash correction;
- customer credit and write-off;
- data export and integration credential management;
- support impersonation and cross-Business administration.

Approval is a recorded business object with requester, approver, policy version, reason, source record, decision, time, and expiry. A manager PIN alone is not sufficient evidence unless tied to a verified approver identity.

## 8. Application Security Baseline

Use OWASP ASVS 5.0 as the verification baseline and threat-model critical flows.

### Required controls

- TLS in transit and encryption at rest;
- strict input validation and output encoding;
- prepared/parameterized database access;
- secure cookies, CSRF protection where relevant, CSP, HSTS, and trusted origins;
- authorization at every server-side operation and object access;
- Business-isolation tests and non-owner database credentials;
- secrets only from a secret manager, never logs or source control;
- rate limits by IP, identity, Business, terminal, and operation risk;
- file size/type/content validation, direct signed uploads, and malware scanning;
- webhook signature verification, timestamp tolerance, replay protection, and deduplication;
- dependency scanning, SAST, container scanning, and SBOM generation;
- immutable audit events with protected access and retention;
- privacy-aware telemetry redaction;
- security incident runbooks and key/token rotation procedures.

### Data classification

| Class | Examples | Control summary |
|---|---|---|
| Public | marketing content | integrity and availability controls |
| Internal | non-sensitive configuration | authenticated access and normal audit |
| Confidential | customer contact, supplier price, employee data | least privilege, encryption, masking/export controls |
| Restricted | credentials, tokens, financial details, support impersonation evidence | KMS/secret manager, strict access, enhanced audit, no routine log exposure |
| Prohibited | raw card security code, unnecessary full PAN | never store or process in Bizentra |

## 9. Payment Security and PCI Scope

- Use a PCI-compliant payment provider's hosted fields, redirect, certified terminal, or tokenization approach.
- Bizentra stores provider tokens/references, masked display values, amount, currency, status, and reconciliation evidence—not raw PAN/CVV/track/PIN data.
- Browser and server logs must not capture payment form content or sensitive provider payloads.
- Verify all callbacks and deduplicate them by provider/event reference.
- Separate test and live credentials and limit provider dashboard access.
- Reconcile uncertain timeouts by querying the provider before retrying capture/refund.
- Document the exact payment integration because tokenization can reduce but does not automatically eliminate PCI scope.
- Complete the applicable PCI validation with a qualified specialist/provider guidance before production card acceptance.

## 10. Secrets and Cryptography

- use the platform secret manager and KMS/HSM-backed keys where available;
- grant each workload only the secrets it needs;
- rotate database, provider, webhook, session, and signing credentials;
- support overlapping signing keys during rotation;
- envelope-encrypt highly sensitive fields only when access requirements justify field encryption;
- never invent encryption algorithms or key derivation;
- redact secret values from deployment plans, error tracking, traces, and support exports;
- include secret scanning in pre-commit/CI and revoke leaked material rather than merely deleting it from Git.

## 11. Observability

### 11.1 Standard

Instrument Node.js services with OpenTelemetry. Node.js tracing and metrics support are stable; browser OpenTelemetry support remains experimental, so use a supported browser error/Web-Vitals solution and correlate it with backend trace IDs.

### 11.2 Correlation fields

Every applicable log/span/metric includes safe forms of:

- environment, service, version, region, instance;
- request ID, trace ID, correlation ID, causation ID;
- Business ID, Branch ID, terminal/device ID;
- user/service actor ID;
- operation, domain module, event/job type, attempt;
- outcome and stable error code.

Do not add customer names, emails, phone numbers, addresses, tokens, card details, free-text notes, or entire request bodies by default.

### 11.3 Telemetry types

| Type | Examples |
|---|---|
| Technical metrics | latency, rate, errors, saturation, CPU/memory, pool usage, Redis latency, queue depth |
| Database metrics | connections, locks, long queries, cache hit, replication lag, WAL, storage, autovacuum |
| Business-operation metrics | sale completion failures, payment uncertainty, outbox age, sync backlog, stock posting failures |
| Security signals | login/authorization failures, suspicious export/refund/override patterns, webhook signature failures |
| Release signals | version adoption, error regression, rollback, migration/backfill progress |

### 11.4 Initial SLOs

Targets must be approved against pricing and business risk.

| Service indicator | Initial target |
|---|---|
| Core online API availability | 99.9% monthly for paid production baseline |
| POS cached local interaction | independent of API availability for approved offline work |
| Core non-provider API latency | p95 under 500 ms for normal commands; operation-specific budgets preferred |
| Outbox dispatch delay | p95 under 30 seconds; critical backlog alert by age |
| Critical job success | 99.9% after permitted retries, with zero silent loss |
| Business data isolation | zero tolerated cross-Business disclosures |
| Restore objective | meet approved RPO/RTO in scheduled exercises |

## 12. Alerting and Runbooks

Alerts must be actionable and routed by severity.

Critical examples:

- sales/payment/stock posting failure rate over threshold;
- payment uncertainty or duplicate-reference conflict;
- Business isolation/security control failure;
- database unavailable, storage full, replica/PITR problem;
- outbox or critical queue age exceeds objective;
- offline sync rejection spike after release;
- backup failure or restore verification failure;
- authentication provider outage;
- certificate/key expiration risk.

Every alert links to a runbook containing impact, owners, dashboards, safe checks, mitigation, recovery, reconciliation, escalation, and closure evidence.

## 13. CI/CD Pipeline

Suggested GitHub Actions or equivalent stages:

```text
Pull request
  1. dependency install from frozen lockfile
  2. formatting/lint/type checks
  3. architecture boundary checks
  4. unit/component tests
  5. real PostgreSQL/Redis integration tests
  6. OpenAPI compatibility tests
  7. migration validation
  8. SAST/dependency/secret/license checks
  9. build Next.js/API/worker
 10. container and SBOM scan
 11. Playwright critical-path tests
 12. preview environment where useful

Main/release
 13. sign immutable images/artifacts
 14. deploy staging
 15. smoke, migration, performance, security, recovery checks
 16. approval for production
 17. deploy production canary/rolling revision
 18. run compatible migrations/backfills in controlled order
 19. observe business and technical health
 20. promote or rollback/forward-fix
```

### Release rules

- use immutable container digests;
- separate application deployment from irreversible cleanup migrations;
- preserve compatibility between current and previous POS/API versions;
- define health/readiness checks that verify dependencies appropriately without causing restart storms;
- drain API/worker work gracefully;
- stop canary rollout on SLO, business reconciliation, or security regression;
- record who approved, what changed, database migration IDs, image digests, and outcome.

## 14. Dependency and Version Management

- pin the Node.js major/minor policy and package-manager version;
- commit `pnpm-lock.yaml` and enforce frozen installs in CI;
- use Renovate or equivalent for scheduled updates and immediate security patches;
- group low-risk dependency updates but isolate framework/database/ORM/identity majors;
- test Next.js security releases promptly; the project should use the patched 16.3 release announced for 2026-08-26 once published;
- update PostgreSQL minor versions within the managed provider's safe window;
- do not adopt Prisma 8 RC for production; open an ADR after GA;
- maintain an SBOM and a supported-version inventory;
- remove end-of-life runtime/framework versions before support ends.

## 15. Testing and Security Gates

Production release requires:

- unit and integration pass;
- Business-isolation and authorization pass;
- migration expand/contract and rollback/forward-fix plan;
- critical Playwright workflows pass;
- offline upgrade/sync compatibility pass for POS releases;
- API backward compatibility pass;
- payment/provider sandbox scenarios pass when changed;
- performance budgets pass;
- no unresolved critical/high exploitable security finding without approved risk acceptance;
- container/SBOM signature and provenance available;
- dashboards and alerts updated for new critical operations;
- backup/restore impact reviewed.

## 16. Backup, DR, and Business Continuity

| Asset | Protection |
|---|---|
| PostgreSQL | HA standby, automated backups, PITR/WAL, restore tests, deletion protection |
| Redis/BullMQ | managed HA/persistence; jobs reconcilable from PostgreSQL outbox/source state |
| Object storage | versioning/lifecycle, encryption, replication/copy where required, inventory checks |
| Identity | provider backup/export/HA and break-glass procedure |
| Secrets/keys | managed durability, rotation, recovery procedure, restricted break-glass access |
| IaC/repository | protected branches, off-platform backup/mirror where business requires |
| Device pending commands | persistent IndexedDB, visible status, safe sync receipts, terminal recovery runbook |

Recovery order prioritizes identity/network, PostgreSQL, core API, POS connectivity, payment reconciliation, workers/outbox, Back Office, then reports/exports.

After recovery, reconcile:

- payments and refunds with providers;
- sales with stock movements and finance postings;
- outbox with event/job processing;
- offline terminal commands around the incident window;
- object-storage references and import/export states.

## 17. Cost and Capacity Controls

- tag every resource and report cost by environment/service;
- set budgets and anomaly alerts;
- cap autoscaling and queue concurrency to protect PostgreSQL/provider limits;
- define per-Business API, export, import, webhook, and report limits by plan;
- expire preview environments and temporary exports;
- use object lifecycle tiers for retained archives;
- review high-cardinality telemetry labels before production;
- load test before raising database size or adding services;
- perform quarterly capacity review using transaction, storage, queue, and Business growth.

## 18. Operations Definition of Done

- Infrastructure is reproducible from reviewed code.
- Production workloads use least-privilege identities and managed secrets.
- OIDC login, logout, token expiry, MFA, recovery, and revoked access are tested.
- Application authorization and Business isolation pass independently of UI behavior.
- Payment integration keeps prohibited card data out of Bizentra and has reconciliation runbooks.
- Applications, queues, database, offline sync, and critical business operations are observable.
- Alerts are actionable and tested through exercises.
- Images are immutable, scanned, signed, and traceable to source.
- Database migrations and application rollout are compatible and reversible/forward-fixable.
- Backup and restore meet approved objectives in a real exercise.
- Redis loss does not lose authoritative business records.
- On-call/support ownership and incident severity/escalation are documented.

## 19. References

- [OpenID Connect specifications](https://openid.net/developers/specs/)
- [Keycloak documentation](https://www.keycloak.org/documentation)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [PCI Security Standards Council](https://www.pcisecuritystandards.org/)
- [Next.js Content Security Policy guidance](https://nextjs.org/docs/app/guides/content-security-policy)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [PostgreSQL high availability and standby guidance](https://www.postgresql.org/docs/18/warm-standby.html)
- [PostgreSQL continuous archiving and PITR](https://www.postgresql.org/docs/18/continuous-archiving.html)

