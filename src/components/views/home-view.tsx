"use client";

import { useQuery } from "convex/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  ShieldCheck,
  Store,
  Users,
  BadgeCheck,
  ArrowRight,
  Sparkles,
  Quote,
  AlertCircle,
  Loader2,
  Star,
  Newspaper,
  CalendarDays,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorCard } from "@/components/shared/vendor-card";
import { CategoryIcon } from "@/components/shared/category-icon";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { useAppStore } from "@/lib/store";
import { api } from "convex/_generated/api";
import { CATEGORIES, NIGERIAN_STATES, VERIFICATION_STAGES } from "@/lib/constants";
import { cn, debounce } from "@/lib/utils";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

export function HomeView() {
  const { filters, setFilters, goHome, openBecomeVendor, openAuth, openBlog, openBlogPost, openEvents, openEvent } = useAppStore();
  const [page, setPage] = useState(1);

  // Local mirror of the search input. Commits to the global store (and
  // therefore URL + Convex query) only after the user stops typing, so a
  // single search like "fashion" produces one history entry and one query.
  const [searchInput, setSearchInput] = useState(filters.q);

  // Keep local input in sync if filters change elsewhere (e.g. clearing via
  // "Clear filters" button or via URL hydration).
  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  // Debounced commit. Updated whenever `searchInput` changes.
  const commitSearch = useMemo(
    () =>
      debounce((value: string) => {
        setPage(1);
        setFilters({ q: value });
      }, SEARCH_DEBOUNCE_MS),
    [setFilters],
  );

  useEffect(() => {
    return () => {
      commitSearch.cancel();
    };
  }, [commitSearch]);

  const statsData = useQuery(api.stats.home);
  const featuredData = useQuery(api.vendors.featured, { limit: 60 });
  const browseData = useQuery(api.vendors.list, {
    q: filters.q || undefined,
    category: filters.category || undefined,
    state: filters.state || undefined,
    sort: (filters.sort === "featured" ? "featured" : filters.sort === "rating" ? "rating" : filters.sort === "reviews" ? "mostReviewed" : "recent") as any,
    limit: PAGE_SIZE,
    cursor: page > 1 ? String((page - 1) * PAGE_SIZE) : undefined,
  });
  const blogData = useQuery(api.posts.list, { onlyPublished: true, limit: 3 });
  const eventsData = useQuery(api.events.list, { limit: 3 });

  const isLoadingBrowse = browseData === undefined;
  const allVendors = featuredData ?? [];
  const featured = allVendors.filter((v: any) => v.featured).slice(0, 4);
  const browseVendors = browseData?.items ?? [];
  const total = browseData?.total ?? 0;
  const hasMore = browseData?.nextCursor !== undefined;
  const blogPosts = blogData?.items ?? [];
  const homeEvents = eventsData?.items ?? [];

  const stats = [
    { label: "Verified Vendors", value: statsData ? String(statsData.verified) : "—", icon: BadgeCheck },
    { label: "Categories", value: statsData ? String(statsData.categories) : String(CATEGORIES.length), icon: Store },
    { label: "Customers", value: statsData ? String(statsData.customers) : "—", icon: Users },
    { label: "Nigerian States", value: statsData ? String(statsData.states) : "—", icon: MapPin },
  ];

  function updateFilters(f: Partial<typeof filters>) {
    setPage(1);
    setFilters(f);
  }

  return (
    <div>
      {/* HERO */}
      <section className="hero-gradient border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Nigeria&apos;s trusted Instagram vendor directory
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Find <span className="text-primary">trusted</span> Instagram
                vendors across Nigeria.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Discover Verified Instagram businesses and Vendors - Find real
                vendors, read reviews and interact with confidence.
              </p>

              {/* Search bar */}
              <div className="flex flex-col sm:flex-row gap-2 bg-card rounded-2xl p-2 shadow-lg ring-1 ring-border/60">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      commitSearch(e.target.value);
                    }}
                    placeholder="Search vendors, products, services..."
                    className="pl-9 border-0 shadow-none focus-visible:ring-0 h-11"
                    aria-label="Search vendors"
                  />
                </div>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(v) => updateFilters({ category: v === "all" ? "" : v })}
                >
                  <SelectTrigger className="w-full sm:w-[200px] border-0 shadow-none h-11">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.state || "all"}
                  onValueChange={(v) => updateFilters({ state: v === "all" ? "" : v })}
                >
                  <SelectTrigger className="w-full sm:w-[160px] border-0 shadow-none h-11">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {NIGERIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick categories */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    onClick={() => updateFilters({ category: c })}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
                      filters.category === c
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-card ring-border hover:ring-primary/40 hover:text-primary"
                    )}
                  >
                    <CategoryIcon category={c} className="h-3.5 w-3.5" />
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border">
                <Image
                  src="/vendors/hero.png"
                  alt="Nigerian vendors and customers"
                  width={800}
                  height={440}
                  className="w-full h-[440px] object-cover"
                  priority
                />
              </div>
              <div className="absolute -bottom-5 -left-5 bg-card rounded-2xl shadow-xl ring-1 ring-border p-4 w-56">
                <div className="flex items-center gap-2 mb-1">
                  <VerifiedBadge />
                  <span className="text-xs text-muted-foreground">TrustVend checked</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Instagram verified · Manual review · Fee paid
                </p>
              </div>
              <div className="absolute -top-4 -right-4 bg-card rounded-2xl shadow-xl ring-1 ring-border p-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-600">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </span>
                <div>
                  <p className="text-xs font-bold">
                    {statsData && statsData.avgRating > 0
                      ? `${statsData.avgRating.toFixed(1)}★ avg rating`
                      : "Real reviews"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">from real customers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12">
            {stats.map((s) => (
              <Card key={s.label} className="p-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xl font-extrabold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Featured Vendors
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Top-rated businesses handpicked for you.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((v: any) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </section>
      )}

      {/* ALL VENDORS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-2xl font-bold">
            {filters.category
              ? filters.category
              : filters.q
              ? `Results for "${filters.q}"`
              : "Browse All Vendors"}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {total} {total === 1 ? "vendor" : "vendors"}
            </span>
            <Select
              value={filters.sort}
              onValueChange={(v) => updateFilters({ sort: v as any })}
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured first</SelectItem>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="reviews">Most reviewed</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoadingBrowse ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        ) : browseVendors.length === 0 ? (
          <Card className="p-12 text-center">
            <Store className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No vendors found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => goHome({ q: "", category: "", state: "" })}
            >
              Clear filters
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {browseVendors.map((v: any) => (
                <VendorCard key={v.id} vendor={v} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPage((p) => p + 1)}
                >
                  <Loader2 className="mr-2 h-4 w-4" />
                  Load more vendors
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* TRUST SYSTEM */}
      <section className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              The Trust System
            </div>
            <h2 className="text-3xl font-bold">How verification works</h2>
            <p className="text-muted-foreground mt-2">
              Every Verified ✓ badge means a vendor has passed our three-layer
              trust check. That&apos;s the TrustVend difference.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {VERIFICATION_STAGES.slice(0, 3).map((stage, i) => (
              <Card key={stage.key} className="p-6 relative overflow-hidden">
                <span className="absolute top-4 right-4 text-5xl font-extrabold text-primary/10">
                  {i + 1}
                </span>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h3 className="font-bold text-lg">{stage.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{stage.desc}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-emerald-600 text-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-8 w-8 shrink-0" />
              <div>
                <p className="font-bold text-lg">Pass all three = Verified ✓</p>
                <p className="text-emerald-50 text-sm">
                  Customers know this vendor has been checked by our team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              quote: "I was almost scammed by a fake vendor on Instagram. TrustVend helped me find real, verified sellers. Now I shop with peace of mind.",
              name: "Chioma O.",
              role: "Customer, Lagos",
            },
            {
              quote: "Since getting verified on TrustVend, my enquiries tripled. Customers trust the badge and book without hesitation.",
              name: "Amara N.",
              role: "Glow By Amara",
            },
            {
              quote: "Finally a place where small Nigerian businesses can be found and trusted. This is what we needed.",
              name: "Tunde A.",
              role: "Customer, Abuja",
            },
          ].map((t) => (
            <Card key={t.name} className="p-6">
              <Quote className="h-7 w-7 text-primary/30 mb-3" />
              <p className="text-sm leading-relaxed">{t.quote}</p>
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* BLOG */}
      {blogPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                From the Blog
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tips, stories, and insights for Nigerian vendors and customers.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => openBlog()} className="text-primary">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {blogPosts.map((p: any) => (
              <Card
                key={p.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition group"
                onClick={() => openBlogPost(p.id)}
              >
                {p.coverImage && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <Image
                      src={p.coverImage}
                      alt={p.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-4">
                  {p.tags?.[0] && (
                    <span className="text-[11px] font-medium text-primary">{p.tags[0]}</span>
                  )}
                  <h3 className="font-bold text-base leading-tight mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{p.excerpt}</p>
                  <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
                    <span>{p.authorName ?? "TrustVend"}</span>
                    <span>•</span>
                    <span>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* EVENTS */}
      {homeEvents.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Upcoming Events
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Workshops, pop-ups, and gatherings from trusted vendors.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEvents()} className="text-primary">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {homeEvents.map((e: any) => (
              <Card
                key={e.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition group"
                onClick={() => openEvent(e.id)}
              >
                {e.coverImage ? (
                  <div className="aspect-[16/10] overflow-hidden bg-muted relative">
                    <Image
                      src={e.coverImage}
                      alt={e.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-3 text-white">
                      <p className="text-xs font-semibold">
                        {new Date(e.eventDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-[10px] opacity-90">
                        {new Date(e.eventDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-primary/10 grid place-items-center">
                    <CalendarDays className="h-10 w-10 text-primary/40" />
                  </div>
                )}
                <div className="p-4">
                  {e.category && <span className="text-[11px] font-medium text-primary">{e.category}</span>}
                  <h3 className="font-bold text-base leading-tight mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {e.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{e.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {e.location}
                      </span>
                    )}
                  </div>
                  {e.vendor && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                      {e.vendor.photo && (
                        <Image
                          src={e.vendor.photo}
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      )}
                      <span className="text-[11px] text-muted-foreground">{e.vendor.businessName}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-emerald-700 text-white p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="relative">
            <Store className="h-10 w-10 mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              Are you an Instagram vendor?
            </h2>
            <p className="text-emerald-50 mt-3 max-w-xl mx-auto">
              Get listed on TrustVend, earn your Verified badge, and reach
              thousands of customers looking for trusted businesses like yours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Button
                size="lg"
                variant="secondary"
                onClick={openBecomeVendor}
                className="font-semibold"
              >
                Apply to be listed
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => openAuth("signup-vendor")}
                className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white"
              >
                Create vendor account
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
