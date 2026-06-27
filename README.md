# TrustVend Nigeria

> Trusted Instagram vendor directory for Nigeria.

A full-stack marketplace that helps Nigerians discover, verify, and engage with trusted Instagram businesses. Browse vendors by category and location, read reviews, send booking requests, and message vendors directly — all backed by a self-hosted real-time backend.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![Convex](https://img.shields.io/badge/Convex-1.42-orange)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

---

## ✨ Features

- **Vendor directory** — browse featured, recent, and category-filtered vendors with rich cards, ratings, and verified badges
- **Vendor detail pages** — full profile, photo gallery, products, reviews, contact info, and a direct messaging + booking flow
- **Authentication** — credentials login, vendor signup, NextAuth (JWT sessions), banned-account enforcement
- **Vendor dashboard** — manage profile, photos, availability, bookings, events, and featured-listing upgrades
- **Customer dashboard** — bookmarks, bookings, messages, and notifications
- **Admin dashboard** — moderation queue, vendor approvals/rejections, user management, audit log, platform stats
- **Blog / news** — Markdown-backed posts with categories, tags, and reading-time
- **Events** — RSVP, capacity, organizer pages
- **Reviews & threads** — star ratings, threaded vendor replies, admin moderation
- **Real-time updates** — every list/detail view is reactive via Convex subscriptions
- **Rate limiting** — per-IP/per-email backoff in mutations
- **Audit log** — every privileged action is recorded with before/after snapshots
- **Notifications** — in-app bell with unread badge and unread filtering
- **Cron jobs** — auto-expire featured listings, publish scheduled blog posts

---

## 🧱 Tech Stack

| Layer            | Choice                                                      |
|------------------|-------------------------------------------------------------|
| Framework        | Next.js 16 (App Router, Turbopack)                          |
| UI               | React 19, Tailwind CSS v4, shadcn/ui, Radix                 |
| Realtime DB      | [Convex](https://convex.dev) 1.42 (self-hosted)             |
| Auth             | NextAuth (JWT) + Convex auth helpers                        |
| Password hashing | Web Crypto **PBKDF2** (Edge-compatible, no bcrypt)          |
| Forms / search   | React Hook Form, Zod, debounced input                       |
| Toasts           | Sonner                                                       |
| Markdown         | `react-markdown` (admin post composer)                       |
| Image upload     | Browser-side compression + Convex file storage              |
| Testing          | Vitest, Playwright                                           |
| Package manager  | Bun                                                           |

---

## 🗂 Project Structure

```
.
├── convex/                          # Backend (Convex functions + schema)
│   ├── schema.ts                    #   13-table schema, all indexes
│   ├── _helpers.ts                  #   auth, rate-limit, audit, notify
│   ├── users.ts                     #   register, me, changePassword, deleteAccount
│   ├── vendors.ts                   #   CRUD, search, featured, sweep
│   ├── events.ts                    #   CRUD, RSVP, trackView
│   ├── bookings.ts                  #   request, confirm, decline, cancel
│   ├── bookmarks.ts                 #   toggle, isBookmarked
│   ├── posts.ts                     #   blog CRUD, publish, schedule
│   ├── reviews.ts                   #   create, hide, admin actions
│   ├── threads.ts                   #   vendor↔customer messaging
│   ├── notifications.ts             #   list, markRead
│   ├── stats.ts                     #   dashboard aggregations
│   └── crons.ts                     #   featured-sweep, scheduled-publish
│
├── src/                             # Frontend (Next.js App Router)
│   ├── app/                         #   routes — root SPA at /, JSON APIs at /api/*
│   ├── components/                  #   views/, shared/, ui/, providers/
│   ├── lib/                         #   convex-server, session, store, serializers
│   └── hooks/                       #   custom React hooks
│
├── e2e/                             # Playwright E2E tests
├── examples/                        # Reference patterns (not used in build)
└── convex.json                      # Convex CLI config
```

---

## 🚀 Local Development

### 1. Prerequisites

- **Node 20+** or **Bun** (recommended)
- A running **self-hosted Convex backend** (see [Convex self-hosted docs](https://docs.convex.dev/self-hosted))

### 2. Install

```bash
bun install
# or
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

NEXT_PUBLIC_CONVEX_URL=http://localhost:3210
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=<from your backend's generate_admin_key.sh>
```

### 4. Generate Convex types and push schema

```bash
bunx convex dev        # watches files, pushes on save
# or
bunx convex codegen    # generate types only
bunx convex deploy     # one-shot push
```

### 5. Start the app

```bash
bun dev
# or
bunx next dev
```

Visit `http://localhost:3000`.

---

## 🗃 Data Model (13 tables)

`users` · `vendors` · `events` · `bookings` · `bookmarks` · `posts` · `reviews` · `threads` · `messages` · `notifications` · `auditLog` · `stats` · `featuredSlots`

All tables are indexed for the common query patterns (by `slug`, `userId`, `vendorId`, `category + state`, `createdAt desc`, etc).

See [convex/schema.ts](./convex/schema.ts) for the full schema.

---

## 🔐 Auth Flow

1. User signs up → `users.register` mutation
   - Validates input, rate-limits by email, hashes password with **PBKDF2-SHA-256** (210k iterations)
   - Creates `users` row + (if `signupKind === "vendor"`) a draft `vendors` row
2. User signs in → NextAuth `credentials` provider → JWT cookie
3. Server fetches `users.getMe` to confirm account is not banned / deleted
4. Convex mutations enforce role + ownership with helpers in `_helpers.ts`

---

## 📊 Dashboards

| Role     | Path             | Capabilities                                           |
|----------|------------------|--------------------------------------------------------|
| Customer | `/#customer`     | Bookmarks, bookings, messages, notifications           |
| Vendor   | `/#vendor`       | Profile, photos, availability, bookings, events        |
| Admin    | `/#admin`        | Stats, vendor moderation, user mgmt, audit, blog admin |

---

## 🛠 Available Scripts

```bash
bun dev                # Next.js dev server (Turbopack)
bun build              # Production build
bun start              # Run production build
bun run typecheck      # tsc --noEmit
bun test               # Vitest
bun run lint           # ESLint
bunx convex dev        # Convex watch + push
bunx convex deploy     # Convex one-shot push
bunx convex dashboard  # Open self-hosted dashboard
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome`)
3. Commit (`git commit -m "feat: add awesome thing"`)
4. Push (`git push origin feature/awesome`)
5. Open a Pull Request

---

## 📜 License

MIT — see [LICENSE](./LICENSE).
