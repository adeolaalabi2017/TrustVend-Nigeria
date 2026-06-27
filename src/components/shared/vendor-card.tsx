"use client";

import { Bookmark, MapPin, Eye, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { StarRating } from "@/components/shared/star-rating";
import { CategoryIcon } from "@/components/shared/category-icon";
import { useAppStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import { api } from "convex/_generated/api";
import { toast } from "sonner";
import type { VendorCard as TVendorCard } from "@/lib/vendor-serializer";
import { cn } from "@/lib/utils";

export function VendorCard({ vendor }: { vendor: TVendorCard }) {
  const { data: session } = useSession();
  const openVendor = useAppStore((s) => s.openVendor);
  const openAuth = useAppStore((s) => s.openAuth);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const toggleBookmark = useMutation(api.bookmarks.toggle);

  const cover = vendor.photos[0] || "/vendors/placeholder.png";

  function handleOpen() {
    openVendor(vendor.id);
  }

  async function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    if (!session) {
      openAuth("login");
      toast.info("Please sign in to save vendors.");
      return;
    }
    setLoading(true);
    try {
      const res = await toggleBookmark({ userId: session.user.id, vendorId: vendor.id });
      setBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? "Saved to your list." : "Removed from your list.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      onClick={handleOpen}
      className="group relative overflow-hidden cursor-pointer border-border/70 transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={cover}
          alt={vendor.businessName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {vendor.featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-400 text-amber-950 px-2 py-0.5 text-[10px] font-bold shadow">
            ★ Featured
          </span>
        )}

        {!vendor.available && (
          <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-rose-600/90 text-white px-2 py-0.5 text-[10px] font-semibold">
            Unavailable
          </span>
        )}

        <button
          onClick={handleBookmark}
          disabled={loading}
          aria-label="Bookmark vendor"
          className={cn(
            "absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur text-foreground shadow transition hover:bg-white",
            bookmarked && "text-emerald-600"
          )}
        >
          <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
        </button>
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-sm leading-snug line-clamp-1">{vendor.businessName}</h3>
          {vendor.verified && <VerifiedBadge size="sm" />}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{[vendor.city, vendor.state].filter(Boolean).join(", ") || vendor.state}</span>
        </div>

        <div className="flex items-center justify-between">
          <StarRating value={vendor.ratingAvg} />
          {vendor.ratingCount > 0 && (
            <span className="text-[10px] text-muted-foreground">({vendor.ratingCount})</span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {vendor.views > 999 ? `${(vendor.views / 1000).toFixed(1)}k` : vendor.views}
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            <CategoryIcon category={vendor.category} />
            <span>{vendor.category}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
