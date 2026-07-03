"use client";

import { useMutation, useQuery } from "convex/react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Store,
  Users,
  BarChart3,
  BadgeCheck,
  Clock,
  MessageCircle,
  Bookmark,
  Star,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Sparkles,
  Eye,
  ArrowUpRight,
  Globe,
  ScrollText,
  Trash2,
  ChevronRight,
  ShieldCheck,
  MoreVertical,
  History,
  Newspaper,
  Plus,
  Pencil,
  Database,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAppStore } from "@/lib/store";
import { api } from "convex/_generated/api";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, debounce } from "@/lib/utils";

export function AdminDashboardView() {
  const { data: session } = useSession();
  const { openAuth, openVendor } = useAppStore();
  const [acting, setActing] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [tab, setTab] = useState("overview");
  const actorId = session?.user?.id ?? "";

  const statsData = useQuery(api.stats.adminOverview, { actorId });
  const vendorsData = useQuery(api.vendors.adminList, { actorId });
  const usersData = useQuery(api.users.adminList, { actorId });

  const actMutation = useMutation(api.vendors.adminAction);

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <LayoutDashboard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-lg">Admin access required</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Sign in with an admin account to manage the platform.
          </p>
          <Button onClick={() => openAuth("login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  const vendors = vendorsData ?? [];
  const pending = vendors.filter((v: any) => v.status === "PENDING");
  const users = usersData ?? [];

  const navItems: NavItem[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "approvals", label: "Approvals", icon: ClipboardCheck, badge: pending.length || undefined },
    { key: "vendors", label: "Vendors", icon: Store },
    { key: "users", label: "Users", icon: Users },
    { key: "reviews", label: "Reviews", icon: Star },
    { key: "blog", label: "Blog", icon: Newspaper },
    { key: "audit", label: "Audit Log", icon: ScrollText },
    { key: "insights", label: "Insights", icon: BarChart3 },
  ];

  async function act(
    id: string,
    action: any,
    label: string,
    opts?: { detail?: string; featureDays?: number; stage?: string }
  ): Promise<boolean> {
    setActing(id + action);
    try {
      await actMutation({ actorId, vendorId: id, action: action as any, ...opts } as any);
      toast.success(label);
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setActing(null);
    }
  }

  async function handleSeedSamples() {
    if (seeding) return;
    if (!window.confirm(
      "Insert/refresh 10 sample vendors across 7 categories? This is safe to re-run — rows are matched by slug."
    )) {
      return;
    }
    setSeeding(true);
    try {
      const r = await fetch("/api/admin/seed-vendors", { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        throw new Error(data.error || "Seed failed");
      }
      toast.success(
        `Seeded ${data.total} vendors — ${data.created} created, ${data.updated} updated.`
      );
      // Refresh stats so the overview reflects the new data immediately.
      // Queries will auto-refresh via Convex reactive subscriptions.
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <DashboardShell
      navItems={navItems}
      activeKey={tab}
      onNavigate={setTab}
      brandLabel="TrustVend"
      brandSub="Admin Console"
      greeting="Welcome back, Admin 👋"
      subtitle="Monitor platform health, review applications, and verify vendors."
      accentLabel="Administrator"
    >
      {tab === "overview" && (
        <OverviewTab
          statsData={statsData}
          statsLoading={statsData === undefined}
          onGoApprovals={() => setTab("approvals")}
          onOpenVendor={openVendor}
          onSeedSamples={handleSeedSamples}
          seeding={seeding}
        />
      )}

      {tab === "approvals" && (
        <ApprovalsTab
          pending={pending}
          loading={vendorsData === undefined}
          acting={acting}
          act={act}
          onOpenVendor={openVendor}
        />
      )}

      {tab === "vendors" && (
        <VendorsTab
          vendors={vendors}
          loading={vendorsData === undefined}
          acting={acting}
          act={act}
          onOpenVendor={openVendor}
        />
      )}

      {tab === "users" && <UsersTab users={users} currentUserId={session.user.id} actorId={actorId} />}

      {tab === "reviews" && <ReviewsTab actorId={actorId} />}

      {tab === "blog" && <BlogTab actorId={actorId} />}

      {tab === "audit" && <AuditTab actorId={actorId} />}

      {tab === "insights" && <InsightsTab statsData={statsData} loading={statsData === undefined} onOpenVendor={openVendor} />}
    </DashboardShell>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({
  statsData,
  statsLoading,
  onGoApprovals,
  onOpenVendor,
  onSeedSamples,
  seeding,
}: any) {
  if (statsLoading || !statsData) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-5 gap-4">
          <Skeleton className="h-72 rounded-xl lg:col-span-3" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const t = statsData.totals;
  const donutData = statsData.topCategories.slice(0, 6).map((c: any) => ({
    name: c.category,
    value: c.count,
  }));

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Vendors"
          value={t.vendors}
          sub="Across all categories"
          icon={Store}
          accent="emerald"
          trend={{ value: `${statsData.vendorsPerMonth?.slice(-1)[0]?.count ?? 0} this month`, direction: "up" }}
        />
        <StatCard
          label="Pending Approvals"
          value={t.pending}
          sub="Awaiting your review"
          icon={Clock}
          accent="amber"
        />
        <StatCard
          label="Registered Customers"
          value={t.customers}
          sub="Active buyers"
          icon={Users}
          accent="violet"
        />
        <HighlightStatCard
          label="Verified Vendors"
          value={t.verified}
          sub={`${t.vendors ? Math.round((t.verified / t.vendors) * 100) : 0}% of all vendors carry the Verified badge`}
          icon={BadgeCheck}
        />
      </div>

      {/* Sample-data bootstrap — visible always; re-runnable to refresh */}
      <PanelCard
        title="Sample vendor pack"
        subtitle="Insert or refresh 10 pre-verified vendors across Fashion, Food, Beauty, Photography, Events, Home, and Tech."
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {t.vendors === 0
                  ? "Your marketplace is empty"
                  : `${t.vendors} vendors already live`}
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Idempotent — re-running refreshes the same rows. Featured
                listings get a 30-day featured period. Synthetic login
                pattern:
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[11px]">{`{handle}@trustvend-demo.ng`}</code>
                / <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">VendorPass123!</code>
              </p>
            </div>
          </div>
          <Button
            onClick={onSeedSamples}
            disabled={seeding}
            className="shrink-0"
            size="sm"
          >
            {seeding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Seeding…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                {t.vendors === 0
                  ? "Seed sample vendors"
                  : "Refresh sample vendors"}
              </>
            )}
          </Button>
        </div>
      </PanelCard>

      {/* Charts */}
      <div className="grid lg:grid-cols-5 gap-4">
        <PanelCard
          title="Vendors by Category"
          className="lg:col-span-2"
        >
          {donutData.length ? (
            <DonutChart data={donutData} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No data yet.</p>
          )}
        </PanelCard>
        <PanelCard
          title="New Vendor Signups"
          className="lg:col-span-3"
          action={<span className="text-[11px] text-muted-foreground">Last 6 months</span>}
        >
          <MiniBarChart data={statsData.vendorsPerMonth ?? []} />
        </PanelCard>
      </div>

      {/* Recent applications table */}
      <PanelCard
        title="Recent Applications"
        action={
          <Button variant="ghost" size="sm" onClick={onGoApprovals} className="text-primary">
            View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        }
      >
        <RecentApplicationsTable
          rows={statsData.recentApplications ?? []}
          onOpenVendor={onOpenVendor}
        />
      </PanelCard>

      {/* Mini stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Total Reviews" value={t.reviews} icon={Star} accent="amber" />
        <MiniStat label="Total Bookmarks" value={t.bookmarks} icon={Bookmark} accent="rose" />
        <MiniStat label="Total Enquiries" value={t.enquiries} icon={MessageCircle} accent="sky" />
        <MiniStat label="Suspended" value={t.suspended} icon={Ban} accent="rose" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, accent }: any) {
  const map: Record<string, string> = {
    amber: "bg-warning text-warning-fg",
    rose: "bg-danger text-danger-fg",
    sky: "bg-info text-info-fg",
    emerald: "bg-success text-success-fg",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3 shadow-sm">
      <span className={cn("grid h-9 w-9 place-items-center rounded-lg", map[accent])}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-extrabold leading-none tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

function RecentApplicationsTable({ rows, onOpenVendor }: any) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No applications yet.</p>;
  }
  return (
    <div className="overflow-x-auto scroll-area-custom -mx-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden lg:table-cell">Applied</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((v: any) => (
            <TableRow key={v.id} className="cursor-pointer hover:bg-accent/40" onClick={() => onOpenVendor(v.id)}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {v.businessName.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate flex items-center gap-1">
                      {v.businessName}
                      {v.verified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">@{v.instagramHandle} · {v.ownerEmail}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{v.category}</TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-center"><StatusBadge status={v.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ---------------- Approvals ---------------- */
function ApprovalsTab({ pending, loading, acting, act, onOpenVendor }: any) {
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  async function confirmReject() {
    if (!rejectTarget) return false;
    const ok = await act(rejectTarget.id, "reject", "Application rejected", { detail: reason.trim() });
    return ok;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Pending Applications</h2>
          <p className="text-sm text-muted-foreground">Review and approve new vendor listings.</p>
        </div>
        <Badge variant="secondary" className="bg-warning text-warning-fg">{pending.length} pending</Badge>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : pending.length === 0 ? (
        <PanelCard title="All caught up!">
          <div className="text-center py-8">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
            <p className="font-semibold">No pending applications</p>
            <p className="text-sm text-muted-foreground mt-1">New applications will appear here for review.</p>
          </div>
        </PanelCard>
      ) : (
        <div className="space-y-3">
          {pending.map((v: any) => (
            <div key={v.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 cursor-pointer" onClick={() => onOpenVendor(v.id)}>
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary font-bold shrink-0">
                    {v.businessName.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold flex items-center gap-1">{v.businessName}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.category} · {v.city ? `${v.city}, ` : ""}{v.state} · @{v.instagramHandle}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      Applied {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })} · {v.ownerEmail}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={v.instagramLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 px-3 text-xs font-medium hover:bg-accent"
                  >
                    <Globe className="mr-1 h-3.5 w-3.5" /> View IG
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={() => { setRejectTarget(v); setReason(""); }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={acting === v.id + "approve"}
                    onClick={() => act(v.id, "approve", "Vendor approved & now visible")}
                  >
                    {acting === v.id + "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject application</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejecting {rejectTarget?.businessName}. This reason will be visible to the applicant on their dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (e.g. incomplete Instagram profile, policy violation, unclear business details)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim() || acting === rejectTarget?.id + "reject"}
              className={cn("bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600")}
              onClick={async (e) => {
                e.preventDefault();
                const ok = await confirmReject();
                if (ok) setRejectTarget(null);
              }}
            >
              {acting === rejectTarget?.id + "reject" && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Confirm Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Vendors ---------------- */
function VendorsTab({ vendors, loading, acting, act, onOpenVendor }: any) {
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<{ vendor: any; action: string; label: string; destructive?: boolean; description?: string } | null>(null);
  const [featureTarget, setFeatureTarget] = useState<any | null>(null);

  const [qInput, setQInput] = useState("");
  const commitQ = useMemo(
    () => debounce((value: string) => setQ(value), 200),
    [],
  );
  useEffect(() => () => commitQ.cancel(), [commitQ]);

  const filtered = vendors.filter((v: any) =>
    !q ? true : (v.businessName + v.category + v.instagramHandle + v.state).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">All Vendors</h2>
          <p className="text-sm text-muted-foreground">Verify, feature, suspend, or reinstate vendors.</p>
        </div>
        <Input
          placeholder="Search vendors..."
          value={qInput}
          onChange={(e) => {
            setQInput(e.target.value);
            commitQ(e.target.value);
          }}
          className="sm:w-64 h-9"
        />
      </div>

      <PanelCard title={`Vendor Directory (${filtered.length})`}>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No vendors match your search.</p>
        ) : (
          <div className="overflow-x-auto scroll-area-custom -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Rating</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Image
                          src={v.photos?.[0] ?? "/vendors/placeholder.png"}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <button onClick={() => onOpenVendor(v.id)} className="font-medium text-sm hover:text-primary truncate flex items-center gap-1">
                            {v.businessName}
                            {v.verified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                            {v.featured && <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />}
                          </button>
                          <p className="text-[11px] text-muted-foreground truncate">@{v.instagramHandle}</p>
                          {v.verificationStage && (
                            <Badge variant="outline" className="mt-0.5 text-[9px] font-normal text-muted-foreground">
                              Stage: {v.verificationStage}
                            </Badge>
                          )}
                          {v.featured && v.featuredUntil && (
                            <span className="block text-[10px] text-amber-600 mt-0.5">
                              Featured {formatDistanceToNow(new Date(v.featuredUntil), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{v.category}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{v.city ? `${v.city}, ` : ""}{v.state}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{v.views}</TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <StarRating value={v.ratingAvg} size={12} />
                        <span className="text-xs">({v.ratingCount})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><StatusBadge status={v.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconAction
                          tooltip={v.verified ? "Remove verification" : "Verify vendor"}
                          active={v.verified}
                          activeColor="text-emerald-600"
                          loading={acting === v.id + (v.verified ? "unverify" : "verify")}
                          onClick={() =>
                            setConfirm({
                              vendor: v,
                              action: v.verified ? "unverify" : "verify",
                              label: v.verified ? "Verification removed" : "Vendor verified ✓",
                              description: v.verified
                                ? "This will remove the Verified badge from this vendor. They will appear as unverified publicly."
                                : "This will mark this vendor as verified and display the Verified badge on their listing.",
                            })
                          }
                        >
                          <BadgeCheck className="h-4 w-4" />
                        </IconAction>

                        {v.featured ? (
                          <IconAction
                            tooltip="Remove from featured"
                            active={v.featured}
                            activeColor="text-amber-500"
                            loading={acting === v.id + "unfeature"}
                            onClick={() => act(v.id, "unfeature", "Removed from featured")}
                          >
                            <Sparkles className="h-4 w-4" />
                          </IconAction>
                        ) : (
                          <IconAction
                            tooltip="Feature vendor"
                            active={false}
                            activeColor="text-amber-500"
                            loading={acting === v.id + "feature"}
                            onClick={() => setFeatureTarget(v)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </IconAction>
                        )}

                        <IconAction
                          tooltip="Advance to next verification stage"
                          active={false}
                          activeColor="text-sky-600"
                          hoverColor="text-sky-600"
                          loading={acting === v.id + "advanceStage"}
                          onClick={() => act(v.id, "advanceStage", "Verification stage advanced")}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </IconAction>

                        {v.status === "SUSPENDED" ? (
                          <IconAction
                            tooltip="Reinstate"
                            active={false}
                            activeColor="text-emerald-600"
                            hoverColor="text-emerald-600"
                            loading={acting === v.id + "reinstate"}
                            onClick={() =>
                              setConfirm({
                                vendor: v,
                                action: "reinstate",
                                label: "Vendor reinstated",
                                description: "This will restore the vendor to active status.",
                              })
                            }
                          >
                            <RotateCcw className="h-4 w-4" />
                          </IconAction>
                        ) : (
                          <IconAction
                            tooltip="Suspend"
                            active={false}
                            hoverColor="text-rose-600"
                            loading={acting === v.id + "suspend"}
                            onClick={() =>
                              setConfirm({
                                vendor: v,
                                action: "suspend",
                                label: "Vendor suspended",
                                destructive: true,
                                description: "This vendor will be hidden from public listings and marked as suspended. They can be reinstated later.",
                              })
                            }
                          >
                            <Ban className="h-4 w-4" />
                          </IconAction>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PanelCard>

      {/* Confirm dialog (verify/unverify/suspend/reinstate) */}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.destructive ? "Confirm suspension" : "Please confirm"}
        description={confirm?.description}
        confirmLabel={confirm?.destructive ? "Suspend vendor" : "Confirm"}
        destructive={confirm?.destructive}
        loading={confirm ? acting === confirm.vendor.id + confirm.action : false}
        onConfirm={async () => {
          if (!confirm) return false;
          return act(confirm.vendor.id, confirm.action, confirm.label);
        }}
      />

      {/* Feature duration dialog */}
      <Dialog open={!!featureTarget} onOpenChange={(o) => { if (!o) setFeatureTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feature {featureTarget?.businessName}</DialogTitle>
            <DialogDescription>
              Choose how long this vendor should appear in the Featured section. The listing will be unfeatured automatically after the period ends.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant="outline"
                disabled={acting === featureTarget?.id + "feature"}
                onClick={async () => {
                  if (!featureTarget) return;
                  const ok = await act(featureTarget.id, "feature", `Featured for ${days} days`, { featureDays: days });
                  if (ok) setFeatureTarget(null);
                }}
              >
                {acting === featureTarget?.id + "feature" && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {days} days
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconAction({
  children,
  tooltip,
  onClick,
  loading,
  active,
  activeColor,
  hoverColor,
}: any) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-10 w-10", active && activeColor, hoverColor && `hover:${hoverColor}`)}
            disabled={loading}
            onClick={onClick}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ---------------- Users ---------------- */
function UsersTab({ users, currentUserId, actorId }: { users: any[]; currentUserId: string; actorId: string }) {
  const [acting, setActing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ user: any; action: "ban" | "delete" } | null>(null);
  const updateUser = useMutation(api.users.adminUpdateUser);
  const deleteUser = useMutation(api.users.adminDeleteUser);

  async function userAction(id: string, action: string, label: string): Promise<boolean> {
    setActing(id + action);
    try {
      if (action === "delete") {
        await deleteUser({ actorId, targetId: id });
      } else {
        await updateUser({ actorId, targetId: id, action: action as any });
      }
      toast.success(label);
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setActing(null);
    }
  }

  async function changeRole(u: any, action: "makeAdmin" | "makeCustomer", label: string) {
    const ok = await userAction(u.id, action, label);
    if (ok) toast.success(label);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">User Accounts</h2>
        <p className="text-sm text-muted-foreground">All registered customers, vendors, and admins. Ban, delete, or change roles.</p>
      </div>
      <PanelCard title={`Users (${users.length})`}>
        {users.length === 0 ? (
          <div className="text-center py-10">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No users found</p>
            <p className="text-sm text-muted-foreground mt-1">Registered users will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-area-custom -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Vendor</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1.5">
                          {u.name || <span className="text-muted-foreground italic">—</span>}
                          {u.banned && (
                            <Badge variant="secondary" className="bg-danger text-danger-fg text-[10px]">Banned</Badge>
                          )}
                          {isSelf && <span className="text-[10px] text-muted-foreground">(you)</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={cn(
                          "text-xs",
                          u.role === "ADMIN" && "bg-primary/15 text-primary",
                          u.role === "VENDOR" && "bg-success text-success-fg",
                          u.role === "CUSTOMER" && "bg-muted"
                        )}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {u.vendor ? (
                          <span className="flex items-center gap-1.5">
                            {u.vendor.businessName}
                            <StatusBadge status={u.vendor.status} />
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.banned ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8"
                              disabled={isSelf || acting === u.id + "unban"}
                              onClick={() => userAction(u.id, "unban", "User unbanned")}
                            >
                              {acting === u.id + "unban" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                              Unban
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                              disabled={isSelf}
                              onClick={() => setConfirm({ user: u, action: "ban" })}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" />
                              Ban
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                            disabled={isSelf}
                            onClick={() => setConfirm({ user: u, action: "delete" })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-10 w-10" disabled={isSelf}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel>Change role</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={u.role === "ADMIN"}
                                onClick={() => changeRole(u, "makeAdmin", "User promoted to admin")}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={u.role === "CUSTOMER"}
                                onClick={() => changeRole(u, "makeCustomer", "User set to customer")}
                              >
                                <Users className="h-3.5 w-3.5 mr-2" /> Customer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled className="opacity-60">
                                <Store className="h-3.5 w-3.5 mr-2" /> Vendor
                                <span className="ml-auto text-[10px] text-muted-foreground">auto</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </PanelCard>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.action === "delete" ? "Delete user" : "Ban user"}
        description={
          confirm?.action === "delete"
            ? `Are you sure you want to permanently delete ${confirm?.user?.email}? This action cannot be undone. Their vendor profile, reviews, and bookmarks will also be removed.`
            : `Banning ${confirm?.user?.email} will prevent them from signing in. They can be unbanned later.`
        }
        confirmLabel={confirm?.action === "delete" ? "Delete permanently" : "Ban user"}
        destructive
        loading={confirm ? acting === confirm.user.id + confirm.action : false}
        onConfirm={async () => {
          if (!confirm) return false;
          const label = confirm.action === "delete" ? "User deleted" : "User banned";
          return userAction(confirm.user.id, confirm.action, label);
        }}
      />
    </div>
  );
}

/* ---------------- Reviews ---------------- */
function ReviewsTab({ actorId }: { actorId: string }) {
  const [acting, setActing] = useState<string | null>(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const commitQ = useMemo(
    () => debounce((value: string) => setQ(value), 200),
    [],
  );
  useEffect(() => () => commitQ.cancel(), [commitQ]);

  const setHidden = useMutation(api.reviews.adminSetHidden);
  const data = useQuery(api.reviews.adminList, { actorId });

  const reviews = data ?? [];
  const filtered = reviews.filter((r: any) => {
    if (!q) return true;
    const hay = `${r.vendor?.businessName ?? ""} ${r.comment ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  async function act(id: string, action: "hide" | "restore", label: string): Promise<boolean> {
    setActing(id + action);
    try {
      await setHidden({ actorId, reviewId: id, hidden: action === "hide" });
      toast.success(label);
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Review Moderation</h2>
          <p className="text-sm text-muted-foreground">Hide or restore reviews reported across vendor listings.</p>
        </div>
        <Input
          placeholder="Search by vendor or comment..."
          value={qInput}
          onChange={(e) => {
            setQInput(e.target.value);
            commitQ(e.target.value);
          }}
          className="sm:w-72 h-9"
        />
      </div>

      <PanelCard title={`Reviews (${filtered.length})`}>
        {data === undefined ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Star className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No reviews found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {q ? "Try a different search." : "Reviews left by customers will appear here for moderation."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-area-custom -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="hidden md:table-cell">Author</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium truncate max-w-[180px]">
                      {r.vendor?.businessName ?? <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      <div className="flex flex-col">
                        <span className="text-sm">{r.author?.name || "Anonymous"}</span>
                        <span className="text-[11px] text-muted-foreground">{r.author?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <StarRating value={r.rating} size={12} />
                        <span className="text-xs">{r.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate" title={r.comment}>
                      {r.comment || <span className="italic">No comment</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.hidden ? (
                        <Badge variant="secondary" className="bg-danger text-danger-fg text-[10px]">Hidden</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-success text-success-fg text-[10px]">Visible</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.hidden ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8"
                          disabled={acting === r.id + "restore"}
                          onClick={() => act(r.id, "restore", "Review restored")}
                        >
                          {acting === r.id + "restore" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                          Restore
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                          disabled={acting === r.id + "hide"}
                          onClick={() => act(r.id, "hide", "Review hidden")}
                        >
                          {acting === r.id + "hide" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Ban className="h-3.5 w-3.5 mr-1" />}
                          Hide
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

/* ---------------- Audit Log ---------------- */
function auditTone(action: string): "emerald" | "rose" | "muted" {
  const a = (action || "").toLowerCase();
  if (/(approve|verify|feature|reinstate|restore|unban|advance|makeadmin)/.test(a)) return "emerald";
  if (/(reject|suspend|ban|delete|hide|unverify|unfeature)/.test(a)) return "rose";
  return "muted";
}

const TONE_BADGE: Record<string, string> = {
  emerald: "bg-success text-success-fg",
  rose: "bg-danger text-danger-fg",
  muted: "bg-muted text-muted-foreground",
};

const TONE_DOT: Record<string, string> = {
  emerald: "bg-success-fg",
  rose: "bg-danger-fg",
  muted: "bg-muted-foreground/60",
};

function AuditTab({ actorId }: { actorId: string }) {
  const data = useQuery(api.stats.adminAudit, { actorId });
  const logs = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">A timeline of admin actions taken across the platform.</p>
      </div>

      <PanelCard title={`Activity (${logs.length})`}>
        {data === undefined ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10">
            <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">Admin actions will be recorded here.</p>
          </div>
        ) : (
          <div className="relative pl-6 pr-1 py-1">
            <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />
            <ul className="space-y-5">
              {logs.map((log: any) => {
                const tone = auditTone(log.action);
                return (
                  <li key={log.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[19px] top-1 h-3 w-3 rounded-full ring-2 ring-card",
                        TONE_DOT[tone]
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{log.actor?.name || "System"}</span>
                      <Badge variant="secondary" className={cn("text-[10px] font-medium", TONE_BADGE[tone])}>
                        {log.action}
                      </Badge>
                      {log.targetType && (
                        <span className="text-[11px] text-muted-foreground">
                          · {log.targetType}
                          {log.targetId ? ` · ${String(log.targetId).slice(0, 8)}` : ""}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {log.detail && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{log.detail}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

/* ---------------- Insights ---------------- */
function InsightsTab({ statsData, loading, onOpenVendor }: any) {
  if (loading || !statsData) {
    return <div className="grid lg:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>;
  }
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Platform Insights</h2>
        <p className="text-sm text-muted-foreground">Trends and top performers across TrustVend.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <PanelCard title="Top Categories">
          <div className="space-y-2.5">
            {statsData.topCategories.map((c: any) => {
              const max = statsData.topCategories[0]?.count || 1;
              return (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{c.category}</span>
                    <span className="font-semibold tabular-nums">{c.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </PanelCard>
        <PanelCard title="Most Viewed Vendors">
          <div className="space-y-2">
            {statsData.topVendors.map((v: any, i: number) => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <button onClick={() => onOpenVendor(v.id)} className="text-sm font-medium truncate hover:text-primary flex items-center gap-1">
                    {v.businessName}
                  </button>
                  <p className="text-xs text-muted-foreground">{v.category}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{v.views}</span>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
      <PanelCard title="Vendor Signups (Last 6 Months)">
        <MiniBarChart data={statsData.vendorsPerMonth ?? []} height={240} />
      </PanelCard>
    </div>
  );
}

/* ---------------- Shared ---------------- */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => Promise<boolean | void>;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || loading}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const ok = await onConfirm();
                if (ok !== false) onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
            className={cn(destructive && "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600")}
          >
            {(busy || loading) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------------- Blog ---------------- */
function BlogTab({ actorId }: { actorId: string }) {
  const statsData = useQuery(api.stats.adminBlogStats, { actorId });
  const postsData = useQuery(api.posts.list, { limit: 50 });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deletePost = useMutation(api.posts.remove);

  const posts = postsData?.items ?? [];
  const t = statsData;

  const stats = [
    { label: "Total Posts", value: t?.total ?? 0, icon: Newspaper, color: "bg-success text-success-fg" },
    { label: "Published", value: t?.published ?? 0, icon: CheckCircle2, color: "bg-info text-info-fg" },
    { label: "Drafts", value: t?.drafts ?? 0, icon: Pencil, color: "bg-warning text-warning-fg" },
    { label: "Total Views", value: t?.totalViews ?? 0, icon: Eye, color: "bg-primary/15 text-primary" },
  ];

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(p: any) {
    setEditing(p);
    setEditorOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deletePost({ actorId, id: deleteId });
      toast.success("Post deleted.");
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
          <h2 className="text-lg font-bold">Blog Manager</h2>
          <p className="text-sm text-muted-foreground">Create, edit, and track blog posts.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> New post
        </Button>
      </div>

      {/* Stats */}
      {statsData === undefined ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent="emerald" />
          ))}
        </div>
      )}

      {/* Chart + Top posts */}
      <div className="grid lg:grid-cols-5 gap-4">
        <PanelCard title="Posts per Month" className="lg:col-span-3">
          {statsData?.postsPerMonth ? (
            <MiniBarChart data={statsData.postsPerMonth} />
          ) : (
            <Skeleton className="h-48 rounded-lg" />
          )}
        </PanelCard>
        <PanelCard title="Top Posts by Views" className="lg:col-span-2">
          <div className="space-y-2">
            {(statsData?.topPosts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No posts yet.</p>
            ) : (
              (statsData?.topPosts ?? []).map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.views} views</p>
                  </div>
                  {!p.published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                </div>
              ))
            )}
          </div>
        </PanelCard>
      </div>

      {/* All posts table */}
      <PanelCard title={`All Posts (${posts.length})`}>
        {postsData === undefined ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <Newspaper className="h-9 w-9 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No posts yet. Click &quot;New post&quot; to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-area-custom -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Author</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm max-w-xs truncate">{p.title}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.author.name}</TableCell>
                    <TableCell className="text-center">
                      {p.published ? (
                        <Badge className="bg-success text-success-fg">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">{p.views}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-rose-600" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PanelCard>

      {/* Editor dialog */}
      {editorOpen && (
        <PostEditor
          post={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => setEditorOpen(false)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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

function PostEditor({ post, onClose, onSaved }: { post: any; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(post?.title || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [tags, setTags] = useState((post?.tags || []).join(", "));
  const [published, setPublished] = useState(post?.published ?? false);
  const [loading, setLoading] = useState(false);
  const createPost = useMutation(api.posts.create);
  const updatePost = useMutation(api.posts.update);

  async function save() {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setLoading(true);
    try {
      if (post) {
          await updatePost({
            actorId: "",
            id: post.id,
            title: title.trim(),
            excerpt: excerpt.trim(),
            content: content.trim(),
            coverImage: coverImage.trim() || undefined,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            published,
          });
          toast.success("Post updated.");
        } else {
        await createPost({ actorId: "", title: title.trim(), content: content.trim(), excerpt: excerpt.trim() || undefined, coverImage: coverImage.trim() || undefined, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), published });
        toast.success("Post created.");
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? "Edit post" : "New post"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
          </div>
          <div className="space-y-1.5">
            <Label>Excerpt</Label>
            <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary" />
          </div>
          <div className="space-y-1.5">
            <Label>Content (Markdown)</Label>
            <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post in Markdown..." className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label>Cover image URL</Label>
            <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tips, fashion, lagos" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={published} onCheckedChange={(v) => setPublished(v === true)} />
            <span className="text-sm font-medium">Publish immediately</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {post ? "Update" : "Create"} post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
