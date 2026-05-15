# svg_files

Source / working files for the **OTA channel icons** (Airbnb, Booking.com, VRBO, Expedia, direct website, manual). Despite the folder name, contents are mostly PNG/JPG.

## Usage

These are **not** loaded at runtime. The production icons live at:

```
public/icons/ota-airbnb.jpg
public/icons/ota-booking.png
public/icons/ota-vrbo.png
public/icons/ota-expedia.png
public/icons/ota-other.png
```

Code references them as plain string paths from `public/` (see [components/modules/customer-success/](../components/modules/customer-success/) and [lib/validations/tickets.ts](../lib/validations/tickets.ts) for the `source` enum: `airbnb | booking | vrbo | expedia | vacasa | other`).

Keep this folder as the editable source set. If you replace a channel icon, update the file in `public/icons/` — this folder is not deployed.
