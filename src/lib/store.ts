"use client";

import { create } from "zustand";

export type View =
  | "home"
  | "vendor"
  | "become-vendor"
  | "customer-dashboard"
  | "vendor-dashboard"
  | "admin-dashboard"
  | "blog"
  | "blog-detail"
  | "events"
  | "event-detail";

type SearchFilters = {
  q: string;
  category: string;
  state: string;
  sort: "featured" | "rating" | "newest" | "reviews";
};

type AppState = {
  view: View;
  selectedVendorId: string | null;
  selectedPostId: string | null;
  selectedEventId: string | null;
  filters: SearchFilters;
  authOpen: boolean;
  authMode: "login" | "signup" | "signup-vendor";
  // actions
  goHome: (filters?: Partial<SearchFilters>) => void;
  openVendor: (id: string) => void;
  openBecomeVendor: () => void;
  openCustomerDashboard: () => void;
  openVendorDashboard: () => void;
  openAdminDashboard: () => void;
  openBlog: () => void;
  openBlogPost: (id: string) => void;
  openEvents: () => void;
  openEvent: (id: string) => void;
  setFilters: (f: Partial<SearchFilters>) => void;
  openAuth: (mode?: "login" | "signup" | "signup-vendor") => void;
  closeAuth: () => void;
  // url sync
  hydrateFromUrl: () => void;
};

const DEFAULT_FILTERS: SearchFilters = {
  q: "",
  category: "",
  state: "",
  sort: "featured",
};

function parseView(v: string | null): View {
  const valid: View[] = [
    "home",
    "vendor",
    "become-vendor",
    "customer-dashboard",
    "vendor-dashboard",
    "admin-dashboard",
    "blog",
    "blog-detail",
    "events",
    "event-detail",
  ];
  return (valid as string[]).includes(v || "") ? (v as View) : "home";
}

// Serialize current state into a URL query string (without leading ?)
export function serializeState(state: {
  view: View;
  selectedVendorId: string | null;
  selectedPostId: string | null;
  selectedEventId: string | null;
  filters: SearchFilters;
}): string {
  const params = new URLSearchParams();
  if (state.view !== "home") params.set("view", state.view);
  if (state.view === "vendor" && state.selectedVendorId) {
    params.set("id", state.selectedVendorId);
  }
  if (state.view === "blog-detail" && state.selectedPostId) {
    params.set("id", state.selectedPostId);
  }
  if (state.view === "event-detail" && state.selectedEventId) {
    params.set("id", state.selectedEventId);
  }
  if (state.view === "home") {
    if (state.filters.q) params.set("q", state.filters.q);
    if (state.filters.category) params.set("category", state.filters.category);
    if (state.filters.state) params.set("state", state.filters.state);
    if (state.filters.sort !== "featured") params.set("sort", state.filters.sort);
  }
  return params.toString();
}

// Hydrate state from the current window URL
export function hydrateState(): {
  view: View;
  selectedVendorId: string | null;
  selectedPostId: string | null;
  selectedEventId: string | null;
  filters: SearchFilters;
} {
  if (typeof window === "undefined") {
    return { view: "home", selectedVendorId: null, selectedPostId: null, selectedEventId: null, filters: DEFAULT_FILTERS };
  }
  const params = new URLSearchParams(window.location.search);
  const view = parseView(params.get("view"));
  const id = params.get("id");
  const filters: SearchFilters = {
    q: params.get("q") || "",
    category: params.get("category") || "",
    state: params.get("state") || "",
    sort: (params.get("sort") as SearchFilters["sort"]) || "featured",
  };
  return {
    view,
    selectedVendorId: view === "vendor" ? id : null,
    selectedPostId: view === "blog-detail" ? id : null,
    selectedEventId: view === "event-detail" ? id : null,
    filters,
  };
}

// Initialize state from the URL on the client so deep-links render
// immediately without a flash of the home view.
const initial = typeof window !== "undefined" ? hydrateState() : { view: "home" as View, selectedVendorId: null, selectedPostId: null, selectedEventId: null, filters: DEFAULT_FILTERS };

export const useAppStore = create<AppState>((set, get) => ({
  view: initial.view,
  selectedVendorId: initial.selectedVendorId,
  selectedPostId: initial.selectedPostId,
  selectedEventId: initial.selectedEventId,
  filters: initial.filters,
  authOpen: false,
  authMode: "login",
  goHome: (filters) =>
    set((s) => ({
      view: "home",
      selectedVendorId: null,
      selectedPostId: null,
      selectedEventId: null,
      filters: filters ? { ...s.filters, ...filters } : s.filters,
    })),
  openVendor: (id) => set({ view: "vendor", selectedVendorId: id, selectedPostId: null, selectedEventId: null }),
  openBecomeVendor: () => set({ view: "become-vendor", selectedVendorId: null, selectedPostId: null, selectedEventId: null }),
  openCustomerDashboard: () =>
    set({ view: "customer-dashboard", selectedVendorId: null, selectedPostId: null, selectedEventId: null }),
  openVendorDashboard: () =>
    set({ view: "vendor-dashboard", selectedVendorId: null, selectedPostId: null, selectedEventId: null }),
  openAdminDashboard: () =>
    set({ view: "admin-dashboard", selectedVendorId: null, selectedPostId: null, selectedEventId: null }),
  openBlog: () => set({ view: "blog", selectedPostId: null, selectedEventId: null }),
  openBlogPost: (id) => set({ view: "blog-detail", selectedPostId: id, selectedEventId: null }),
  openEvents: () => set({ view: "events", selectedEventId: null, selectedPostId: null }),
  openEvent: (id) => set({ view: "event-detail", selectedEventId: id, selectedPostId: null }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  openAuth: (mode = "login") => set({ authOpen: true, authMode: mode }),
  closeAuth: () => set({ authOpen: false }),
  hydrateFromUrl: () => {
    const next = hydrateState();
    set(next);
  },
}));

// Helper to sync current state to the URL (called from the page on state change).
//
// Navigation (a change in view or the selected vendor/post/event id) pushes a
// new history entry so the browser Back button works. Filter tweaks (search
// text, category, state, sort) replace the current entry so typing in the
// search box doesn't flood the history stack. The page's popstate listener
// re-hydrates the store on Back/Forward, so no explicit handling is needed here.
let lastNavKey: string | null = null;

function navKey(s: {
  view: View;
  selectedVendorId: string | null;
  selectedPostId: string | null;
  selectedEventId: string | null;
}): string {
  return [s.view, s.selectedVendorId, s.selectedPostId, s.selectedEventId].join("|");
}

export function syncUrl(state: {
  view: View;
  selectedVendorId: string | null;
  selectedPostId: string | null;
  selectedEventId: string | null;
  filters: SearchFilters;
}) {
  if (typeof window === "undefined") return;
  const qs = serializeState(state);
  const url = qs ? `/?${qs}` : "/";

  const key = navKey(state);
  // A genuine navigation (view or id changed) → push a new history entry.
  // Otherwise (filters changed on the same view) → replace the current entry.
  const isNavigation = key !== lastNavKey;
  if (isNavigation) {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
  lastNavKey = key;
}

// Called when the store is hydrated from the URL (on load and on popstate) so
// that the next syncUrl knows whether a subsequent change is a navigation.
export function resetNavKey(state: {
  view: View;
  selectedVendorId: string | null;
  selectedPostId: string | null;
  selectedEventId: string | null;
}) {
  lastNavKey = navKey(state);
}
