# POS SaaS — Markdown SRS File Set

This folder converts the product architecture into **separate development-ready Markdown SRS files**.

## Naming approach

Use simple business language:
- **Business** = one customer company using the SaaS.
- **Branch** = one store/outlet/workshop/restaurant/site.
- **Location** = a stock/work place inside a Branch or operation.
- Avoid using “tenant” in user-facing requirements. The implementation can still use multi-tenant architecture internally.

## How to use these files

1. Start with `01_COMMON_CORE_SRS.md`.
2. Build and test Common Core phases P0 → P8.
3. Start the first business pack: **Grocery / Supermarket**.
4. For each later business type, reuse stable Common Core and previously built shared capabilities.
5. Never copy a shared engine into a vertical.
6. Track requirements by ID in your issue tracker.
7. Track user stories by Story ID and connect them to tests/UAT.
8. Treat the business-specific files as extensions of the Common Core, not independent products.

## Recommended Development Order

| File order | Business / Scope | Family | Dependency note |
| --- | --- | --- | --- |
| 01 | Common Core | Build once for every Business | Must begin first |
| 02 | Grocery / Supermarket | Retail & Food Stock | After required Common Core capabilities |
| 03 | General Retail | Retail | After required Common Core capabilities |
| 04 | Fashion / Footwear | Retail | After required Common Core capabilities |
| 05 | Electronics / Mobile | Retail + Traceability | After required Common Core capabilities |
| 06 | Hardware / Building Materials | Retail + B2B | After required Common Core capabilities |
| 07 | Bookstore / Stationery | Retail | After required Common Core capabilities |
| 08 | Cosmetics / Beauty Retail | Retail | After required Common Core capabilities |
| 09 | Furniture / Homeware | Retail + Fulfillment | After required Common Core capabilities |
| 10 | Jewelry | Retail + Traceability + Service | After required Common Core capabilities |
| 11 | Auto Parts | Retail + B2B | After required Common Core capabilities |
| 12 | Restaurant | Food & Hospitality | After required Common Core capabilities |
| 13 | Cafe / QSR | Food & Hospitality | After required Common Core capabilities |
| 14 | Bakery | Food + Production | After required Common Core capabilities |
| 15 | Food Truck / Mobile Food | Food & Mobile | After required Common Core capabilities |
| 16 | Bar / Pub | Food & Hospitality | After required Common Core capabilities |
| 17 | Hotel Revenue Centers | Hospitality Integration | After required Common Core capabilities |
| 18 | Salon / Spa / Barber | Service | After required Common Core capabilities |
| 19 | Garage / Auto Repair | Service + Asset | After required Common Core capabilities |
| 20 | Electronics / Computer Repair | Service + Traceability | After required Common Core capabilities |
| 21 | Laundry / Dry Cleaning | Service | After required Common Core capabilities |
| 22 | Tailoring / Alterations | Service | After required Common Core capabilities |
| 23 | Field / Home Services | Service + Mobile | After required Common Core capabilities |
| 24 | Wholesale / Distribution | Trade & Distribution | After required Common Core capabilities |
| 25 | Van Sales | Trade & Distribution | After required Common Core capabilities |
| 26 | Rental / Hire | Asset & Booking | After required Common Core capabilities |
| 27 | B2B Trade Counter | Trade | After required Common Core capabilities |
| 28 | Pharmacy | Regulated Retail | After required Common Core capabilities |
| 29 | Fuel / Convenience | Retail + Hardware Integration | After required Common Core capabilities |
| 30 | Hotel / PMS-Heavy Operations | Hospitality Integration | After required Common Core capabilities |
| 31 | Clinic / Healthcare Billing | Regulated Service Integration | After required Common Core capabilities |

## Folder Structure

- `00_README_AND_DEVELOPMENT_ORDER.md` — this guide and sequence.
- `01_COMMON_CORE_SRS.md` — everything common across business types.
- `02_...` onward — one file per business type, beginning with Grocery / Supermarket.

## Requirement hierarchy

```text
COMMON CORE REQUIREMENT
CC-P3-002
"One physical stock movement = one authoritative stock movement"

        ↓ reused by

Grocery       Garage        Restaurant      Distribution
Waste/Stock   Parts usage    Ingredients     Van stock/delivery
```

The vertical requirement tells **when/why** the common behavior is used. The Common Core owns the actual shared rule.

## Suggested issue-tracker mapping

- Epic = Phase or major business capability
- Feature = Requirement group / screen / workflow
- Story = `XX-US-###`
- Acceptance test = acceptance check + edge cases
- Technical task = API, DB, UI, event, migration, monitoring work required to satisfy the story

## Recommended first delivery path

```text
Common P0-P4
→ Common P5 Traceability/Workflow as needed
→ Grocery G0-G3
→ Grocery G4-G6
→ General Retail
→ Fashion / Electronics / Hardware / Specialty Retail
→ Food and Service engines
→ Distribution / Rental
→ Regulated / integration-heavy packs last
```

## Technology Architecture and Stack Plan

The implementation stack, scalability model, frontend split, backend/database rules, security/operations plan, and delivery gates are documented separately so the SRS remains technology-independent:

1. [`technology/00_TECHNOLOGY_STACK_INDEX.md`](./technology/00_TECHNOLOGY_STACK_INDEX.md) — selected stack and decision summary.
2. [`technology/01_ARCHITECTURE_RECOMMENDATION.md`](./technology/01_ARCHITECTURE_RECOMMENDATION.md) — modular-monolith boundaries and scaling/service-extraction rules.
3. [`technology/02_FRONTEND_AND_MICRO_FRONTEND.md`](./technology/02_FRONTEND_AND_MICRO_FRONTEND.md) — Next.js, POS offline architecture, devices, and micro-frontend decision.
4. [`technology/03_BACKEND_DATABASE_AND_EVENTING.md`](./technology/03_BACKEND_DATABASE_AND_EVENTING.md) — NestJS, PostgreSQL, Prisma, APIs, transactions, outbox, queues, and reporting.
5. [`technology/04_PLATFORM_SECURITY_AND_OPERATIONS.md`](./technology/04_PLATFORM_SECURITY_AND_OPERATIONS.md) — infrastructure, identity, security, observability, CI/CD, backup, and disaster recovery.
6. [`technology/05_IMPLEMENTATION_ROADMAP_AND_DECISION_GATES.md`](./technology/05_IMPLEMENTATION_ROADMAP_AND_DECISION_GATES.md) — technology phases aligned to Common Core P0–P8 and the first business packs.
7. [`technology/06_ARCHITECTURE_TUTORIAL_AND_DEPLOYMENT_GUIDE.md`](./technology/06_ARCHITECTURE_TUTORIAL_AND_DEPLOYMENT_GUIDE.md) — easy-to-follow architecture lessons using real sales, offline, payment, folder, repository, and deployment examples.
