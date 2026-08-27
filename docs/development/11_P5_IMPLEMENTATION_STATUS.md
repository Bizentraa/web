# Common Core P5 Implementation Status — Reusable Business Engines

**Date:** 2026-08-27  
**Status:** Implemented for current shared-engine foundation scope  
**SRS mapping:** `CC-P5-001` to `CC-P5-012`; `CC-US-012`, `CC-US-013`, `CC-US-014`

## Implemented scope

P5 now provides the first reusable business-engine layer used by future business types:

- Workflow status and transition storage.
- Work Ticket engine with number, branch, priority, source link, assignee field, checklist, due date and status update.
- Booking engine with branch, resource code, customer link, time range, deposit field and overlap prevention.
- Customer Asset records for customer-owned vehicles, devices or equipment.
- Traceable Unit records for serial, IMEI, batch, lot and expiry controlled items.
- Warranty/RMA claim opening.
- Recipe/BOM definitions with component lines.
- Material Consumption records against a real source record.
- Delivery Route and Stop planning.
- Notification Event queue records.
- Business Document metadata attachment.
- P5 permission catalogue and role sync for existing and new Businesses.
- Back Office `/business-engines` workspace.
- API-client methods and live smoke coverage.

## Important business rule

BOMs, bookings, routes, warranty claims and work tickets do not directly mutate stock or finance. Stock and finance must still change only through real posted events such as stock movements, sales, receiving, expenses or explicit material consumption.

## Permission sync

New P5 permissions are added to the shared permission catalogue and assigned to default system roles:

- Business Owner / Business Administrator: full P5 access.
- Branch Manager / Operations User: operational P5 access.
- Inventory User: traceability and BOM access.
- Cashier: read access to tickets/bookings/documents.
- Auditor: read-only P5 access.

Existing Businesses are backfilled by migration `20260826205021_p5_p6_engines_devices`.

## Verification

- Focused builds/typechecks passed for contracts, database, domain, API client, API and Back Office.
- Migration `20260826205021_p5_p6_engines_devices` applied successfully.
- Live API smoke run passed P5 checks for workflow status, work ticket create/update, booking overlap refusal, customer asset, traceable unit, warranty claim, BOM, material consumption, delivery route, notification, document attachment and audit coverage.

## Remaining work

- Visual workflow designer and transition editor.
- Full WorkBoard / WorkTicketPanel with timers, assignment queues, checklist editing and attachments per ticket.
- Calendar UI with capacity rules, cancellation and no-show workflows.
- Warranty policy activation and claim inspection/approval/repair/replacement closure.
- Traceability movements tied to receipt, sale, return and transfer events.
- BOM production/assembly flow with stock consumption and output posting.
- Delivery stop mobile proof-of-delivery with signature/photo capture.
- Notification templates, providers, retry and failure management.
