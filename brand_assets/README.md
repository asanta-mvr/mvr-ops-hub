# Brand Assets

Source PNGs and proposal mockups from the **MVR Brand Refresh 2025**: logos, imagotipos, the brand refresh proposal sheets (`Brand Refresh-07.png` through `-11.png`), and reference photos.

## Usage

These files are **design archive / reference only** — they are NOT imported by any code in `app/`, `components/`, or `lib/`.

Production uses:
- The crown logo as inline SVG inside `components/shared/Sidebar.tsx` and the login page (fill `#1E2D40` navy, stroke `#A2B4C0` steel, base `#CEC4B6` sand).
- Raster fallbacks at `public/mvr-crown-logo.png` and `public/mvr-crown.png`.

If you need to ship a new raster asset (favicon, social card, email header), copy the relevant file into `public/` first — don't import from this folder.

## Color tokens

The hex values for the brand palette are defined in `tailwind.config.ts` (search for `mvr-primary`, `mvr-sand`, `mvr-steel`, etc.) and documented in [CLAUDE.md → DESIGN SYSTEM](../CLAUDE.md#design-system).
