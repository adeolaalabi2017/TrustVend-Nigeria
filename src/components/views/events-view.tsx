"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { CalendarDays, MapPin, Search, Ticket } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import { CATEGORIES, NIGERIAN_STATES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EventsView() {
  const { openEvent, goHome } = useAppStore();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");

  const data = useQuery(api.events.list, {
    category: category || undefined,
    state: state || undefined,
    limit: 50,
  });
  const isLoading = data === undefined;

  const events = (data?.items ?? []).filter((e: any) =>
    !q ? true : (e.title + e.description + e.location).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <Button variant="ghost" size="sm" onClick={() => goHome()} className="mb-4 -ml-2">
        ← Back to home
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover upcoming events from trusted Nigerian vendors.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events..."
            className="pl-9"
            aria-label="Search events"
          />
        </div>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={state || "all"} onValueChange={(v) => setState(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[150px]">
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

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">No events found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters, or check back soon.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e: any) => (
            <Card
              key={e.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition group"
              onClick={() => openEvent(e.id)}
            >
              {e.coverImage && (
                <div className="aspect-[16/10] overflow-hidden bg-muted relative">
                  <img
                    src={e.coverImage}
                    alt={e.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {format(new Date(e.eventDate), "EEE, MMM d")}
                    </p>
                    <p className="text-[10px] opacity-90">
                      {format(new Date(e.eventDate), "h:mm a")}
                    </p>
                  </div>
                </div>
              )}
              <div className="p-4">
                {e.category && (
                  <span className="text-[11px] font-medium text-primary">{e.category}</span>
                )}
                <h3 className="font-bold text-base leading-tight mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {e.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{e.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {e.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {e.location}
                    </span>
                  )}
                  {e.price && (
                    <span className="flex items-center gap-1">
                      <Ticket className="h-3 w-3" />
                      {e.price}
                    </span>
                  )}
                </div>
                {e.vendor && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                    {e.vendor.photo && (
                      <img src={e.vendor.photo} alt="" className="h-4 w-4 rounded-full object-cover" />
                    )}
                    <span className="text-[11px] text-muted-foreground">{e.vendor.businessName}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}