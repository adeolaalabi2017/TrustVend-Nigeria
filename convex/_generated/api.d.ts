/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers from "../_helpers.js";
import type * as bookings from "../bookings.js";
import type * as bookmarks from "../bookmarks.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as reviews from "../reviews.js";
import type * as stats from "../stats.js";
import type * as threads from "../threads.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  bookings: typeof bookings;
  bookmarks: typeof bookmarks;
  crons: typeof crons;
  events: typeof events;
  notifications: typeof notifications;
  posts: typeof posts;
  reviews: typeof reviews;
  stats: typeof stats;
  threads: typeof threads;
  users: typeof users;
  vendors: typeof vendors;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
