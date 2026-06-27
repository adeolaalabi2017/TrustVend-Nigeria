# Convex (self-hosted)

This directory holds the Convex schema and server functions for the
TrustVend Nigeria app. The current `convex/schema.ts` is a minimal
scaffold — a `health` table + ping query/mutation — so you can verify
the connection to your self-hosted Convex backend before porting the
full Prisma data layer.

## Layout

- [`schema.ts`](./schema.ts) — table definitions (`defineSchema` / `defineTable`).
- [`health.ts`](./health.ts) — sample `query` and `mutation` used as a smoke test.
- `_generated/` — auto-generated types and client. Created by `convex dev`.

## One-time setup

1. **Copy env template** and fill in the Convex block:
   ```bash
   cp .env.example .env.local
   ```
   Set:
   - `NEXT_PUBLIC_CONVEX_URL` — the URL of your self-hosted Convex backend.
   - `CONVEX_DEPLOYMENT` — `self-hosted:<NEXT_PUBLIC_CONVEX_URL without scheme>`.
   - `CONVEX_DEPLOY_KEY` — generated from your self-hosted dashboard
     (Settings → Deploy Keys).

2. **Start the dev sync** (generates `_generated/`, pushes schema, watches for changes):
   ```bash
   bun run convex:dev
   ```

3. **Wire the client** — the app already wraps `<ConvexClientProvider>` around
   the tree (see `src/components/providers.tsx`). The provider reads
   `process.env.NEXT_PUBLIC_CONVEX_URL` automatically.

## Useful scripts

| Script | What it does |
| --- | --- |
| `bun run convex:dev` | Run codegen + push schema + watch for function changes (dev). |
| `bun run convex:deploy` | Push schema + functions to a self-hosted instance (prod). |
| `bun run convex:codegen` | Regenerate `convex/_generated/*` types only. |

## Smoke test

After `bun run convex:dev` is up and the self-hosted instance is reachable,
the following in any React client component confirms a full round trip:

```tsx
"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

export function ConvexHealth() {
  const ping = useMutation(api.health.ping);
  const latest = useQuery(api.health.latest);
  return (
    <div>
      <button onClick={() => ping({ message: "hello" })}>Ping</button>
      <pre>{JSON.stringify(latest, null, 2)}</pre>
    </div>
  );
}
```

## Source

The `convex` package is published from the official
[get-convex/convex-js](https://github.com/get-convex/convex-js) GitHub repo.
The package on npm and the source in that repo are kept in lockstep.
