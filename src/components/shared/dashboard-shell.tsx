"use client";

import { useState } from "react";
import {
  Search,
  Menu,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { NotificationBell } from "@/components/shared/notification-bell";
import { cn } from "@/lib/utils";

export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export function DashboardShell({
  navItems,
  activeKey,
  onNavigate,
  brandLabel,
  brandSub,
  greeting,
  subtitle,
  accentLabel,
  children,
}: {
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  brandLabel: string;
  brandSub: string;
  greeting: string;
  subtitle: string;
  accentLabel: string;
  children: React.ReactNode;
}) {
  const { goHome } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarBody = (
    <div className="flex h-full flex-col">
      {/* Section label — the brand logo/name lives in the site header */}
      <div className="flex items-center px-5 h-16 border-b border-border/60 shrink-0">
        <p className="text-sm font-bold tracking-tight">{brandSub}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-area-custom px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Menu
        </p>
        {navItems.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                setMobileOpen(false);
              }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0 transition-colors",
                  active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
                style={{ width: 18, height: 18 }}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold",
                    active
                      ? "bg-primary-foreground/25 text-primary-foreground"
                      : "bg-amber-500 text-white"
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Back to site */}
      <div className="border-t border-border/60 p-3">
        <button
          onClick={() => goHome()}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition"
        >
          <ArrowLeft style={{ width: 18, height: 18 }} />
          Back to browse
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/40">
      <div className="mx-auto max-w-[1400px] flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex sticky top-16 h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-border/60 bg-card">
          {SidebarBody}
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            {SidebarBody}
          </SheetContent>
        </Sheet>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Top header */}
          <div className="sticky top-16 z-30 border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="relative hidden sm:block flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors, users, enquiries..."
                  className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
              <div className="flex-1 sm:hidden" />
              <NotificationBell />
            </div>
          </div>

          {/* Greeting + content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight">{greeting}</h1>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  accent = "emerald",
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: string; direction: "up" | "down" };
  icon: LucideIcon;
  accent?: "emerald" | "amber" | "sky" | "violet" | "rose" | "teal";
}) {
  const accentMap: Record<string, string> = {
    emerald: "bg-success text-success-fg",
    amber: "bg-warning text-warning-fg",
    sky: "bg-info text-info-fg",
    violet: "bg-primary/15 text-primary",
    rose: "bg-danger text-danger-fg",
    teal: "bg-success text-success-fg",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className={cn("grid h-10 w-10 place-items-center rounded-lg", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              trend.direction === "up"
                ? "bg-success/15 text-success-fg"
                : "bg-danger/15 text-danger-fg"
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold leading-none tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

export function HighlightStatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl bg-primary text-primary-foreground p-5 shadow-sm relative overflow-hidden">
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
            <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </span>
          <p className="text-sm font-medium text-primary-foreground/90">{label}</p>
        </div>
        <p className="text-3xl font-extrabold leading-none tabular-nums">{value}</p>
        <p className="text-xs text-primary-foreground/80 mt-2.5">{sub}</p>
      </div>
    </div>
  );
}

export function PanelCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border/60">
        <div>
          <h3 className="font-bold text-sm">{title}</h3>
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: "bg-warning text-warning-fg", label: "Pending" },
    APPROVED: { cls: "bg-success text-success-fg", label: "Approved" },
    SUSPENDED: { cls: "bg-danger text-danger-fg", label: "Suspended" },
    REJECTED: { cls: "bg-danger text-danger-fg", label: "Rejected" },
  };
  const cfg = map[status] ?? { cls: "bg-muted text-muted-foreground", label: status };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
}
