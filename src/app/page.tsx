"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppStore, syncUrl, hydrateState, resetNavKey } from "@/lib/store";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { AuthDialog } from "@/components/shared/auth-dialog";
import { HomeView } from "@/components/views/home-view";
import { Skeleton } from "@/components/ui/skeleton";

const VendorDetailView = dynamic(
  () => import("@/components/views/vendor-detail-view").then((m) => m.VendorDetailView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);
const BecomeVendorView = dynamic(
  () => import("@/components/views/become-vendor-view").then((m) => m.BecomeVendorView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);
const CustomerDashboardView = dynamic(
  () => import("@/components/views/customer-dashboard-view").then((m) => m.CustomerDashboardView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);
const VendorDashboardView = dynamic(
  () => import("@/components/views/vendor-dashboard-view").then((m) => m.VendorDashboardView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);
const AdminDashboardView = dynamic(
  () => import("@/components/views/admin-dashboard-view").then((m) => m.AdminDashboardView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);
const BlogView = dynamic(
  () => import("@/components/views/blog-view").then((m) => m.BlogView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);
const BlogDetailView = dynamic(
  () => import("@/components/views/blog-detail-view").then((m) => m.BlogDetailView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);
const EventsView = dynamic(
  () => import("@/components/views/events-view").then((m) => m.EventsView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);
const EventDetailView = dynamic(
  () => import("@/components/views/event-detail-view").then((m) => m.EventDetailView),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> }
);

export default function Home() {
  const view = useAppStore((s) => s.view);
  const selectedVendorId = useAppStore((s) => s.selectedVendorId);
  const selectedPostId = useAppStore((s) => s.selectedPostId);
  const selectedEventId = useAppStore((s) => s.selectedEventId);
  const filters = useAppStore((s) => s.filters);
  const hydrateFromUrl = useAppStore((s) => s.hydrateFromUrl);

  useEffect(() => {
    hydrateFromUrl();
    // Seed the nav key so the first real navigation pushes (not replaces),
    // while avoiding spurious pushes for the initial hydrated URL.
    resetNavKey(hydrateState());
  }, [hydrateFromUrl]);

  useEffect(() => {
    const current = hydrateState();
    if (
      current.view === view &&
      current.selectedVendorId === selectedVendorId &&
      current.selectedPostId === selectedPostId &&
      current.selectedEventId === selectedEventId &&
      current.filters.q === filters.q &&
      current.filters.category === filters.category &&
      current.filters.state === filters.state &&
      current.filters.sort === filters.sort
    ) {
      return;
    }
    syncUrl({ view, selectedVendorId, selectedPostId, selectedEventId, filters });
  }, [view, selectedVendorId, selectedPostId, selectedEventId, filters]);

  useEffect(() => {
    const onPop = () => {
      hydrateFromUrl();
      // Re-seed so navigating after Back/Forward pushes correctly.
      resetNavKey(hydrateState());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hydrateFromUrl]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view, selectedVendorId, selectedPostId, selectedEventId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {view === "home" && <HomeView />}
        {view === "vendor" && <VendorDetailView />}
        {view === "become-vendor" && <BecomeVendorView />}
        {view === "customer-dashboard" && <CustomerDashboardView />}
        {view === "vendor-dashboard" && <VendorDashboardView />}
        {view === "admin-dashboard" && <AdminDashboardView />}
        {view === "blog" && <BlogView />}
        {view === "blog-detail" && <BlogDetailView />}
        {view === "events" && <EventsView />}
        {view === "event-detail" && <EventDetailView />}
      </main>
      <Footer />
      <AuthDialog />
    </div>
  );
}
