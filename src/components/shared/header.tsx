"use client";

import { useSession, signOut } from "next-auth/react";
import {
  Store,
  ShieldCheck,
  LayoutDashboard,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function NavLink({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary",
        active ? "text-primary" : "text-foreground/70"
      )}
    >
      {children}
    </button>
  );
}

export function Header() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [mobileOpen, setMobileOpen] = useState(false);

  const goHome = useAppStore((s) => s.goHome);
  const openBecomeVendor = useAppStore((s) => s.openBecomeVendor);
  const openBlog = useAppStore((s) => s.openBlog);
  const openEvents = useAppStore((s) => s.openEvents);
  const openCustomerDashboard = useAppStore((s) => s.openCustomerDashboard);
  const openVendorDashboard = useAppStore((s) => s.openVendorDashboard);
  const openAdminDashboard = useAppStore((s) => s.openAdminDashboard);
  const openAuth = useAppStore((s) => s.openAuth);
  const view = useAppStore((s) => s.view);

  const role = (session?.user as any)?.role as
    | "CUSTOMER"
    | "VENDOR"
    | "ADMIN"
    | undefined;

  function nav(target: () => void) {
    return () => {
      target();
      setMobileOpen(false);
    };
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => goHome()}
          className="flex items-center gap-2 shrink-0"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="text-base font-extrabold tracking-tight">
              TrustVend
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              Nigeria
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLink onClick={() => goHome()} active={view === "home"}>
            Browse Vendors
          </NavLink>
          <NavLink
            onClick={openBlog}
            active={view === "blog" || view === "blog-detail"}
          >
            Blog
          </NavLink>
          <NavLink
            onClick={openEvents}
            active={view === "events" || view === "event-detail"}
          >
            Events
          </NavLink>
          <NavLink
            onClick={openBecomeVendor}
            active={view === "become-vendor"}
          >
            Become a Vendor
          </NavLink>
          {role === "CUSTOMER" && (
            <NavLink
              onClick={openCustomerDashboard}
              active={view === "customer-dashboard"}
            >
              My Saved
            </NavLink>
          )}
          {role === "VENDOR" && (
            <NavLink
              onClick={openVendorDashboard}
              active={view === "vendor-dashboard"}
            >
              Vendor Dashboard
            </NavLink>
          )}
          {role === "ADMIN" && (
            <NavLink
              onClick={openAdminDashboard}
              active={view === "admin-dashboard"}
            >
              Admin
            </NavLink>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          {status === "loading" ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 max-w-[180px]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {(session.user?.name || session.user?.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <span className="truncate hidden sm:inline">
                    {session.user?.name || session.user?.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">
                      {session.user?.name || "Account"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {session.user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "CUSTOMER" && (
                  <DropdownMenuItem onClick={openCustomerDashboard}>
                    <User className="mr-2 h-4 w-4" /> My Saved & Messages
                  </DropdownMenuItem>
                )}
                {role === "VENDOR" && (
                  <DropdownMenuItem onClick={openVendorDashboard}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Vendor Dashboard
                  </DropdownMenuItem>
                )}
                {role === "ADMIN" && (
                  <DropdownMenuItem onClick={openAdminDashboard}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-rose-600 focus:text-rose-600"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuth("login")}
                className="hidden sm:inline-flex"
              >
                Log in
              </Button>
              <Button size="sm" onClick={() => openAuth("signup")} className="hidden sm:inline-flex">
                Sign up
              </Button>
            </>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 pt-4">
                <MobileLink onClick={nav(() => goHome())} active={view === "home"}>
                  Browse Vendors
                </MobileLink>
                <MobileLink
                  onClick={nav(openBlog)}
                  active={view === "blog" || view === "blog-detail"}
                >
                  Blog
                </MobileLink>
                <MobileLink
                  onClick={nav(openEvents)}
                  active={view === "events" || view === "event-detail"}
                >
                  Events
                </MobileLink>
                <MobileLink
                  onClick={nav(openBecomeVendor)}
                  active={view === "become-vendor"}
                >
                  Become a Vendor
                </MobileLink>
                {role === "CUSTOMER" && (
                  <MobileLink
                    onClick={nav(openCustomerDashboard)}
                    active={view === "customer-dashboard"}
                  >
                    My Saved & Messages
                  </MobileLink>
                )}
                {role === "VENDOR" && (
                  <MobileLink
                    onClick={nav(openVendorDashboard)}
                    active={view === "vendor-dashboard"}
                  >
                    Vendor Dashboard
                  </MobileLink>
                )}
                {role === "ADMIN" && (
                  <MobileLink
                    onClick={nav(openAdminDashboard)}
                    active={view === "admin-dashboard"}
                  >
                    Admin Panel
                  </MobileLink>
                )}
                {!session && (
                  <div className="mt-4 flex flex-col gap-2">
                    <Button onClick={() => { openAuth("login"); setMobileOpen(false); }}>
                      Log in
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { openAuth("signup"); setMobileOpen(false); }}
                    >
                      Sign up
                    </Button>
                  </div>
                )}
                {session && (
                  <Button
                    variant="outline"
                    className="mt-4 text-rose-600"
                    onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function MobileLink({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors hover:bg-accent",
        active && "bg-accent text-primary"
      )}
    >
      {children}
    </button>
  );
}
