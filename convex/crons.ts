/**
 * TrustVend Nigeria — Scheduled (cron) functions.
 *
 * Convex supports built-in cron jobs. This module is the cron manifest.
 * It runs in the Convex backend, so it can call our other functions
 * via the scheduler API.
 *
 * For self-hosted, set up the same cadence via:
 *   - docker exec / fly ssh + node script that hits a Convex function, OR
 *   - the Convex dashboard's "Scheduled Functions" tab.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

// Every 5 minutes, drop featured flags whose window has expired.
crons.interval(
  "sweep expired featured vendors",
  { minutes: 5 },
  internal.crons.sweepExpiredFeatured
);

export default crons;

/** The actual handler — invoked by the cron above. */
export const sweepExpiredFeatured = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db
      .query("vendors")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
    let cleared = 0;
    for (const v of all) {
      if (v.featuredUntil && v.featuredUntil < now) {
        await ctx.db.patch(v._id, {
          featured: false,
          featuredUntil: undefined,
          updatedAt: now,
        });
        cleared += 1;
      }
    }
    return { cleared };
  },
});
