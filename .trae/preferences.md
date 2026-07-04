# TrustVend — User Preferences

This file stores persistent preferences and conventions for the
TrustVend Nigeria codebase. Auto-loaded by AI agents on every session
to avoid re-asking the user.

## Typography

- **Main font family**: **Plus Jakarta Sans** (Google Fonts)
  - Loaded via `next/font/google` as `Plus_Jakarta_Sans` in
    [src/app/layout.tsx](../src/app/layout.tsx) (variable name
    `--font-jakarta-sans`)
  - Bound to Tailwind's `--font-sans` token in
    [src/app/globals.css](../src/app/globals.css)
  - Weights loaded: 300, 400, 500, 600, 700, 800 (regular and bold
    both available)
  - `display: "swap"` for fast first paint
  - Used for **both headings and body copy** — no separate display
    font. Explicit `font-family` declarations in `@layer base` cover
    `html`, `body`, and all `h1`–`h6` so even un-styled markup uses
    Plus Jakarta Sans.
  - Letter-spacing on headings: `-0.01em` (tight, for the bold weight)
  - Monospace: `ui-monospace, SFMono-Regular, "SF Mono", Menlo,
    Consolas, "Liberation Mono", monospace`

## Visual identity (to be expanded)

- **Primary brand color**: emerald / green palette (set via
  `--color-primary` in `globals.css` / `tailwind.config.ts`)
- **Hero gradient**: `radial-gradient(60% 80% at 15% 20%, oklch(0.52 0.12 162 / 0.18) …) +
  radial-gradient(50% 70% at 90% 10%, oklch(0.78 0.15 75 / 0.18) …) +
  linear-gradient(180deg, oklch(0.99 0.006 145) 0%, oklch(0.975 0.01 150) 100%)`
  (defined as `.hero-gradient` class in globals.css)
- **Logo wordmark**: "TrustVend" + "Nigeria" subtitle (10px
  muted-foreground, all lowercase weight)
- **Tagline / hero copy**: "Discover Verified Instagram businesses
  and Vendors - Find real vendors, read reviews and interact with
  confidence."

## Color copy conventions

- "Vendors" — capitalized in marketing copy (it's a named entity in
  the TrustVend context)
- "Instagram" — capitalized (brand)
- Default em dash for asides: "—"
- Sentence case preferred over all-caps for sentence headings

## Admin bootstrap

- Admin escape hatch: `BOOTSTRAP_ADMIN_EMAIL` env var on the Convex
  backend. First matching signup (or `bootstrapPromoteSelf` mutation)
  becomes ADMIN role. **Remove the env var once an admin exists.**
- After bootstrapping, you can create more admins via the
  `users.adminUpdateUser({ action: "makeAdmin" })` mutation from the
  admin dashboard.

## Sample vendor seed

- `vendors.seedSamples` (admin-only) idempotently creates 10 sample
  vendors across 7 categories. Synthetic login pattern:
  `{handle}@trustvend-demo.ng` / `VendorPass123!`
- UI: "Sample vendor pack" panel in admin overview tab
- API: `POST /api/admin/seed-vendors`

## Secure Git push

- `git config --global credential.helper manager` is set globally
  (uses Windows Credential Manager, encrypted at rest)
- Never paste GitHub PATs in chat — they're compromised on receipt
- `scripts/push-feature.ps1` is the standard push wrapper
