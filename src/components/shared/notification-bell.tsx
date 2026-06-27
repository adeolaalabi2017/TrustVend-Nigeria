"use client";

import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, string> = {
  NEW_MESSAGE: "📨",
  NEW_ENQUIRY: "📨",
  NEW_REVIEW: "⭐",
  VENDOR_APPROVED: "🎉",
  VENDOR_REJECTED: "⚠️",
  VERIFIED: "✅",
  BOOKING_REQUEST: "📅",
  BOOKING_CONFIRMED: "✅",
  BOOKING_DECLINED: "❌",
  BOOKING_CANCELLED: "🚫",
  ACCOUNT_BANNED: "⛔",
  REVIEW_HIDDEN: "🚫",
};

export function NotificationBell() {
  const { data: session } = useSession();
  const { goHome, openVendorDashboard, openCustomerDashboard } = useAppStore();
  const userId = (session?.user as any)?.id ?? "";

  const data = useQuery(api.notifications.list, { userId });
  const markRead = useMutation(api.notifications.markRead);

  const notifications = data?.items ?? [];
  const unread = data?.unread ?? 0;

  async function handleMarkAll() {
    try {
      await markRead({ userId, all: true });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function handleClick(link?: string | null) {
    if (!link) return;
    if (link.startsWith("vendor:")) {
      const id = link.split(":")[1];
      useAppStore.getState().openVendor(id);
    } else if (link === "vendor-dashboard") {
      openVendorDashboard();
    } else if (link === "customer-dashboard") {
      openCustomerDashboard();
    } else if (link === "become-vendor") {
      useAppStore.getState().openBecomeVendor();
    } else {
      goHome();
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 text-white text-[9px] font-bold px-1 ring-2 ring-card">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <p className="font-semibold text-sm">Notifications</p>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scroll-area-custom">
          {data === undefined ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
            </div>
          ) : (
            notifications.map((n: any) => (
              <button
                key={n._id}
                onClick={() => handleClick(n.link)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/40 hover:bg-accent/50 transition flex gap-2.5",
                  !n.read && "bg-primary/5"
                )}
              >
                <span className="text-lg shrink-0 leading-none mt-0.5">
                  {TYPE_ICON[n.type] || "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
