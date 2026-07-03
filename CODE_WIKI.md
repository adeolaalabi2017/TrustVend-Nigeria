# TrustVend Nigeria — Code Wiki

A structured, comprehensive walkthrough of the TrustVend Nigeria codebase: a Next.js 16 (App Router) single-page application that helps Nigerian customers discover, verify, and engage with Instagram-based businesses (vendors). It ships customer, vendor, and admin experiences backed by Prisma + SQLite, NextAuth credentials login, and an in-app messaging system.

> **TL;DR**: One SPA at `/` with URL-driven view switching (Zustand), REST API routes under `/api/*`, Prisma ORM on SQLite, NextAuth (credentials + bcrypt), Tailwind v4 + shadcn/ui for the UI, and Caddy as a reverse proxy / TLS terminator.

---

## 1. Project Overview

### 1.1 Purpose

TrustVend Nigeria is a vendor directory + engagement platform focused on Instagram-based businesses operating in Nigeria. Customers can browse, search, bookmark, review, and message vendors. Vendors apply, manage their profile, respond to enquiries, and track stats. Admins approve applications, verify vendors, moderate reviews, and audit activity.

### 1.2 Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript 6 (`strict: true`) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (Radix primitives), lucide-react, framer-motion, recharts |
| State (client) | Zustand (single SPA view store) + TanStack Query v5 |
| Auth | NextAuth v4 (Credentials provider, JWT sessions) |
| DB / ORM | SQLite + Prisma 6 |
| Validation | Zod 4 |
| Testing | Vitest (unit), Playwright (E2E) |
| Runtime / build | Bun |
| Reverse proxy | Caddy (TLS termination, port 81) |

### 1.3 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Caddy (:81, TLS) ── reverse_proxy ──> Next.js (:3000, standalone)  │
└─────────────────────────────────────────────────────────────────────┘
                │
                ├── / (SPA shell) ── Zustand store ── views/* (dynamic)
                │
                ├── /api/auth/*  ── NextAuth (JWT cookie)
                ├── /api/vendors, /api/posts, /api/events, /api/threads,
                │   /api/bookings, /api/bookmarks, /api/notifications,
                │   /api/account, /api/stats, /api/me, /api/upload
                └── /api/admin/*, /api/vendor/*  (role-gated)
                                │
                                └── Prisma Client ── SQLite (db/custom.db)
```

### 1.4 Top-Level Layout

- [src/app/layout.tsx](file:///c:/Users/DELL LATITUDE%207290/Documents/TV-V2/src/app/layout.tsx) — Root layout. Loads Geist font, mounts `<Providers>` and `<SonnerToaster>`.
- [src/app/page.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/app/page.tsx) — Single client page. Selects one of ten views from `useAppStore`, syncs URL on state change, listens to `popstate`.
- [src/app/globals.css](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/app/globals.css) — Tailwind v4 + shadcn theme tokens (emerald/teal palette, light + dark).
- [src/middleware.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/middleware.ts) — Security headers: HSTS, CSP, X-Frame-Options, Permissions-Policy.

---

## 2. Repository Map

```
TV-V2/
├── prisma/
│   ├── schema.prisma           # Data model (SQLite)
│   └── seed.ts                 # Demo seed (12 vendors, 2 customers, 1 admin)
├── public/
│   ├── vendors/                # AI-generated category + hero images
│   ├── logo.svg
│   ├── robots.txt
│   └── uploads/                # User-uploaded photos (UUID filenames)
├── src/
│   ├── app/                    # Next.js App Router (pages + API)
│   │   ├── layout.tsx
│   │   ├── page.tsx            # SPA shell
│   │   ├── globals.css
│   │   └── api/                # Route handlers (REST)
│   ├── components/
│   │   ├── providers.tsx       # SessionProvider + ThemeProvider + QueryClient
│   │   ├── ui/                 # shadcn primitives (Radix wrappers)
│   │   ├── shared/             # Cross-view widgets (cards, dialogs, charts)
│   │   └── views/              # The 10 main views
│   ├── hooks/use-mobile.ts     # Media query helper
│   ├── lib/                    # Server + client helpers
│   ├── middleware.ts           # Security header middleware
│   └── types/                  # next-auth.d.ts, vitest.d.ts
├── e2e/                        # Playwright tests
├── tests/setup.ts              # Vitest setup (mocks)
├── mini-services/              # Standalone sidecars (currently empty)
├── examples/websocket/         # Reference WebSocket example
├── db/custom.db                # SQLite database file
├── public/uploads/             # Runtime photo uploads
├── Caddyfile                   # Reverse proxy config (:81 → :3000)
├── next.config.ts              # Standalone output, remote image patterns
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json               # "@/*" → src/* alias
├── components.json             # shadcn config
└── package.json
```

---

## 3. Data Layer (`prisma/schema.prisma`)

SQLite datasource. All models use `cuid()` IDs and carry `createdAt`/`updatedAt`.

### 3.1 Models

| Model | Purpose | Notable fields |
| --- | --- | --- |
| [User](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L13-L38) | Account (customer / vendor / admin) | `role: CUSTOMER | VENDOR | ADMIN`, `password` (bcrypt), `banned` |
| [Vendor](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L40-L88) | Instagram business listing | `status: PENDING | APPROVED | SUSPENDED | REJECTED`, `verified`, `verificationStage`, `featured`, `featuredUntil`, denormalized `ratingAvg` / `ratingCount`, JSON `photos` |
| [Review](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L90-L103) | Star rating + comment | unique on `(vendorId, userId)`; `hidden` flag |
| [Bookmark](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L105-L115) | Saved vendors | unique on `(userId, vendorId)` |
| [Thread](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L117-L131) | Customer ↔ vendor conversation | unique on `(customerId, vendorId)`; `lastMessageAt` index |
| [Message](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L133-L142) | Messages inside a thread | `read` flag |
| [Notification](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L144-L156) | In-app notifications | typed (`NEW_MESSAGE`, `NEW_REVIEW`, `VENDOR_APPROVED`, `BOOKING_*`, …), optional `link` view hint |
| [AuditLog](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L158-L170) | Admin action trail | `action`, `targetId`, `targetType`, free-text `detail` |
| [Booking](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L172-L186) | Service booking requests | `status: PENDING | CONFIRMED | DECLINED | CANCELLED` |
| [Post](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L188-L202) | Admin blog posts | Markdown `content`, JSON `tags`, `published` |
| [Event](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L204-L227) | Vendor/admin events | `eventDate`, `endDate?`, optional `vendorId` link |
| [EventBookmark](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/schema.prisma#L229-L238) | Saved events | unique on `(userId, eventId)` |

### 3.2 SQLite JSON Columns

Because SQLite has no native JSON type, the schema stores arrays as text:

- `Vendor.photos` (JSON array of URLs, max 6)
- `Post.tags` (JSON array of tag strings)

Helpers in [src/lib/json-fields.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/json-fields.ts) parse/serialize these and expose typed accessors (`parseVendorPhotos`, `firstPhoto`, `parsePostTags`).

### 3.3 Verification Stage State Machine

```
NONE → INSTAGRAM_CHECK → MANUAL_REVIEW → PAYMENT → COMPLETED (verified)
```

Admins advance the stage; `COMPLETED` also flips `verified = true` and stamps `verifiedAt`. The reverse (`unverify`) drops back to `MANUAL_REVIEW`.

### 3.4 Seed Data

[prisma/seed.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/prisma/seed.ts) populates 12 vendors across all 10 categories (mix of verified / unverified / featured), 2 customers, 1 admin, sample reviews, bookmarks, and a thread. Demo password: `password123`.

Run with `bun run db:seed` (or equivalent Prisma command).

---

## 4. Library Layer (`src/lib/`)

| File | Role |
| --- | --- |
| [auth.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/auth.ts) | NextAuth options. Credentials provider, bcrypt, JWT 30-day session, secure cookies in prod, lazy rehash from cost < 12 → 12. |
| [session.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/session.ts) | `getCurrentUser` / `getCurrentUserWithVendor`. Re-checks DB on every call so bans / deletions take effect immediately. |
| [db.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/db.ts) | Singleton Prisma client (avoids hot-reload connection storms). |
| [store.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/store.ts) | Zustand client store: `view`, `selectedVendorId/PostId/EventId`, `filters`, `authOpen`, plus URL hydration helpers (`hydrateState`, `syncUrl`, `resetNavKey`). |
| [api.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/api.ts) | Typed `fetch` wrappers for every public API route. The single source of truth for client → server call shapes. |
| [vendor-serializer.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/vendor-serializer.ts) | `toVendorCard` / `toVendorDetail` + `recomputeVendorRating` (transaction-safe aggregate). |
| [validation.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/validation.ts) | All Zod schemas (register, vendor apply, vendor patch, review, thread, booking, admin actions, …). Strict `.strict()` on patches prevents mass-assignment. |
| [request-guard.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/request-guard.ts) | `requireSameOrigin` (CSRF guard on mutation routes) + `parseJsonBody` (256 KB size cap). |
| [rate-limit.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/rate-limit.ts) | In-memory sliding-window limiter. `getClientIp` reads X-Forwarded-For / X-Real-IP. |
| [notify.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/notify.ts) | `notify`, `audit`, `notifyVendorOwner`. Best-effort (never fail a request). |
| [sweep.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/sweep.ts) | `sweepExpiredFeatured` — throttled (every 5 min) background cleanup that drops `featured` when `featuredUntil` has passed. |
| [constants.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/constants.ts) | `CATEGORIES`, `NIGERIAN_STATES`, `CATEGORY_ICONS`, `VERIFICATION_STAGES`, `VENDOR_STATUS`. |
| [utils.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/utils.ts) | `cn()` — `clsx` + `tailwind-merge` class composer. |
| [json-fields.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/lib/json-fields.ts) | SQLite JSON helpers. |

### 4.1 Auth Flow

1. `POST /api/auth/register` — bcrypt(12) hashes the password, creates the `User`, optionally seeds a `PENDING` Vendor shell.
2. `POST /api/auth/[...nextauth]` (NextAuth Credentials) — verifies bcrypt, rejects banned users, returns a JWT.
3. Subsequent requests include the `next-auth.session-token` cookie. `getCurrentUser()` looks up the live record so ban / deletion / role changes apply immediately.

### 4.2 URL Sync (SPA → URL)

The store hydrates from `?view=&id=&q=&category=&state=&sort=` on mount. [page.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/app/page.tsx) calls `syncUrl` on every change:
- Navigation (view/id change) → `history.pushState` (Back works).
- Filter tweaks → `history.replaceState` (no history spam).
A `popstate` listener re-hydrates the store on Back/Forward.

---

## 5. Component Layer

### 5.1 Providers

[components/providers.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/providers.tsx) mounts three providers:

- `SessionProvider` — NextAuth React hooks.
- `ThemeProvider` — `next-themes` (light/dark, system-aware, no transition flash).
- `QueryClientProvider` — TanStack Query (`refetchOnWindowFocus: false`, `retry: 1`).

### 5.2 Shared Widgets (`components/shared/`)

| Component | Responsibility |
| --- | --- |
| [header.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/header.tsx) | Top navigation. Theme toggle, role-aware menu (Customer/Vendor/Admin dashboards), mobile `Sheet`, auth dialog launcher. |
| [footer.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/footer.tsx) | Site footer. |
| [auth-dialog.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/auth-dialog.tsx) | Tabs (Login / Signup), optional `signup-vendor` mode, calls NextAuth `signIn` and `POST /api/auth/register`. |
| [vendor-card.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/vendor-card.tsx) | Listing card. Cover photo, category icon, star rating, bookmark toggle, navigates to vendor detail. |
| [messages-panel.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/messages-panel.tsx) | Two-pane inbox (thread list + chat). Polls threads every 8 s and active thread every 5 s. |
| [notification-bell.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/notification-bell.tsx) | Popover list. Polls `/api/notifications` every 15 s, mark-read action, link routing. |
| [photo-uploader.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/photo-uploader.tsx) | Drag/drop + URL paste, max 6, posts to `/api/upload`, returns `/uploads/<uuid>.<ext>`. |
| [dashboard-shell.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/dashboard-shell.tsx) | Bankio-style layout: 256 px sidebar + sticky top header + content slot. Hosts `StatCard`, `HighlightStatCard`, `PanelCard`, `StatusBadge`. |
| [charts.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/charts.tsx) | `DonutChart` (Recharts) and `MiniBarChart` with tooltip + grid. Uses an OKLCH palette (emerald primary, amber, teal, …). |
| [verified-badge.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/verified-badge.tsx), [star-rating.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/star-rating.tsx), [category-icon.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/components/shared/category-icon.tsx) | Atoms. |

### 5.3 Views (`components/views/`)

All ten views are dynamically imported (`ssr: false`) from [page.tsx](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/src/app/page.tsx) and selected by `store.view`.

| View | Purpose | Key data |
| --- | --- | --- |
| `HomeView` | Hero, search, category chips, featured grid, paginated vendor list, trust explainer, blog & events teasers. | `/api/stats`, `/api/vendors`, `/api/posts`, `/api/events` |
| `VendorDetailView` | Gallery, contact CTAs (Message / WhatsApp / Instagram / Save), verification breakdown, reviews, write-review, booking CTA. | `/api/vendors/[id]`, `/api/vendors/[id]/reviews`, `/api/bookings`, `/api/threads` |
| `BecomeVendorView` | Multi-section vendor application. Uses `PhotoUploader`. | `/api/vendors` (POST) |
| `CustomerDashboardView` | Bookmarks, messages, bookings, saved events. Tabs. | `/api/bookmarks`, `/api/bookings`, `/api/events/bookmarks` |
| `VendorDashboardView` | Stats (views/enquiries/bookmarks/reviews/rating), donut + bar chart, availability toggle, verification progress, profile editor, change-password, delete-account. | `/api/vendor/dashboard`, `/api/vendors/[id]` (PATCH), `/api/account` |
| `AdminDashboardView` | Overview, Approvals (reject dialog), Vendors (searchable table with verify/feature/suspend), Users (ban/unban/delete/role), Reviews (moderation), Insights, Audit log. | `/api/admin/*` |
| `BlogView` / `BlogDetailView` | Public blog index + post (Markdown rendered with `react-markdown`). | `/api/posts`, `/api/posts/[id]` |
| `EventsView` / `EventDetailView` | Browse + detail + bookmark + create (for vendors/admins). | `/api/events`, `/api/events/[id]` |

---

## 6. API Surface (`src/app/api/`)

All mutation routes run three guards before business logic:

1. `requireSameOrigin` — CSRF protection (Origin/Referer match).
2. `parseJsonBody` — JSON parse + 256 KB cap.
3. Auth check via `getCurrentUser` (DB-revalidated).

### 6.1 Endpoint Index

| Method & Path | Auth | Purpose |
| --- | --- | --- |
| `GET/POST /api/auth/register` | public | Create user (optionally seed Vendor shell). Rate-limited 5 / min / IP. |
| `* /api/auth/[...nextauth]` | public | NextAuth handler (login / session / csrf). |
| `GET /api/me` | session | Current user + vendor. |
| `GET /api/stats` | public | Platform counters for homepage. |
| `GET /api/vendors` | public | List + search/filter/sort. Pagination. Calls `sweepExpiredFeatured`. |
| `POST /api/vendors` | session | Apply as vendor. Rate-limited 30 / min / IP. |
| `GET /api/vendors/[id]` | public | Vendor detail + recent reviews + bookmarked state. |
| `PATCH /api/vendors/[id]` | owner / admin | Update profile. Strict whitelist schema. |
| `POST /api/vendors/[id]/view` | public | View counter with 30-min per-IP dedupe + 10 / min rate limit. |
| `GET /api/vendors/[id]/reviews` | public | Reviews (admins see hidden). |
| `POST /api/vendors/[id]/reviews` | session (non-admin, non-owner) | Upsert + transactional `recomputeVendorRating` + notify vendor. |
| `GET/POST /api/bookmarks` | session | List bookmarks; toggle vendor bookmark. |
| `GET/POST /api/threads` | session | List threads (as customer or vendor owner); start/reuse thread + send first message + notify. |
| `GET /api/threads/[id]` | participant | Thread + messages + mark incoming read. |
| `POST /api/threads/[id]/messages` | participant | Send message + bump `lastMessageAt` + notify recipient. |
| `GET /api/bookings` | session | List bookings scoped to role. |
| `POST /api/bookings` | session (customer) | Create booking + notify vendor. |
| `PATCH /api/bookings/[id]` | vendor or customer | State-machine transition (confirm / decline / cancel). Wrapped in `db.$transaction` to serialize concurrent PATCHes. |
| `GET /api/posts` | public | List published posts (tag filter). |
| `POST /api/posts` | admin | Create post. |
| `GET/PATCH/DELETE /api/posts/[id]` | public read / admin write | Post detail, edit, delete. Increments views for public reads. |
| `GET/POST /api/events` | public read / vendor+admin write | List upcoming events; create event. |
| `GET/PATCH/DELETE /api/events/[id]` | public read / organizer+admin | Detail (increments views), update, delete. |
| `GET/POST /api/events/bookmarks` | session | List / toggle event bookmarks. |
| `GET /api/vendor/dashboard` | vendor | Stats + rating distribution + weekly activity + recent reviews + enquiries. |
| `GET /api/vendor/events` | vendor | Vendor's events + total views + bookmarks + upcoming count. |
| `GET /api/admin/stats` | admin | Totals, top categories, top vendors by views, monthly signups, recent applications. |
| `GET /api/admin/vendors` | admin | All vendors + counts + owner info. |
| `PATCH /api/admin/vendors` | admin | Apply one of `approve / reject / suspend / reinstate / verify / unverify / feature / unfeature / advanceStage`. Writes audit log + notifies owner. |
| `GET/PATCH/DELETE /api/admin/users` | admin | List users; `ban / unban / makeAdmin / makeCustomer`; delete (cannot self-delete). |
| `GET /api/admin/reviews` | admin | All reviews (including hidden). |
| `PATCH /api/admin/reviews/[id]` | admin | Hide / restore + audit log. |
| `GET /api/admin/posts` | admin | All posts (including drafts). |
| `GET /api/admin/blog-stats` | admin | Blog counters + top posts + monthly posts. |
| `GET /api/admin/audit` | admin | Last 100 audit log entries with actor info. |
| `GET /api/notifications` | session | Last 30 notifications + unread count. |
| `POST /api/notifications/mark-read` | session | Mark one or all read. |
| `PATCH /api/account` | session | Change password. |
| `DELETE /api/account` | session | Delete own account (admins cannot self-delete). |
| `POST /api/upload` | session | Image upload (5 MB, magic-byte sniff, `/uploads/<uuid>.<ext>`). |

### 6.2 Admin Vendor Action Reference

| Action | Effect | Audit | Notify |
| --- | --- | --- | --- |
| `approve` | status = `APPROVED` | `VENDOR_APPROVE` | `VENDOR_APPROVED` |
| `reject` | status = `REJECTED`, set rejection reason | `VENDOR_REJECT` (detail = reason) | `VENDOR_REJECTED` |
| `suspend` | status = `SUSPENDED` | `VENDOR_SUSPEND` | `VENDOR_REJECTED` (suspend copy) |
| `reinstate` | status = `APPROVED` | `VENDOR_REINSTATE` | — |
| `verify` | verified = true, stage = `COMPLETED`, stamp `verifiedAt` | `VENDOR_VERIFY` | `VERIFIED` |
| `unverify` | verified = false, stage = `MANUAL_REVIEW` | `VENDOR_UNVERIFY` | — |
| `feature` | featured = true, `featuredUntil = now + featureDays` (default 30) | `VENDOR_FEATURE` (detail = days) | — |
| `unfeature` | featured = false, clear `featuredUntil` | `VENDOR_UNFEATURE` | — |
| `advanceStage` | Step stage forward (or to explicit stage). `COMPLETED` auto-verifies. | `VENDOR_ADVANCE_STAGE` | `VERIFIED` on `COMPLETED` |

### 6.3 Booking State Machine

```
PENDING ─confirm─> CONFIRMED ─cancel─> CANCELLED
PENDING ─decline─> DECLINED
PENDING ─cancel─> CANCELLED
```

Transitions are guarded by a static `TRANSITIONS` table inside a DB transaction so concurrent PATCHes serialize.

---

## 7. Dependency Map

```
page.tsx (src/app)
   ├── Providers
   │      ├── SessionProvider  → next-auth
   │      ├── ThemeProvider    → next-themes
   │      └── QueryClientProvider → @tanstack/react-query
   │
   ├── useAppStore (Zustand)         ── view, selected*, filters, auth dialog
   │     └── syncUrl / hydrateState  ── history.pushState / replaceState
   │
   ├── <Header> / <Footer> / <AuthDialog>
   │
   └── <HomeView / VendorDetailView / BecomeVendorView / …>
              │
              ├── api.* (src/lib/api.ts)  ── fetch → /api/*
              │                              │
              │                              ├── requireSameOrigin  (request-guard.ts)
              │                              ├── parseJsonBody      (request-guard.ts)
              │                              ├── rateLimit          (rate-limit.ts)
              │                              ├── validate(...)      (validation.ts: Zod)
              │                              ├── getCurrentUser*    (session.ts → db.ts)
              │                              └── notify / audit     (notify.ts)
              │
              └── <VendorCard / MessagesPanel / PhotoUploader / DashboardShell / Charts …>
                          │
                          └── Radix-based primitives in components/ui/
```

### 7.1 External NPM Dependencies (key)

- **UI**: `tailwindcss@^4`, `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `framer-motion`, `recharts`, `embla-carousel-react`, `vaul`, `react-markdown`, `react-syntax-highlighter`, `@mdxeditor/editor`, `sonner`, `react-day-picker`, `input-otp`, `cmdk`, `react-resizable-panels`.
- **State / data**: `zustand`, `@tanstack/react-query`, `@tanstack/react-table`, `@dnd-kit/*`, `react-hook-form`, `@hookform/resolvers`, `zod`.
- **Auth / security**: `next-auth@^4`, `bcryptjs`, `uuid`, `crypto` (Web API via `crypto.randomUUID`).
- **Images / files**: `sharp`, `next/image`, `fs/promises`.
- **Tooling**: `prisma`, `@prisma/client`, `eslint`, `eslint-config-next`, `vitest`, `@vitest/coverage-v8`, `@playwright/test`, `@faker-js/faker`, `typescript@^6`, `bun-types`.

---

## 8. Security Model

| Layer | Mechanism |
| --- | --- |
| AuthN | NextAuth Credentials + bcrypt (cost 12) |
| AuthZ | Role check (`CUSTOMER` / `VENDOR` / `ADMIN`) + owner-vs-target checks |
| CSRF | `requireSameOrigin` on every mutation route |
| Session integrity | `getCurrentUser` re-validates against DB (ban / deletion) |
| Request size | `parseJsonBody` caps JSON at 256 KB |
| Rate limits | Per-IP, in-memory (register 5/min, vendor apply 30/min, view 10/min) |
| View inflation | Per-(vendor,IP) 30-min dedupe in `POST /api/vendors/[id]/view` |
| Featured expiration | `sweepExpiredFeatured` (5-min throttle) |
| Mass assignment | `vendorPatchSchema.strict()` rejects unknown fields |
| Photo origin | `photosSchema` only accepts `/uploads/<uuid>.<ext>` or Instagram URLs |
| Upload validation | Magic-byte sniff (JPEG/PNG/WEBP/GIF), 5 MB cap |
| Headers | HSTS, X-Frame-Options DENY, CSP, Permissions-Policy lock-down |
| Cookies | `httpOnly`, `sameSite=lax`, `secure` in production |

---

## 9. Configuration Files

| File | Purpose |
| --- | --- |
| [next.config.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/next.config.ts) | `output: "standalone"`; `images.remotePatterns` derived from `NEXT_PUBLIC_IMAGE_HOSTS` (default: instagram CDN family + localhost). |
| [tsconfig.json](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/tsconfig.json) | `target: ES2017`, `strict: true`, `@/* → ./src/*`. |
| [Caddyfile](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/Caddyfile) | Reverse proxy on `:81` with optional `?XTransformPort=<n>` query switch (for sidecar routing). |
| [vitest.config.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/vitest.config.ts) | Node env, `@/*` alias, coverage via v8. |
| [playwright.config.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/playwright.config.ts) | Chromium / Firefox / WebKit, parallel local, serial in CI. |
| [components.json](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/components.json) | shadcn config: `new-york` style, neutral base, lucide icons, Tailwind v4. |
| [tailwind.config.ts](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/tailwind.config.ts) | Tailwind theme tokens (shadcn). |

### 9.1 Required Environment Variables

```
DATABASE_URL=file:./db/custom.db          # SQLite location
NEXTAUTH_SECRET=...                        # JWT signing secret
NEXTAUTH_URL=https://your-domain           # Used by requireSameOrigin
NEXT_PUBLIC_IMAGE_HOSTS=instagram.com,cdninstagram.com,fbcdn.net
NODE_ENV=production                        # Enables secure cookies + HSTS
NEXT_PUBLIC_SHOW_DEMO_CREDS=true           # Optional: show demo creds in auth dialog
```

---

## 10. Running the Project

### 10.1 Install Dependencies

```bash
bun install
```

### 10.2 Database

```bash
# Generate Prisma client
bun run db:generate

# Push schema to the SQLite file
bun run db:push

# (Optional) Seed demo data
bunx prisma db seed

# Or apply migrations
bun run db:migrate
```

### 10.3 Development

```bash
bun run dev               # next dev -p 3000 (logs to dev.log)
```

Then open <http://localhost:3000>. Behind Caddy, also start `caddy run --config Caddyfile` and visit <http://localhost:81>.

### 10.4 Production Build

```bash
bun run build             # Next.js standalone output + copies static + public
bun run start             # runs .next/standalone/server.js (production)
```

### 10.5 Tests

```bash
bun run test              # Vitest unit tests
bun run test:watch
bun run test:coverage
bun run test:e2e          # Playwright (starts server in CI)
bun run test:e2e:ui       # Playwright UI mode
bun run test:install      # one-time browser install
```

### 10.6 Lint / Typecheck

```bash
bun run lint              # ESLint
bun run typecheck         # tsc --noEmit
```

### 10.7 Convex Codegen Workflow

`convex/_generated/` is **tracked in git on purpose** (see [convex/.gitignore](file:///c:/Users/DELL%20LATITUDE%207290/Documents/TV-V2/convex/.gitignore)). This keeps the build pipeline independent of the Convex deployment — the build server has no need to authenticate against Convex or know any URLs/keys.

**When you change anything under `convex/`** (schema, new function file, new file in `convex/auth/`), regenerate the bindings locally and commit the diff:

```bash
bunx convex codegen
git add convex/_generated
git commit -m "chore(convex): regenerate API bindings"
```

Codegen requires the env vars in `.env.local`:

- `CONVEX_SELF_HOSTED_URL` — the self-hosted Convex backend URL
- `CONVEX_SELF_HOSTED_ADMIN_KEY` — admin key for the deployment

These are developer-local credentials only; they are never required in CI or in the Dokploy build env.

**Why this matters:** if the diff under `convex/_generated/` is not committed, the Dokploy build will fail at `next build` with `Module not found: Can't resolve 'convex/_generated/api'` even though codegen succeeded locally. The generated files are the source of truth for `src/**` TypeScript imports; they must be in the deployed bundle.

---

## 11. Demo Accounts

After seeding (`prisma/seed.ts`), the demo password is `password123`.

| Email | Role |
| --- | --- |
| `admin@trustvend.ng` | ADMIN |
| `customer@trustvend.ng` | CUSTOMER |
| `adaezecouture@trustvend.ng` | VENDOR (verified + featured) |

---

## 12. Cross-Cutting Flows

### 12.1 Customer Books a Vendor

1. Customer opens `VendorDetailView` → `POST /api/bookings` (Zod-validated, `notifyVendorOwner` with `BOOKING_REQUEST`).
2. Vendor opens `VendorDashboardView` → `PATCH /api/bookings/[id]` with `action: confirm | decline | cancel`.
3. Booking updates inside a `db.$transaction` (state machine + ownership check); recipient gets a `BOOKING_CONFIRMED | DECLINED | CANCELLED` notification outside the tx.

### 12.2 Review Path

1. `POST /api/vendors/[id]/reviews` → upsert on `(vendorId, userId)` → transactional `recomputeVendorRating` → notify vendor.
2. `vendor.ratingAvg` / `ratingCount` are denormalized so list queries stay cheap.

### 12.3 Admin Moderation Path

1. `PATCH /api/admin/vendors` → switch on action → `db.vendor.update` → `audit()` → optional `notifyVendorOwner()`.
2. Review hide/restore: `PATCH /api/admin/reviews/[id]` → flip `hidden` → `audit()`.
3. Every action shows up in `/api/admin/audit` (last 100, with actor info).

---

## 13. Extension Points

| To add | Where to start |
| --- | --- |
| New category / state | `src/lib/constants.ts` (`CATEGORIES`, `NIGERIAN_STATES`) |
| New vendor field | Add to `prisma/schema.prisma` → `db:push` → Zod schema in `src/lib/validation.ts` → `toVendorCard/Detail` in `src/lib/vendor-serializer.ts` → vendor form/view |
| New admin action | Extend `adminVendorActionSchema` + the switch in `src/app/api/admin/vendors/route.ts` + add an `audit` action name + optional `notify` |
| New notification type | Append to the `Notification.type` enum comment in `prisma/schema.prisma` → emit via `notify()` from the producing route → add an icon to `TYPE_ICON` in `notification-bell.tsx` |
| New view | Add to `View` union in `src/lib/store.ts`, add an `open*` action, sync serializer, dynamic-import it in `src/app/page.tsx` |
| New API route | Add `src/app/api/<name>/route.ts` and a typed wrapper in `src/lib/api.ts`; always include CSRF + body guards + Zod validation |
| New webhook / external integration | Place under `src/app/api/<name>/route.ts` with strict HMAC verification; update Caddy/CSP if a new origin is needed |

---

## 14. Glossary

| Term | Meaning |
| --- | --- |
| Vendor | A user with role `VENDOR` and an associated `Vendor` row describing an Instagram business. |
| Verified | `Vendor.verified = true`. Earned by completing all 4 verification stages. |
| Featured | Time-boxed listing priority (`featured + featuredUntil`). Auto-expires via `sweepExpiredFeatured`. |
| Enquiry | First message in a `Thread` (`NEW_ENQUIRY`); later messages are `NEW_MESSAGE`. |
| Stage | One of `NONE | INSTAGRAM_CHECK | MANUAL_REVIEW | PAYMENT | COMPLETED` (verification pipeline). |
| Bookmark | `User ↔ Vendor` saved-listing edge. |
| Notification | In-app alert record with a typed `link` view hint (`vendor:<id>`, `messages`, etc.). |