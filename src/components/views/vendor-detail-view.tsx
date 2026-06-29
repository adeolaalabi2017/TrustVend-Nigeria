"use client";

import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  MapPin,
  Eye,
  Bookmark,
  MessageCircle,
  Instagram,
  ShieldCheck,
  CheckCircle2,
  Send,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { StarRating, InteractiveStarRating } from "@/components/shared/star-rating";
import { CategoryIcon } from "@/components/shared/category-icon";
import { useAppStore } from "@/lib/store";
import { api } from "convex/_generated/api";
import { VERIFICATION_STAGES } from "@/lib/constants";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function VendorDetailView() {
  const { selectedVendorId: vendorId, goHome, openAuth } = useAppStore();
  const { data: session } = useSession();
  const [activePhoto, setActivePhoto] = useState(0);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const data = useQuery(api.vendors.detail, {
    id: vendorId ?? "",
    viewerId: session?.user?.id ?? undefined,
  });
  const isLoading = vendorId ? data === undefined : false;

  const toggleBookmark = useMutation(api.bookmarks.toggle);
  const trackView = useMutation(api.vendors.trackView);

  // Record exactly one view per vendor per mount — never during render.
  // Guards against StrictMode double-invoke and re-renders from query updates.
  const trackedVendorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!vendorId) return;
    if (!data) return; // wait for first successful query before counting
    if (trackedVendorRef.current === vendorId) return;
    trackedVendorRef.current = vendorId;
    trackView({ vendorId, ip: "0.0.0.0" }).catch(() => {});
  }, [vendorId, data, trackView]);

  const vendor = data?.vendor;
  const reviews = data?.reviews ?? [];
  const bookmarked = !!data?.bookmarked;
  const isOwner = !!data?.isOwner;

  async function handleBookmark() {
    if (!session) { openAuth("login"); return; }
    if (!vendor) return;
    try {
      const res = await toggleBookmark({ userId: session.user.id, vendorId: vendor.id });
      toast.success(res.bookmarked ? "Saved to your list." : "Removed.");
    } catch (e: any) { toast.error(e.message); }
  }

  function handleWhatsApp() {
    if (!vendor?.whatsappNumber) return;
    const num = vendor.whatsappNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${num}`, "_blank", "noopener,noreferrer");
  }

  function handleInstagram() {
    if (!vendor?.instagramUrl) return;
    window.open(vendor.instagramUrl, "_blank", "noopener,noreferrer");
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-9 w-32" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="aspect-[4/3] rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center">
        <p className="text-lg font-semibold">Vendor not found.</p>
        <Button className="mt-4" onClick={() => goHome()}>Back to browse</Button>
      </div>
    );
  }

  const photos = vendor.photos?.length ? vendor.photos : ["/vendors/placeholder.png"];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <Button variant="ghost" size="sm" onClick={() => goHome()} className="mb-4 -ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to browse
      </Button>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Gallery */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted ring-1 ring-border">
            <Image src={photos[activePhoto]} alt={vendor.businessName} fill className="object-cover" priority />
            {vendor.featured && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-400 text-amber-950 px-2.5 py-1 text-xs font-bold shadow">
                ★ Featured
              </span>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scroll-area-custom pb-1">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  className={cn(
                    "relative h-16 w-20 shrink-0 rounded-lg overflow-hidden ring-2 transition",
                    i === activePhoto ? "ring-primary" : "ring-transparent hover:ring-border"
                  )}
                >
                  <Image src={p} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {vendor.verified && <VerifiedBadge size="md" />}
              {vendor.available ? (
                <Badge className="bg-success text-success-fg hover:bg-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-fg mr-1" />Available
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-danger text-danger-fg hover:bg-danger">
                  Unavailable
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{vendor.businessName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CategoryIcon category={vendor.category} className="h-4 w-4 text-primary" />
                {vendor.category}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {vendor.city ? `${vendor.city}, ` : ""}{vendor.state}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {vendor.views} views
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <StarRating value={vendor.ratingAvg} size={16} />
              <span className="text-sm font-semibold">
                {vendor.ratingAvg > 0 ? vendor.ratingAvg.toFixed(1) : "New"}
              </span>
              <span className="text-sm text-muted-foreground">
                ({vendor.ratingCount} {vendor.ratingCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>

          {vendor.availableNote && !vendor.available && (
            <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <CalendarDays className="inline h-4 w-4 mr-1 -mt-0.5" />
                {vendor.availableNote}
              </p>
            </Card>
          )}

          {/* Contact actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="col-span-2"
              size="lg"
              onClick={() => { if (!session) { openAuth("login"); return; } setEnquiryOpen(true); }}
            >
              <MessageCircle className="mr-2 h-4 w-4" />Send Enquiry
            </Button>
            <Button
              variant="outline" size="lg"
              onClick={() => { if (!session) { openAuth("login"); return; } setBookingOpen(true); }}
              className="col-span-2"
            >
              <CalendarDays className="mr-2 h-4 w-4" />Request Booking
            </Button>
            <Button variant="outline" size="lg" onClick={handleWhatsApp}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4 fill-current">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2z"/>
              </svg>
              WhatsApp
            </Button>
            <Button variant="outline" size="lg" onClick={handleInstagram}>
              <Instagram className="mr-2 h-4 w-4" />Instagram
            </Button>
            <Button
              variant={bookmarked ? "default" : "outline"}
              size="lg"
              onClick={handleBookmark}
              className="col-span-2"
            >
              <Bookmark className={cn("mr-2 h-4 w-4", bookmarked && "fill-current")} />
              {bookmarked ? "Saved" : "Save vendor"}
            </Button>
          </div>

          {vendor.verified && (
            <Card className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <p className="font-semibold text-sm">Verified by TrustVend</p>
              </div>
              <div className="space-y-1.5">
                {VERIFICATION_STAGES.slice(0, 3).map((s) => (
                  <div key={s.key} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{s.label}:</span>{" "}
                      <span className="text-muted-foreground">{s.desc}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <Instagram className="h-4 w-4" />
            <span>@{vendor.instagramHandle}</span>
          </div>
        </div>
      </div>

      {/* About + Products */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <Card className="p-5 md:col-span-2">
          <h2 className="font-bold text-lg mb-2">About this business</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {vendor.description || "No description provided yet."}
          </p>
          {vendor.products && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <h3 className="font-semibold text-sm mb-2">Products & Services</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{vendor.products}</p>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Business details</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Category</dt><dd className="font-medium text-right">{vendor.category}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Location</dt><dd className="font-medium text-right">{vendor.city ? `${vendor.city}, ` : ""}{vendor.state}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Status</dt><dd className="font-medium text-right">{vendor.available ? "Available" : "Unavailable"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Listed</dt><dd className="font-medium text-right">{formatDistanceToNow(new Date(vendor.createdAt), { addSuffix: true })}</dd></div>
          </dl>
        </Card>
      </div>

      {/* Reviews */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Reviews ({vendor.ratingCount})</h2>
          <Button variant="outline" onClick={() => {
            if (!session) { openAuth("login"); return; }
            if (isOwner) return toast.error("You can't review your own business.");
            setReviewOpen(true);
          }}>
            Write a review
          </Button>
        </div>
        {reviews.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {reviews.map((r: any) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {r.author.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{r.author.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <StarRating value={r.rating} />
                </div>
                <p className="text-sm text-muted-foreground">{r.comment}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EnquiryDialog
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        vendorName={vendor.businessName}
        vendorId={vendor.id}
      />
      <ReviewSheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        vendorId={vendor.id}
        existing={(reviews.find((r: any) => r.mine) as any) ?? null}
      />
      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        vendorName={vendor.businessName}
        vendorId={vendor.id}
      />
    </div>
  );
}

function EnquiryDialog({ open, onOpenChange, vendorName, vendorId }: { open: boolean; onOpenChange: (v: boolean) => void; vendorName: string; vendorId: string }) {
  const { data: session } = useSession();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const startThread = useMutation(api.threads.start);

  async function send() {
    if (!session || !message.trim()) return;
    setLoading(true);
    try {
      await startThread({ userId: session.user.id, vendorId, body: message.trim() });
      toast.success("Message sent! The vendor will reply in your inbox.");
      setMessage(""); setSubject("");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Send an enquiry to {vendorName}</DialogTitle>
          <DialogDescription>Your message starts a private conversation. You&apos;ll get replies in your inbox.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="subj">Subject (optional)</Label>
            <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Enquiry about your services" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg">Message</Label>
            <Textarea id="msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi, I'd like to know more about..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={loading || !message.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send enquiry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewSheet({ open, onOpenChange, vendorId, existing }: {
  open: boolean; onOpenChange: (v: boolean) => void; vendorId: string;
  existing: { rating: number; comment: string } | null | undefined;
}) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const upsert = useMutation(api.reviews.upsert);

  function reset() {
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? "");
  }

  // Drop stale state if the existing review changes (e.g. when navigating
  // between vendors with the sheet reused).
  useEffect(() => {
    reset();
  }, [existing?.rating, existing?.comment, vendorId]);

  async function submit() {
    if (!session?.user?.id) {
      toast.error("Please sign in to leave a review.");
      return;
    }
    if (!rating) return toast.error("Please select a star rating.");
    if (!comment.trim()) return toast.error("Please write a short review.");
    if (comment.trim().length > 2000) {
      return toast.error("Reviews are limited to 2000 characters.");
    }
    setLoading(true);
    try {
      await upsert({
        userId: session.user.id,
        vendorId,
        rating,
        comment: comment.trim(),
      });
      toast.success(existing ? "Review updated!" : "Thanks for your review!");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{existing ? "Edit your review" : "Write a review"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pt-4">
          <div className="space-y-2">
            <Label>Your rating</Label>
            <InteractiveStarRating value={rating} onChange={setRating} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc">Your review</Label>
            <Textarea id="rc" rows={5} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience with this vendor..." />
          </div>
          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existing ? "Update review" : "Submit review"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BookingDialog({ open, onOpenChange, vendorName, vendorId }: {
  open: boolean; onOpenChange: (v: boolean) => void; vendorName: string; vendorId: string;
}) {
  const { data: session } = useSession();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const createBooking = useMutation(api.bookings.create);

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  async function submit() {
    if (!session || !date) return;
    setLoading(true);
    try {
      await createBooking({
        userId: session.user.id,
        vendorId,
        customerName: session.user.name ?? "Customer",
        customerEmail: session.user.email ?? "",
        eventDate: new Date(date).toISOString(),
        eventType: "Booking",
        location: "",
        notes: note || undefined,
      });
      toast.success("Booking request sent! The vendor will respond.");
      setDate(""); setNote("");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Request a booking with {vendorName}</DialogTitle>
          <DialogDescription>Pick a date and add an optional note. The vendor will confirm or decline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bd">Preferred date *</Label>
            <Input id="bd" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bn">Note (optional)</Label>
            <Textarea id="bn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Birthday photoshoot, 20 guests..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !date}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
            Request booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
