# POS SaaS — Advanced UI/UX Markdown Package

This package is the UI/UX companion to the SRS files.

## Development rule

```text
SRS requirement / user story
        ↓
UI flow
        ↓
Shared component or vertical component
        ↓
Desktop / tablet / mobile states
        ↓
Empty / loading / error / offline / permission states
        ↓
UX acceptance
        ↓
Frontend implementation + automated/visual QA
```

## Recommended order

| Order | File / business | Rule |
| --- | --- | --- |
| 01 | Common UI/UX Design System | Build shared shell/components/tokens first |
| 02 | Grocery / Supermarket | Companion UI/UX plan in same order as SRS |
| 03 | General Retail | Companion UI/UX plan in same order as SRS |
| 04 | Fashion / Footwear | Companion UI/UX plan in same order as SRS |
| 05 | Electronics / Mobile | Companion UI/UX plan in same order as SRS |
| 06 | Hardware / Building Materials | Companion UI/UX plan in same order as SRS |
| 07 | Bookstore / Stationery | Companion UI/UX plan in same order as SRS |
| 08 | Cosmetics / Beauty Retail | Companion UI/UX plan in same order as SRS |
| 09 | Furniture / Homeware | Companion UI/UX plan in same order as SRS |
| 10 | Jewelry | Companion UI/UX plan in same order as SRS |
| 11 | Auto Parts | Companion UI/UX plan in same order as SRS |
| 12 | Restaurant | Companion UI/UX plan in same order as SRS |
| 13 | Cafe / QSR | Companion UI/UX plan in same order as SRS |
| 14 | Bakery | Companion UI/UX plan in same order as SRS |
| 15 | Food Truck / Mobile Food | Companion UI/UX plan in same order as SRS |
| 16 | Bar / Pub | Companion UI/UX plan in same order as SRS |
| 17 | Hotel Revenue Centers | Companion UI/UX plan in same order as SRS |
| 18 | Salon / Spa / Barber | Companion UI/UX plan in same order as SRS |
| 19 | Garage / Auto Repair | Companion UI/UX plan in same order as SRS |
| 20 | Electronics / Computer Repair | Companion UI/UX plan in same order as SRS |
| 21 | Laundry / Dry Cleaning | Companion UI/UX plan in same order as SRS |
| 22 | Tailoring / Alterations | Companion UI/UX plan in same order as SRS |
| 23 | Field / Home Services | Companion UI/UX plan in same order as SRS |
| 24 | Wholesale / Distribution | Companion UI/UX plan in same order as SRS |
| 25 | Van Sales | Companion UI/UX plan in same order as SRS |
| 26 | Rental / Hire | Companion UI/UX plan in same order as SRS |
| 27 | B2B Trade Counter | Companion UI/UX plan in same order as SRS |
| 28 | Pharmacy | Companion UI/UX plan in same order as SRS |
| 29 | Fuel / Convenience | Companion UI/UX plan in same order as SRS |
| 30 | Hotel / PMS-Heavy Operations | Companion UI/UX plan in same order as SRS |
| 31 | Clinic / Healthcare Billing | Companion UI/UX plan in same order as SRS |

## Important architecture rule

The visual experience may look industry-specific, but shared behavior stays shared. For example:
- Grocery waste, garage parts and restaurant ingredients all reuse common Stock Movement patterns.
- Restaurant KOT, garage Job Card, repair ticket and salon service ticket reuse common Work Ticket patterns.
- Garage booking, salon appointment and rental reservation reuse Booking/Resource patterns.
- Electronics device, garage vehicle and customer repair item reuse Customer Asset / Traceability patterns where applicable.

## Style package files

- `styles/design-tokens.json`
- `styles/theme.css`
- `styles/vertical-theme-map.json`
- `90_SHARED_COMPONENT_CATALOG.md`
- `91_UI_STATE_ERROR_OFFLINE_PATTERNS.md`
- `92_ACCESSIBILITY_RESPONSIVE_GUIDE.md`
- `93_FRONTEND_HANDOFF_STRUCTURE.md`
- `94_VERTICAL_THEME_MATRIX.md`

Use the Markdown files as product/design specifications and the token/CSS files as a frontend starting point.
