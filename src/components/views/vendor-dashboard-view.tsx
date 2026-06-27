"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  Star,
  UserCircle,
  Eye,
  Bookmark,
  Clock,
  TrendingUp,
  ShieldCheck,
  Edit3,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BadgeCheck,
  Sparkles,
  ArrowUpRight,
  Star as StarIcon,
  CalendarDays,
  Settings,
  Trash2,
  KeyRound,
  XCircle,
  Check,
  X,
  Plus,
  Pencil,
  MapPin,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DashboardShell,
  StatCard,
  HighlightStatCard,
  PanelCard,
  StatusBadge,
  type NavItem,
} from "@/components/shared/dashboard-shell";
import { DonutChart, MiniBarChart } from "@/components/shared/charts";
import { StarRating } from "@/components/shared/star-rating";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { MessagesPanel } from "@/components/shared/messages-panel";
import { useSession as useNextAuthSession } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { api } from "convex/_generated/api";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { CATEGORIES, NIGERIAN_STATES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function VendorDashboardView() {
  const { data: session } = useNextAuthSession();
  const { openBecomeVendor, openAuth } = useAppStore();
  const [toggling, setToggling] = useState(false);
  const [tab, setTab] = useState("overview");
  const userId = session?.user?.id ?? "";

  const data = useQuery(api.stats.vendorDashboard, { actorId: userId });
  const meData = useQuery(api.users.getMe, { userId });
  const updateVendor = useMutation(api.vendors.update);
  const vendor = meData?.vendor;

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-lg">Sign in to access your dashboard</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Vendor accounts can track views, enquiries, and messages here.
          </p>
          <Button onClick={() => openAuth("login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  async function toggleAvailable() {
    if (!vendor) return;
    setToggling(true);
    try {
      await updateVendor({ actorId: userId, vendorId: vendor.id, patch: { availableNote: vendor.available ? "Temporarily unavailable" : "" } });
      toast.success(vendor.available ? "Marked as unavailable" : "Marked as available");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setToggling(false);
    }
  }

  if (data === undefined || meData === undefined || !vendor) {
    return (
      <div className="px-4 sm:px-6 py-8 space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statusBadge = {
    PENDING: { label: "Pending review", cls: "bg-amber-100 text-amber-700" },
    APPROVED: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    SUSPENDED: { label: "Suspended", cls: "bg-rose-100 text-rose-700" },
    REJECTED: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
  }[vendor.status] ?? { label: vendor.status, cls: "" };

  const pendingCount = data?.enquiries?.filter((e: any) => false).length ?? 0; // placeholder

  const navItems: NavItem[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "messages", label: "Messages", icon: MessageCircle, badge: data?.enquiries?.length || undefined },
    { key: "bookings", label: "Bookings", icon: CalendarDays },
    { key: "events", label: "Events", icon: CalendarDays },
    { key: "reviews", label: "Reviews", icon: Star },
    { key: "profile", label: "Profile", icon: UserCircle },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      activeKey={tab}
      onNavigate={setTab}
      brandLabel="TrustVend"
      brandSub="Vendor Portal"
      greeting={`Welcome, ${vendor.businessName.split(" ")[0]} 👋`}
      subtitle="Track your performance, manage enquiries, and grow your business."
      accentLabel="Vendor"
    >
      {/* Pending notice */}
      {vendor.status === "PENDING" && (
        <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Your listing is under review</p>
            <p className="text-amber-700 dark:text-amber-400/80">
              Our team is reviewing your application. Once approved, your business will be visible to customers.
            </p>
          </div>
        </div>
      )}
      {vendor.status === "SUSPENDED" && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-rose-800">Your listing is suspended</p>
            <p className="text-rose-700">Please contact support for more information.</p>
          </div>
        </div>
      )}

      {vendor.status === "REJECTED" && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-rose-800 dark:text-rose-300">Your application was not approved</p>
            {vendor.rejectionReason ? (
              <p className="text-rose-700 dark:text-rose-400/80 mt-1">{vendor.rejectionReason}</p>
            ) : (
              <p className="text-rose-700 dark:text-rose-400/80 mt-1">Please review your listing and try again.</p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-rose-300 text-rose-700 hover:bg-rose-50"
              onClick={() => openBecomeVendor()}
            >
              <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit & resubmit
            </Button>
          </div>
        </div>
      )}

      {tab === "overview" && (
        <OverviewTab data={data} stats={data?.totals} vendor={vendor} onGoMessages={() => setTab("messages")} />
      )}

      {tab === "messages" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Messages</h2>
            <p className="text-sm text-muted-foreground">Customer enquiries and conversations.</p>
          </div>
          <MessagesPanel />
        </div>
      )}

      {tab === "bookings" && <BookingsTab vendorId={vendor.id} userId={userId} />}

      {tab === "events" && <EventsTab userId={userId} />}

      {tab === "reviews" && (
        <ReviewsTab recentReviews={data?.recentReviews} ratingDistribution={data?.ratingDistribution} />
      )}

      {tab === "profile" && (
        <ProfileTab
          vendor={vendor}
          statusBadge={statusBadge}
          toggling={toggling}
          onToggle={toggleAvailable}
          onEdit={() => openBecomeVendor()}
        />
      )}

      {tab === "settings" && <SettingsTab />}
    </DashboardShell>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ data, stats, vendor, onGoMessages }: any) {
  const donutData = (data?.ratingDistribution ?? []).map((r: any) => ({
    name: `${r.star}★`,
    value: r.count,
  }));

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Profile Views"
          value={stats?.views ?? 0}
          sub="All time"
          icon={Eye}
          accent="sky"
          trend={{ value: `${data?.weeklyActivity?.slice(-1)[0]?.count ?? 0} today`, direction: "up" }}
        />
        <StatCard
          label="Enquiries"
          value={stats?.enquiries ?? 0}
          sub="Customer conversations"
          icon={MessageCircle}
          accent="violet"
        />
        <StatCard
          label="Bookmarks"
          value={stats?.bookmarks ?? 0}
          sub="Customers saved you"
          icon={Bookmark}
          accent="rose"
        />
        <HighlightStatCard
          label="Average Rating"
          value={stats?.ratingAvg ? stats.ratingAvg.toFixed(1) : "—"}
          sub={`${stats?.reviews ?? 0} ${stats?.reviews === 1 ? "review" : "reviews"} from customers${vendor.verified ? " · Verified ✓" : ""}`}
          icon={StarIcon}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-5 gap-4">
        <PanelCard title="Review Distribution" className="lg:col-span-2">
          {donutData.some((d: any) => d.value > 0) ? (
            <DonutChart data={donutData} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No reviews yet.</p>
          )}
        </PanelCard>
        <PanelCard title="Weekly Activity" subtitle="Messages & enquiries (last 7 days)" className="lg:col-span-3">
          <MiniBarChart data={data?.weeklyActivity ?? []} />
        </PanelCard>
      </div>

      {/* Recent enquiries table */}
      <PanelCard
        title="Recent Enquiries"
        action={
          <Button variant="ghost" size="sm" onClick={onGoMessages} className="text-primary">
            Open inbox <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        }
      >
        <RecentEnquiriesTable rows={data?.enquiries ?? []} />
      </PanelCard>
    </div>
  );
}

function RecentEnquiriesTable({ rows }: any) {
  if (!rows.length) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-9 w-9 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No enquiries yet. They&apos;ll appear here when customers message you.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto scroll-area-custom -mx-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Subject</TableHead>
            <TableHead className="hidden lg:table-cell">Last Message</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 6).map((e: any) => (
            <TableRow key={e.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {e.customerName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{e.customerName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{e.customerEmail}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                {e.subject || <span className="italic">No subject</span>}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[240px] truncate">
                {e.lastMessage || "—"}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(e.lastMessageAt), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ---------------- Reviews ---------------- */
function ReviewsTab({ recentReviews, ratingDistribution }: { recentReviews?: any[]; ratingDistribution?: any[] }) {
  const reviews = recentReviews ?? [];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Customer Reviews</h2>
        <p className="text-sm text-muted-foreground">What customers are saying about your business.</p>
      </div>
      {reviews.length === 0 ? (
        <PanelCard title="No reviews yet">
          <div className="text-center py-8">
            <Star className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">Reviews from customers will appear here.</p>
          </div>
        </PanelCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reviews.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {r.author.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{r.author}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <StarRating value={r.rating} size={14} />
              </div>
              <p className="text-sm text-muted-foreground">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Profile ---------------- */
function ProfileTab({ vendor, statusBadge, toggling, onToggle, onEdit }: any) {
  const stageOrder = ["NONE", "INSTAGRAM_CHECK", "MANUAL_REVIEW", "PAYMENT", "COMPLETED"];
  const stages = [
    { key: "INSTAGRAM_CHECK", label: "Instagram Check" },
    { key: "MANUAL_REVIEW", label: "Manual Review" },
    { key: "PAYMENT", label: "Verification Fee" },
    { key: "COMPLETED", label: "Verified" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Profile & Verification</h2>
        <p className="text-sm text-muted-foreground">Manage your listing status and verification.</p>
      </div>

      {/* Profile header card */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="bg-primary h-20" />
        <div className="px-5 pb-5 -mt-10">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex items-end gap-3">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-card text-primary text-2xl font-extrabold ring-4 ring-card shrink-0">
                {vendor.businessName.charAt(0)}
              </span>
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-extrabold">{vendor.businessName}</h3>
                  {vendor.verified && <VerifiedBadge size="md" />}
                  {vendor.featured && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                      <Sparkles className="h-3 w-3 mr-1" /> Featured
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={statusBadge.cls}>{statusBadge.label}</Badge>
                  <span className="text-xs text-muted-foreground">{vendor.category}</span>
                </div>
              </div>
            </div>
            <Button onClick={onEdit} variant="outline">
              <Edit3 className="mr-2 h-4 w-4" /> Edit profile
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-5">
            <DetailRow label="Location" value={`${vendor.city ? `${vendor.city}, ` : ""}${vendor.state}`} />
            <DetailRow label="Instagram" value={`@${vendor.instagramHandle}`} />
            <DetailRow label="WhatsApp" value={`+${vendor.whatsapp}`} />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Availability */}
        <PanelCard title="Availability Status">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                {vendor.available ? "Currently available" : "Currently unavailable"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {vendor.available
                  ? "Customers can see you're taking bookings."
                  : "Shown as unavailable to customers."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
              <Switch checked={vendor.available} onCheckedChange={onToggle} disabled={toggling} />
            </div>
          </div>
        </PanelCard>

        {/* Verification progress */}
        <PanelCard title="Verification Progress">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {vendor.verified ? "Verified ✓" : "Not verified yet"}
            </p>
            {vendor.verified ? (
              <VerifiedBadge />
            ) : (
              <Badge variant="secondary">In progress</Badge>
            )}
          </div>
          <div className="space-y-2">
            {stages.map((s, i) => {
              const reached = stageOrder.indexOf(vendor.verificationStage) >= stageOrder.indexOf(s.key);
              return (
                <div key={s.key} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full text-[11px] shrink-0",
                      reached ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {reached ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn("text-sm", reached ? "font-medium" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

/* ---------------- Bookings ---------------- */
function BookingsTab({ vendorId: _vendorId, userId }: { vendorId: string; userId: string }) {
  const [acting, setActing] = useState<string | null>(null);
  const data = useQuery(api.bookings.list, { userId });
  const updateBooking = useMutation(api.bookings.update);
  const bookings = data ?? [];

  async function handleAction(id: string, action: "confirm" | "decline" | "cancel", label: string) {
    setActing(id + action);
    try {
      await updateBooking({ userId, bookingId: id, action });
      toast.success(label);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActing(null);
    }
  }

  const statusCls: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    DECLINED: "bg-rose-100 text-rose-700",
    CANCELLED: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Booking Requests</h2>
        <p className="text-sm text-muted-foreground">Customers can request bookings from your profile. Confirm or decline them here.</p>
      </div>
      {data === undefined ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : bookings.length === 0 ? (
        <PanelCard title="No bookings yet">
          <div className="text-center py-6">
            <CalendarDays className="h-9 w-9 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">When customers request bookings, they&apos;ll appear here.</p>
          </div>
        </PanelCard>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => (
            <div key={b.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      {new Date(b.eventDate).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From {b.customerName} · {b.customerEmail}
                    </p>
                    {b.notes && <p className="text-xs text-muted-foreground mt-1 italic">&quot;{b.notes}&quot;</p>}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Requested {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className={statusCls[b.status] || ""}>{b.status}</Badge>
                  {b.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        disabled={acting === b.id + "decline"}
                        onClick={() => handleAction(b.id, "decline", "Booking declined")}
                      >
                        {acting === b.id + "decline" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={acting === b.id + "confirm"}
                        onClick={() => handleAction(b.id, "confirm", "Booking confirmed ✅")}
                      >
                        {acting === b.id + "confirm" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Confirm
                      </Button>
                    </>
                  )}
                  {(b.status === "CONFIRMED" || b.status === "DECLINED") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={acting === b.id + "cancel"}
                      onClick={() => handleAction(b.id, "cancel", "Booking cancelled")}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsTab() {
  const { data: session } = useNextAuthSession();
  const userId = session?.user?.id ?? "";
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const changePassword = useMutation(api.users.changePassword);
  const deleteAccount = useMutation(api.users.deleteAccount);

  async function changePasswordHandler(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return toast.error("New passwords don't match.");
    if (next.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoading(true);
    try {
      await changePassword({ userId, currentPassword: current, newPassword: next });
      toast.success("Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccountHandler() {
    setLoading(true);
    try {
      await deleteAccount({ userId });
      toast.success("Account deleted. Redirecting...");
      setTimeout(() => window.location.href = "/", 800);
    } catch (e: any) {
      toast.error(e.message);
      setLoading(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
          <h2 className="text-lg font-bold">Account Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your password and account.</p>
        </div>

      <PanelCard title="Change Password">
        <form onSubmit={changePasswordHandler} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current password</label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required placeholder="••••••••" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New password</label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Confirm new password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Re-enter new password" />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Update password
          </Button>
        </form>
      </PanelCard>

      <PanelCard title="Danger Zone">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanently delete your account, vendor listing, and all data. This cannot be undone.</p>
          </div>
          <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </PanelCard>

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setDeleteOpen(false)}>
          <div className="bg-card rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold">Delete account?</h3>
                <p className="text-sm text-muted-foreground mt-1">This will permanently remove your account and vendor listing. This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={loading}>Cancel</Button>
              <Button variant="destructive" onClick={deleteAccountHandler} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete forever
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Events ---------------- */
function EventsTab({ userId }: { userId: string }) {
  const data = useQuery(api.events.byOwner, { userId });
  const deleteEvent = useMutation(api.events.remove);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const events = data ?? [];
  const now = Date.now();
  const statCards = [
    { label: "Total Events", value: events.length, icon: CalendarDays, accent: "emerald" as const },
    { label: "Upcoming", value: events.filter((e: any) => e.eventDate > now).length, icon: Clock, accent: "amber" as const },
    { label: "Total Views", value: events.reduce((s: number, e: any) => s + (e.views ?? 0), 0), icon: Eye, accent: "sky" as const },
    { label: "Bookmarks", value: events.reduce((s: number, e: any) => s + (e.interested ?? 0), 0), icon: Bookmark, accent: "rose" as const },
  ];

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(e: any) {
    setEditing(e);
    setEditorOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteEvent({ userId, id: deleteId });
      toast.success("Event deleted.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Events</h2>
          <p className="text-sm text-muted-foreground">Create and manage events for your customers.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> New event
        </Button>
      </div>

      {/* Stats */}
      {data === undefined ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-extrabold leading-none tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Events list */}
      {data === undefined ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : events.length === 0 ? (
        <PanelCard title="No events yet">
          <div className="text-center py-6">
            <CalendarDays className="h-9 w-9 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Create your first event to reach customers.</p>
          </div>
        </PanelCard>
      ) : (
        <div className="space-y-3">
          {events.map((e: any) => (
            <div key={e.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{e.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(e.eventDate), "EEE, MMM d, yyyy")}
                      </span>
                      {e.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.location}
                        </span>
                      )}
                      {e.price && (
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3 w-3" /> {e.price}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {e.views} views</span>
                      <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> {e.bookmarks} saved</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {e.isUpcoming ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Upcoming</Badge>
                  ) : (
                    <Badge variant="secondary">Past</Badge>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setDeleteId(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      {editorOpen && (
        <EventEditor
          event={editing}
          userId={userId}
          onClose={() => setEditorOpen(false)}
          onSaved={() => setEditorOpen(false)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The event and all its bookmarks will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EventEditor({ event, userId, onClose, onSaved }: { event: any; userId: string; onClose: () => void; onSaved: () => void }) {
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [coverImage, setCoverImage] = useState(event?.coverImage || "");
  const [eventDate, setEventDate] = useState(
    event?.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : ""
  );
  const [endDate, setEndDate] = useState(
    event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : ""
  );
  const [location, setLocation] = useState(event?.location || "");
  const [state, setState] = useState(event?.state || "");
  const [category, setCategory] = useState(event?.category || "");
  const [price, setPrice] = useState(event?.price || "");
  const [rsvpLink, setRsvpLink] = useState(event?.rsvpLink || "");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!title.trim() || !description.trim() || !eventDate) {
      toast.error("Title, description, and date are required.");
      return;
    }
    setLoading(true);
    try {
      if (event) {
        await updateEvent({
          userId,
          id: event.id,
          patch: {
            title: title.trim(),
            description: description.trim(),
            coverImage: coverImage.trim() || undefined,
            eventDate: new Date(eventDate).getTime(),
            endDate: endDate ? new Date(endDate).getTime() : undefined,
            location: location.trim(),
            state,
            category,
            price: price.trim() || undefined,
            rsvpLink: rsvpLink.trim() || undefined,
          },
        });
        toast.success("Event updated.");
      } else {
        await createEvent({
          userId,
          title: title.trim(),
          description: description.trim(),
          coverImage: coverImage.trim() || undefined,
          eventDate: new Date(eventDate).getTime(),
          endDate: endDate ? new Date(endDate).getTime() : undefined,
          location: location.trim(),
          state,
          category,
          price: price.trim() || undefined,
          rsvpLink: rsvpLink.trim() || undefined,
        });
        toast.success("Event created!");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ankara Fashion Pop-up" />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this event about?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start date & time *</Label>
              <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End (optional)</Label>
              <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lekki Phase 1" />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={state || "none"} onValueChange={(v) => setState(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. Free or ₦5,000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cover image URL</Label>
            <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>RSVP / Ticket link (optional)</Label>
            <Input value={rsvpLink} onChange={(e) => setRsvpLink(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {event ? "Update" : "Create"} event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
