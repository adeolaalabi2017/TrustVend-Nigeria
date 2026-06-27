"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useSession } from "next-auth/react";
import {
  Bookmark,
  CalendarCheck,
  Ticket,
  MessageSquare,
  MapPin,
  X,
  Calendar,
  ArrowLeft,
  Star,
  Heart,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessagesPanel } from "@/components/shared/messages-panel";
import { useAppStore } from "@/lib/store";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export function CustomerDashboardView() {
  const { goHome, openVendor, openEvent } = useAppStore();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [cancelId, setCancelId] = useState<string | null>(null);

  const bookmarks = useQuery(api.bookmarks.listMine, userId ? { userId } : "skip");
  const eventBookmarks = useQuery(api.bookmarks.listEventBookmarks, userId ? { userId } : "skip");
  const bookings = useQuery(api.bookings.listMine, userId ? { userId } : "skip");
  const cancelBooking = useMutation(api.bookings.update);

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
        <p className="text-lg font-semibold">Please log in to view your dashboard.</p>
      </div>
    );
  }

  const isLoading =
    bookmarks === undefined || eventBookmarks === undefined || bookings === undefined;

  async function doCancel() {
    if (!userId || !cancelId) return;
    try {
      await cancelBooking({ userId, bookingId: cancelId, action: "cancel" });
      toast.success("Booking cancelled.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Button variant="ghost" size="sm" onClick={() => goHome()} className="mb-4 -ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to home
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your saved vendors, bookings, and messages.</p>
      </div>

      <Tabs defaultValue="saved">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="saved">
            <Heart className="mr-1 h-3.5 w-3.5" />
            Saved ({bookmarks?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <CalendarCheck className="mr-1 h-3.5 w-3.5" />
            Bookings ({bookings?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="events">
            <Ticket className="mr-1 h-3.5 w-3.5" />
            Events ({eventBookmarks?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="mr-1 h-3.5 w-3.5" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="mt-6">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : (bookmarks ?? []).length === 0 ? (
            <Card className="p-10 text-center">
              <Bookmark className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">No saved vendors yet</p>
              <p className="text-sm text-muted-foreground mt-1">Tap the heart on any vendor to save them here.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bookmarks!.map((b: any) => b.vendor && (
                <Card
                  key={b.vendorId}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition"
                  onClick={() => openVendor(b.vendor.id)}
                >
                  {b.vendor.coverPhoto && (
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      <img src={b.vendor.coverPhoto} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-semibold text-sm line-clamp-1">{b.vendor.businessName}</p>
                    <p className="text-xs text-muted-foreground">{b.vendor.category}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {b.vendor.city || b.vendor.state}
                      {b.vendor.ratingAvg > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {b.vendor.ratingAvg.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : (bookings ?? []).length === 0 ? (
            <Card className="p-10 text-center">
              <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">No bookings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Book a vendor to track your events here.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {bookings!.map((b: any) => (
                <Card key={b._id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("rounded-full", STATUS_STYLE[b.status] ?? "")}>
                        {b.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(b.createdAt))} ago
                      </span>
                    </div>
                    <p className="font-semibold">{b.eventType} · {b.location}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" /> {format(new Date(b.eventDate), "EEE, MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelId(b._id)}
                    disabled={b.status !== "PENDING" && b.status !== "CONFIRMED"}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Cancel
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : (eventBookmarks ?? []).length === 0 ? (
            <Card className="p-10 text-center">
              <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">No saved events yet</p>
              <p className="text-sm text-muted-foreground mt-1">Bookmark events to keep track of them.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {eventBookmarks!.map((b: any) => b.event && (
                <Card
                  key={b.eventId}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition"
                  onClick={() => openEvent(b.event.id)}
                >
                  {b.event.coverImage && (
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img src={b.event.coverImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[11px] font-semibold text-primary uppercase">
                      {format(new Date(b.event.eventDate), "EEE, MMM d")}
                    </p>
                    <p className="font-semibold text-sm line-clamp-2 mt-0.5">{b.event.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {b.event.location}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <Card className="overflow-hidden">
            <MessagesPanel embedded />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>The vendor will be notified. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Keep it</Button>
            <Button variant="destructive" onClick={doCancel}>
              <X className="mr-2 h-4 w-4" /> Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}