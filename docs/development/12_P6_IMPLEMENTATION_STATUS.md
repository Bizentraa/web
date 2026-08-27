# Common Core P6 Implementation Status — Offline, Devices and Store Reliability

**Date:** 2026-08-27  
**Status:** Implemented for current device/offline foundation scope  
**SRS mapping:** `CC-P6-001` to `CC-P6-008`; `CC-US-015`

## Implemented scope

P6 now provides the first store-reliability foundation:

- Store Device registry for POS terminals, receipt printers, label printers, kitchen printers, barcode scanners, cash drawers, payment terminals, customer displays, cameras and other devices.
- Device health heartbeat with last-seen time and pending offline item count.
- Offline Queue records with unique idempotency keys.
- Offline queue status changes to queued, synced, conflict, failed or cancelled.
- Sync Conflict records created when an offline queue item needs manual review.
- Sync Conflict resolution tracking with resolver, status, resolution note and timestamp.
- P6 permission catalogue and role sync for existing and new Businesses.
- Back Office `/store-reliability` workspace.
- API-client methods and live smoke coverage.

## Permission sync

New P6 permissions are added to the shared permission catalogue and assigned to default system roles:

- Business Owner / Business Administrator: full P6 access.
- Device / Offline User: full device and offline queue access.
- Branch Manager: read access to device/offline status.
- Cashier: device/offline queue access needed for POS sync operations.
- Auditor: read-only P6 access.

Existing Businesses are backfilled by migration `20260826205021_p5_p6_engines_devices`.

## Verification

- Focused builds/typechecks passed for contracts, database, domain, API client, API and Back Office.
- Migration `20260826205021_p5_p6_engines_devices` applied successfully.
- Live API smoke run passed P6 checks for overview, device registration, heartbeat, offline queue idempotency, conflict marking, conflict visibility and conflict resolution.

## Remaining work

- Real browser/POS offline storage and automatic replay from IndexedDB/service worker.
- Always-visible POS offline banner and sync queue drawer.
- Payment-provider-specific offline risk rules.
- Printer/scanner/cash-drawer hardware adapters.
- Conflict comparison UI with server/client diff.
- Device pairing, revocation and lost-device lockout.
- Route-level browser smoke tests for offline/device states.
