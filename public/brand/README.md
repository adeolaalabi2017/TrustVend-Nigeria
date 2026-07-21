# TrustVend Nigeria — Brand Kit

Code-native brand identity system for TrustVend Nigeria. Open `index.html`
in a browser to view the full showcase, or pick individual SVGs from
`logo/`, `favicon/`, `icons/`, `illustrations/`, or `social/`.

## Directory tree

```
public/brand/
├── README.md                  ← this file
├── index.html                 ← self-contained brand showcase
├── logo/                      ← mark, wordmark, monogram (6 SVGs)
│   ├── logo-mark.svg
│   ├── logo-mark-dark.svg
│   ├── logo-monogram.svg
│   ├── logo-wordmark.svg
│   ├── logo-wordmark-stacked.svg
│   └── logo-favicon.svg
├── favicon/                   ← platform icons + social cards (6 SVGs)
│   ├── favicon.svg
│   ├── apple-touch-icon.svg
│   ├── pwa-icon-192.svg
│   ├── pwa-icon-512.svg
│   ├── og-image.svg
│   └── twitter-card.svg
├── icons/                     ← vendor category icons (10 SVGs)
├── illustrations/             ← empty-state illustrations (5 SVGs)
└── social/                    ← social templates (4 SVGs, editable ids)
```

## Brand at a glance

- **Wordmark** — "TrustVend" with the "Nigeria" subtitle in caps, 9–10px
  letter-spaced, muted against the headline.
- **Primary** — Emerald 500 (`#10B981` / oklch `0.696 0.17 162`).
- **Accent** — Amber 500 (`#FBBF24` / oklch `0.795 0.184 76`). Reserved
  for verifications, dates, and small link affordances.
- **Typography** — Plus Jakarta Sans, weights 300–800.
- **Accent rule** — No purple/blue gradient highlights.

## Editing social templates

Each social template SVG has `<text id="…">` placeholders. Open the
file, find the placeholder by `id`, and replace the text content. The
current IDs across the four templates are:

| Template | Placeholder IDs |
| --- | --- |
| `social-template-default.svg` | `headline`, `headline-2`, `subhead`, `url` |
| `social-template-blog.svg` | `kicker`, `headline`, `headline-2`, `headline-3`, `subhead`, `category-strip`, `url` |
| `social-template-event.svg` | `kicker`, `headline`, `headline-2`, `subhead`, `date-day`, `date-month`, `date-year`, `date-time`, `date-place`, `rsvp`, `url` |
| `social-template-vendor.svg` | `verified-label`, `kicker`, `handle`, `headline`, `subhead`, `stat-1-num`, `stat-2-num`, `stat-3-num`, `url` |

Recommended font sizes for swap copy:

- Headlines: keep the existing `font-size` values. Two-line wraps are
  intentional.
- Date block: two-letter DD, three-letter MMM, four-digit YYYY.
- RSVP pill: ≤ 14 chars.

## Sizing rules

| Asset | Min digital | Min print | Notes |
| --- | --- | --- | --- |
| Logo mark | 24 px | 12 mm | Below 24 px, switch to `logo-monogram.svg` or `logo-favicon.svg`. |
| Wordmark (horizontal) | 96 px wide | 32 mm wide | Don't crop subtitle. |
| Wordmark (stacked) | 64 px wide | 24 mm wide | Comfortable at 96 px+ on mobile. |
| Monogram | 16 px | 8 mm | Only as a backup; prefer `logo-favicon.svg` below 32 px. |

## Color rules

- **Approved palette only.** Do not recolor the mark with anything
  outside the swatches listed in the showcase.
- **No gradient inside the mark.** Background gradients (e.g. on OG
  cards) are acceptable as long as they use only emerald + amber on
  warm white.
- **No purple/blue gradient highlights** anywhere in the system.
- **Reserve amber** for ≤ 10% of any given composition.

## Wiring into the live app (future task)

This kit ships as a reference. A follow-up task should:

1. Replace `public/logo.svg` with a swap from this kit (or leave
   `public/logo.svg` as a fallback).
2. Add `favicon.svg` + `apple-touch-icon.svg` references in
   `src/app/layout.tsx` `<head>` metadata, plus the OG `og-image.svg`
   in the OpenGraph block.
3. Bind the new `--brand-*` CSS variables into `src/app/globals.css`
   alongside the existing `--primary` / `--accent`.
4. Swap the inline `<ShieldCheck>` mark in `src/components/shared/header.tsx`
   for `<img src="/brand/logo/logo-mark.svg" />` (with `currentColor` so
   it tints with `bg-primary`).
5. Replace the PNG vendor category icons in `public/vendors/` with the
   SVG icons in `icons/` (or use them alongside during transition).
6. Replace the empty states in `src/components/views/*.tsx` with the
   `illustrations/*.svg` references where applicable.

## PNG raster export (follow-up step)

This kit ships SVG-only by design. To generate PNGs from the favicons
when wiring into the app, a one-shot script:

```bash
npx --yes -p sharp-cli sharp -i favicon.svg -o favicon-16.png resize 16 16
npx --yes -p sharp-cli sharp -i favicon.svg -o favicon-32.png resize 32 32
npx --yes -p sharp-cli sharp -i apple-touch-icon.svg -o apple-touch-icon.png resize 180 180
npx --yes -p sharp-cli sharp -i og-image.svg -o og-image.png resize 1200 630
```

Or in the Next.js app:

```ts
import sharp from "sharp";
import { readFile } from "node:fs/promises";
const svg = await readFile("public/brand/favicon/favicon.svg");
await sharp(svg).resize(32, 32).png().toFile("public/favicon-32.png");
```

## Notes

- Do not animate the mark in production. Static design preserves brand
  integrity across surfaces.
- The "T+V" monogram is intentional — it reads as both letters with a
  small verification tick that hints at `BadgeCheck` without being a
  literal copy of it.
- The cover gradient on `og-image.svg` mirrors the existing `hero-gradient`
  class in `src/app/globals.css`.
