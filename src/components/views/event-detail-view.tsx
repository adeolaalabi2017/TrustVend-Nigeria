"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
  Bookmark,
  CalendarPlus,
  Share2,
  ExternalLink,
  Store,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function EventDetailView() {
  const { selectedEventId, openEvents, openVendor, openAuth } = useAppStore();
  const { data: session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const data = useQuery(api.events.getById, {
    id: selectedEventId ?? "",
    viewerId: session?.user?.id ?? undefined,
  });
  const isLoading = selectedEventId ? data === undefined : false;

  const toggleBookmark = useMutation(api.bookmarks.toggleEventBookmark);
  const removeEvent = useMutation(api.events.remove);

  const event = data?.event;
  const isOrganizer = !!data?.isOrganizer;
  const bookmarked = !!data?.bookmarked;

  async function handleBookmark() {
    if (!session) {
      openAuth("login");
      return;
    }
    if (!event) return;
    try {
      const res = await toggleBookmark({ userId: session.user.id, eventId: event.id });
      toast.success(res.bookmarked ? "Event saved!" : "Removed from saved events.");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function addToCalendar() {
    if (!event) return;
    const start = new Date(event.eventDate);
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
    const fmtCal = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const esc = (s: string) =>
      (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TrustVend//Event//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@trustvend.ng`,
      `DTSTAMP:${fmtCal(new Date())}`,
      `DTSTART:${fmtCal(start)}`,
      `DTEND:${fmtCal(end)}`,
      `SUMMARY:${esc(event.title)}`,
      `DESCRIPTION:${esc(event.description)}`,
      `LOCATION:${esc(event.location || "")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.slug || "event"}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Event added to your calendar!");
  }

  function share(social?: "twitter" | "facebook" | "whatsapp") {
    const url = window.location.href;
    const text = `Check out this event: ${event?.title}`;
    if (social === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    } else if (social === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    } else if (social === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    } else {
      if (navigator.share) {
        navigator.share({ title: event?.title, text, url }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    }
  }

  async function handleDelete() {
    if (!event || !session) return;
    try {
      await removeEvent({ userId: session.user.id, id: event.id });
      toast.success("Event deleted.");
      openEvents();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
        <p className="text-lg font-semibold">Event not found.</p>
        <Button className="mt-4" onClick={() => openEvents()}>Back to events</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Button variant="ghost" size="sm" onClick={() => openEvents()} className="mb-4 -ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to events
      </Button>

      {event.coverImage && (
        <div className="rounded-2xl overflow-hidden bg-muted mb-6">
          <img src={event.coverImage} alt={event.title} className="w-full aspect-[16/9] object-cover" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {event.category && <Badge variant="secondary">{event.category}</Badge>}
        {event.price && (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <Ticket className="mr-1 h-3 w-3" /> {event.price}
          </Badge>
        )}
        {event.vendor && (
          <Badge variant="outline">
            <Store className="mr-1 h-3 w-3" /> {event.vendor.businessName}
          </Badge>
        )}
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
        {event.title}
      </h1>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-primary" />
          {format(new Date(event.eventDate), "EEEE, MMMM d, yyyy")}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          {format(new Date(event.eventDate), "h:mm a")}
          {event.endDate && ` – ${format(new Date(event.endDate), "h:mm a")}`}
        </span>
        {event.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            {event.location}{event.state ? `, ${event.state}` : ""}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" />
          {event.views} views
        </span>
      </div>

      <div className="mt-6 prose prose-sm sm:prose-base max-w-none dark:prose-invert">
        <p className="whitespace-pre-line text-foreground/90 leading-relaxed">{event.description}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          variant={bookmarked ? "default" : "outline"}
          onClick={handleBookmark}
        >
          <Bookmark className={cn("mr-2 h-4 w-4", bookmarked && "fill-current")} />
          {bookmarked ? "Saved" : "Save event"}
        </Button>
        <Button variant="outline" onClick={addToCalendar}>
          <CalendarPlus className="mr-2 h-4 w-4" /> Add to calendar
        </Button>
        {event.rsvpLink && (
          <Button asChild>
            <a href={event.rsvpLink} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> RSVP / Get tickets
            </a>
          </Button>
        )}
        {isOrganizer && (
          <Button variant="ghost" className="text-rose-600" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Share2 className="h-4 w-4" /> Share:
        </span>
        <Button size="sm" variant="ghost" onClick={() => share("twitter")} className="text-xs">
          𝕏 Twitter
        </Button>
        <Button size="sm" variant="ghost" onClick={() => share("facebook")} className="text-xs">
          Facebook
        </Button>
        <Button size="sm" variant="ghost" onClick={() => share("whatsapp")} className="text-xs">
          WhatsApp
        </Button>
        <Button size="sm" variant="ghost" onClick={() => share()} className="text-xs">
          Copy link
        </Button>
      </div>

      {event.vendor && (
        <Card
          className="mt-6 p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition"
          onClick={() => event.vendor && openVendor(event.vendor.id)}
        >
          {event.vendor.photo ? (
            <img src={event.vendor.photo} alt="" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </span>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold">Hosted by {event.vendor.businessName}</p>
            <p className="text-xs text-muted-foreground">View vendor profile →</p>
          </div>
        </Card>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The event and all its bookmarks will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}