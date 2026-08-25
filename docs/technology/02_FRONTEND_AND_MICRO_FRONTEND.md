# Frontend, Offline POS, and Micro-Frontend Plan

**Decision:** Use two primary Next.js applications in one monorepo: POS and Back Office. Share contracts and UI foundations at build time. Do not use runtime Module Federation.

## 1. Frontend Applications

### 1.1 POS application

The POS is a dedicated application because it has materially different requirements:

- fast scanner/keyboard/touch interaction;
- offline-approved sales and a visible synchronization queue;
- local catalog/pricing data;
- receipt printers, scanners, scales, drawers, and payment terminals;
- shift and terminal identity;
- very small blast radius for releases;
- minimal non-POS code in the downloaded bundle.

Recommended origin: `https://pos.<domain>`.

A separate origin gives the POS its own service-worker scope, Cache Storage, IndexedDB quota, cookies, Content Security Policy, and deployment lifecycle.

### 1.2 Back Office application

The Back Office includes:

- Business, Branch, Location, user, and permission administration;
- catalog, variants, barcodes, pricing, promotions, and tax;
- inventory, purchasing, receiving, transfers, counts, and replenishment;
- customers, loyalty, finance, reports, imports, exports, and integrations;
- business-pack configuration and operations.

Recommended origin: `https://app.<domain>`.

### 1.3 Later operational applications

Create another deployable only when the user experience and release pattern are distinct, for example:

- `ops.<domain>` for KDS, service bays, dispatch, or warehouse execution;
- a public commerce/customer application;
- an internal support console with elevated controls.

Do not create one application per business pack. Grocery, Fashion, Restaurant, Garage, and other packs are feature modules/configurations within the appropriate user application.

## 2. Frontend Technology Stack

| Area | Default choice | Why it fits Bizentra |
|---|---|---|
| Framework | Next.js 16 Active LTS, App Router | Supported React architecture, routing, server/client composition, code splitting, and production tooling. |
| UI runtime | React version supported by the selected Next.js release | Strong ecosystem and appropriate for interactive POS/back-office screens. |
| Language | TypeScript strict mode | Shared types, safer refactoring, and contract generation. |
| Styling | Tailwind CSS + CSS variables/tokens | Fast consistent development while keeping Business themes controlled through tokens. |
| Accessible primitives | Radix UI or equivalent headless primitives | Keyboard, focus, dialogs, menus, and screen-reader foundations without locking Bizentra to a visual theme. |
| Component workshop | Storybook | Isolated states, accessibility checks, visual regression, and shared component documentation. |
| Server state | TanStack Query for client-driven screens | Caching, invalidation, retry control, optimistic UI, and polling where appropriate. |
| Local UI state | React state; Zustand only for cross-screen interactive state | Avoids a global state store for server data while supporting POS workflow state. |
| Forms | React Hook Form + Zod | Performant forms and shared client/server validation schemas. |
| Data tables | TanStack Table with virtualized rows when needed | Flexible business grids without shipping a second domain model. |
| Charts | Apache ECharts or a similarly capable chart layer | Large KPI/report variety, accessible summaries, and export-ready visuals. |
| Offline database | Dexie over IndexedDB | Structured, transactional local storage and manageable schema upgrades. |
| Service worker | A maintained Next.js-compatible service-worker tool, selected by spike | Asset/catalog caching and update control; background sync remains supplemental. |
| Internationalization | `next-intl` or equivalent with ICU messages | Locale, plural, date, number, currency, and translation support. |
| Error tracking | Sentry-compatible browser monitoring | Source-mapped errors, release correlation, sessions, and Web Vitals. |
| E2E tests | Playwright | Multi-browser, multi-tab, offline/network, file, and device-like workflow testing. |
| Component tests | Vitest + Testing Library | Fast behavior-focused tests. |
| Accessibility | axe-core + keyboard/manual checks | Automated regression plus human verification for critical flows. |

Exact package versions are pinned when the workspace is bootstrapped. Do not write permanent architecture around an unpinned `latest` dependency.

## 3. Next.js Composition Rules

### Back Office

- Use Server Components for read-oriented pages where server rendering and streaming are beneficial.
- Use Client Components only at interactive boundaries such as forms, data grids, scanners, drag/drop, charts, and live operations.
- Fetch from the core API through a server-side application client; do not duplicate business decisions in Server Actions.
- Use Route Handlers for BFF concerns such as secure cookies, frontend-specific aggregation, upload initialization, and proxying.
- Do not call a Route Handler from a Server Component; call the application client directly to avoid the extra HTTP round trip described by Next.js guidance.
- Treat every Server Action as a public mutation endpoint: authenticate, authorize, validate, rate-limit where necessary, and call an application use case.

### POS

- Use Client Components for the sale workspace because it requires browser APIs, local state, IndexedDB, scanners, and offline behavior.
- Keep the server-rendered shell small and stable.
- Load only the approved Branch catalog and policy subset required for the terminal.
- Keep cart interaction independent from reporting, recommendation, or other noncritical network calls.
- Never depend on Next.js cache revalidation for payment, stock, shift, or financial correctness.

## 4. Feature-Oriented Frontend Structure

```text
apps/pos/src/
  app/                         # routes, layouts, error/loading boundaries
  features/
    sale/
    payment/
    return/
    shift/
    customer/
    offline-sync/
    device/
  entities/                    # UI representations, not domain ownership
  widgets/                     # composed sale screen, totals panel, sync banner
  shared/                      # app-local utilities only

apps/backoffice/src/
  app/
  features/
    business-settings/
    catalog/
    pricing/
    inventory/
    purchasing/
    finance/
    crm/
    reports/
    integrations/
  widgets/
  shared/
```

Shared workspace packages:

```text
packages/design-system
packages/api-client
packages/contracts
packages/auth
packages/money
packages/offline
packages/observability
```

Feature code imports the generated API client and contract schemas. It does not import Prisma models or backend repository types.

## 5. Design System Rules

The design system owns:

- semantic tokens for color, typography, spacing, elevation, borders, motion, and density;
- accessible primitives and composed controls;
- form fields, validation messages, confirmation dialogs, tables, filters, empty/error/loading states;
- POS-specific large-touch and compact-keyboard density modes;
- standard money, quantity, date/time, tax, and status presentation;
- Business branding within controlled token slots;
- dark/light/high-contrast behavior if supported;
- Storybook documentation and visual regression baselines.

It does not own business rules, API calls, permissions, or page workflows.

### Accessibility baseline

- target WCAG 2.2 AA for web applications;
- complete checkout and manager approval using keyboard only;
- maintain visible focus and logical focus restoration after dialogs;
- provide text/icon/shape state, not color alone;
- announce scan/payment/sync errors through accessible live regions;
- support zoom and reflow for Back Office screens;
- provide readable alternatives for charts and KPI colors.

## 6. State Ownership

| State | Owner | Examples |
|---|---|---|
| Authoritative business state | Core API/PostgreSQL | sale, payment, stock movement, invoice, customer balance |
| Cached server state | TanStack Query / Next.js data cache | product list, report result, supplier details |
| Local workflow state | component/Zustand | selected tab, open drawer, current unsent cart |
| Durable offline state | IndexedDB/Dexie | catalog snapshot, terminal policy, pending commands, sync receipts |
| Identity session | OIDC/BFF secure cookie | user session and token handling |

Do not copy server state into a global frontend store without a documented offline or workflow reason.

## 7. Offline POS Architecture

Offline support is a controlled business capability, not a general promise that every screen works without the internet.

### 7.1 Local stores

Suggested IndexedDB stores:

| Store | Content |
|---|---|
| `catalog_items` | approved Branch item/variant, barcode, tax/pricing inputs, active state, version |
| `customers_limited` | only the minimum permitted cached customer fields |
| `terminal_policy` | offline limits, allowed tenders, receipt rules, last policy version |
| `shift` | current terminal shift identifier and safe local status |
| `draft_carts` | held and active carts |
| `pending_commands` | immutable locally generated commands waiting for server acceptance |
| `sync_receipts` | authoritative accepted/rejected/conflict responses |
| `device_state` | terminal ID, schema version, last sync checkpoint, update status |

Request persistent storage through the Storage Manager API where supported, but assume a user/browser can still clear local data. Never make local storage the only copy after a command is accepted by the server.

### 7.2 Command envelope

Every offline-capable command contains:

```text
command_id             # application-generated UUIDv7/ULID
idempotency_key
command_type
contract_version
business_id
branch_id
terminal_id
device_id
user_id
shift_id
created_at_device
last_known_server_time
base_entity_version
catalog_policy_version
payload
payload_hash
```

The authenticated server independently verifies Business, Branch, User, terminal, and policy. Client fields are evidence, not authority.

### 7.3 Sync state machine

```text
DRAFT
  -> QUEUED
  -> SENDING
  -> ACCEPTED
     or REJECTED
     or CONFLICT_REVIEW
     or RETRYABLE_FAILURE
```

Rules:

- one `command_id` can produce one authoritative command result;
- reconnecting or refreshing can resend safely;
- commands are sent in dependency order, but one invalid command does not silently discard later commands;
- the server returns an authoritative result and resulting entity versions;
- accepted commands remain locally until the receipt is durably stored;
- retry uses bounded exponential backoff with jitter;
- the UI shows pending count, last success time, rejected items, and required manager action;
- foreground/application-start sync is mandatory because browser background sync support and scheduling are not reliable enough to own correctness.

### 7.4 Conflict policy

Never use generic last-write-wins for money, stock, shifts, or approvals.

| Conflict | Default behavior |
|---|---|
| Same command uploaded twice | Return original result. |
| Item deactivated after local snapshot | Reject line/sale according to offline policy and require review. |
| Price changed | Apply the signed/snapshotted offline rule if still permitted; otherwise require manager resolution. |
| Stock sold elsewhere | Server applies configured negative-stock/backorder rule; record an exception. |
| Shift closed on server | Reject or route to manager reconciliation; never attach silently to another shift. |
| User/terminal revoked | Reject all new commands and lock the terminal after safe evidence capture. |
| Loyalty/customer balance changed | Recalculate on server; do not allow an offline cached balance to create unauthorized value. |
| Card/QR unavailable offline | Block unless the payment provider explicitly supports safe offline authorization. |

## 8. Device and Hardware Strategy

Use a layered adapter design:

```text
POS feature
  -> DevicePort
      -> keyboard-wedge scanner adapter
      -> WebUSB/WebSerial adapter when supported
      -> vendor browser SDK adapter
      -> local device-bridge adapter
      -> simulated test adapter
```

### Device choices

| Device | Preferred path | Fallback |
|---|---|---|
| Barcode scanner | Keyboard-wedge input | WebUSB/vendor SDK |
| Receipt printer | Vendor/browser print SDK | Local bridge / OS print with controlled template |
| Label printer | Vendor SDK or print service | Generated PDF only for noncritical use |
| Cash drawer | Printer/device bridge command | Never arbitrary browser JS |
| Scale | Vendor SDK/WebSerial/local bridge | Manual authorized entry with audit where allowed |
| Payment terminal | Provider's certified terminal SDK/API | No raw card data through Bizentra |
| Customer display | Secondary window/local channel | Dedicated display endpoint |

The local device bridge, if required, must use signed releases, local authentication, an allowlist of origins, version reporting, audit logs, and automatic update policy.

## 9. Micro-Frontend Decision

### 9.1 Baseline: no runtime micro-frontend composition

Bizentra gets the useful properties early through:

- separate POS and Back Office deployments;
- shared packages with semantic version/contract checks;
- feature-oriented ownership;
- independent test and release pipelines;
- route-level code splitting;
- no runtime remote component loading.

### 9.2 Why Module Federation is rejected

- the current Module Federation Next.js integration states that Next.js support is ending;
- App Router, React Server Components, caching, and runtime sharing make version compatibility difficult;
- POS reliability should not depend on remote UI availability;
- shared authentication, navigation, state, and styling become runtime coupling points;
- tracing and reproducing cross-app failures becomes harder;
- it adds infrastructure before multiple autonomous frontend teams exist.

### 9.3 When to use Next.js Multi-Zones

Next.js officially supports Multi-Zones for separate applications serving different path groups on one domain. Consider it only when all conditions are true:

- at least two stable, unrelated route groups exist;
- separate teams own them;
- teams need independent deployment schedules;
- navigation between zones can be a full page load where required;
- shared UI/contracts are versioned packages rather than source imports;
- a gateway/rewrites layer has clear ownership;
- cross-zone Server Actions and asset routing have been tested;
- observability can identify the active zone and version.

Good later candidates might be `/reports`, `/integrations`, or a support console. A checkout screen split into remote cart, payment, customer, and inventory micro-frontends is not approved.

## 10. Frontend Performance Budgets

Initial targets are release gates and must be validated on representative store hardware and networks.

| Measure | Initial target |
|---|---|
| Cached barcode-to-cart feedback | p95 under 100 ms on target terminal |
| Local cart quantity/total update | p95 under 100 ms |
| Online command API feedback | p95 under 500 ms excluding external payment time |
| POS startup with warm cache | usable under 2 seconds on target hardware |
| POS JavaScript | enforce route/app budgets; fail CI on unexplained material regression |
| Long Back Office list | virtualize/paginate; no unbounded browser data load |
| Interaction accessibility | no serious/critical automated accessibility violations in critical paths |

The POS shall remain usable when analytics, recommendations, notifications, or reports are slow.

## 11. Frontend Security

- use secure, HttpOnly, SameSite cookies for web sessions where architecture permits;
- never store long-lived refresh tokens in `localStorage`;
- implement a strict Content Security Policy and restrict third-party scripts;
- validate and authorize every mutation on the server, including Server Actions;
- minimize cached PII and apply device/session expiration;
- display permissions for usability but enforce them in the API;
- redact secrets, tokens, PAN, and sensitive customer data from browser logs and error reports;
- protect POS against unauthorized terminal registration and cloned device identities;
- sign update artifacts for any local device bridge;
- use provider-hosted/tokenized payment collection to keep card data out of Bizentra.

## 12. Frontend Test Matrix

| Test type | Required coverage |
|---|---|
| Unit | calculations for display, reducers/state machines, mapping, validation |
| Component | form errors, permissions, keyboard use, scanner input, loading/error/empty states |
| Contract | generated API client against API schema and representative error responses |
| E2E online | sale, payment, return, receiving, transfer, finance, approvals, reports |
| E2E offline | disconnect, queue, restart, reconnect, duplicate upload, rejection, conflict review |
| Multi-tab | shift/cart ownership and IndexedDB coordination |
| Upgrade | service worker and IndexedDB schema migration with pending commands |
| Device | approved scanner/printer/scale/drawer/terminal combinations |
| Accessibility | automated checks plus keyboard/screen-reader review of critical flows |
| Performance | cold/warm start, scanning burst, large catalog, slow network, long shift |
| Security | session expiry, CSP, Business switch, revoked user/device, unsafe file/content input |

## 13. Frontend Definition of Done

- POS and Back Office are separate applications with explicit ownership.
- Every frontend package has public entry points and no cross-app source imports.
- Critical mutations use the versioned API and idempotency contract.
- Offline data schema, upgrade, retry, reconciliation, and conflict behavior are tested.
- A failed remote dependency cannot corrupt or silently lose a queued command.
- Hardware is accessed only through approved adapters.
- Component states are documented in Storybook and critical visual states have regression coverage.
- Accessibility and performance budgets pass on representative devices.
- Business permissions and sensitive data rules are verified at the API, not trusted to UI hiding.
- No runtime Module Federation dependency exists.

## 14. References

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js production guidance](https://nextjs.org/docs/app/guides/production-checklist)
- [Next.js Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones)
- [Module Federation Next.js integration status](https://module-federation.io/integrations/framework/nextjs/)
- [Dexie documentation](https://dexie.org/docs)
- [Web.dev offline data guidance](https://web.dev/learn/pwa/offline-data)

