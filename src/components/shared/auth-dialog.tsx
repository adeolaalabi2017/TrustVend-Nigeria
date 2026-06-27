"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, Store, User } from "lucide-react";
import { useAppStore } from "@/lib/store";

import { toast } from "sonner";

const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS === "true";

export function AuthDialog() {
  const { authOpen, authMode, closeAuth, openAuth } = useAppStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"login" | "signup">(authMode === "signup" || authMode === "signup-vendor" ? "signup" : "login");

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // signup state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suIsVendor, setSuIsVendor] = useState(authMode === "signup-vendor");
  const [suLoading, setSuLoading] = useState(false);

  // keep tab in sync when opened
  function onOpenChange(open: boolean) {
    if (!open) closeAuth();
    else {
      setTab(authMode === "login" ? "login" : "signup");
      setSuIsVendor(authMode === "signup-vendor");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    const res = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });
    setLoginLoading(false);
    if (res?.error) {
      toast.error(res.error === "CredentialsSignin" ? "Invalid email or password." : res.error);
      return;
    }
    if (res?.ok) {
      toast.success("Welcome back!");
      closeAuth();
      setLoginEmail("");
      setLoginPassword("");
      // Refresh session + cached data without a full page reload
      await qc.invalidateQueries({ queryKey: ["me"] });
      // Give NextAuth a moment to persist the cookie, then reload once softly.
      setTimeout(() => window.location.reload(), 300);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSuLoading(true);
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suName,
          email: suEmail,
          password: suPassword,
          role: suIsVendor ? "VENDOR" : "CUSTOMER",
        }),
      });
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}));
        throw new Error(err.error || "Registration failed");
      }
      const res = await signIn("credentials", {
        email: suEmail,
        password: suPassword,
        redirect: false,
      });
      if (res?.error) throw new Error("Account created — please log in.");
      toast.success(
        suIsVendor
          ? "Vendor account created! Complete your listing next."
          : "Account created. Welcome to TrustVend!"
      );
      closeAuth();
      setSuName("");
      setSuEmail("");
      setSuPassword("");
      setTimeout(() => window.location.reload(), 300);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSuLoading(false);
    }
  }

  return (
    <Dialog open={authOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <DialogTitle className="text-xl">TrustVend Nigeria</DialogTitle>
          </div>
          <DialogDescription>
            Sign in to save vendors, leave reviews, and message businesses.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="le">Email</Label>
                <Input
                  id="le"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lp">Password</Label>
                <Input
                  id="lp"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log in
              </Button>
              {SHOW_DEMO && (
                <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Demo accounts (password: <span className="font-mono">password123</span>)</p>
                  <p>👤 Customer: <span className="font-mono">customer@trustvend.ng</span></p>
                  <p>🏪 Vendor: <span className="font-mono">adaezecouture@trustvend.ng</span></p>
                  <p>🛡️ Admin: <span className="font-mono">admin@trustvend.ng</span></p>
                </div>
              )}
            </form>
          </TabsContent>

          {/* SIGNUP */}
          <TabsContent value="signup" className="mt-4">
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sun">Full name / Business name</Label>
                <Input
                  id="sun"
                  required
                  value={suName}
                  onChange={(e) => setSuName(e.target.value)}
                  placeholder={suIsVendor ? "e.g. Adaeze Couture" : "e.g. Chioma Okafor"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sue">Email</Label>
                <Input
                  id="sue"
                  type="email"
                  required
                  value={suEmail}
                  onChange={(e) => setSuEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup">Password</Label>
                <Input
                  id="sup"
                  type="password"
                  required
                  minLength={6}
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <label className="flex items-start gap-2.5 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition">
                <Checkbox
                  checked={suIsVendor}
                  onCheckedChange={(v) => setSuIsVendor(v === true)}
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <div className="flex items-center gap-1.5 font-medium">
                    {suIsVendor ? <Store className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5" />}
                    Sign up as a vendor
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    I want to list my Instagram business on TrustVend.
                  </p>
                </div>
              </label>
              <Button type="submit" className="w-full" disabled={suLoading}>
                {suLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create {suIsVendor ? "vendor" : ""} account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
