"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useSession } from "next-auth/react";
import {
  Store,
  Check,
  ArrowLeft,
  Instagram,
  MapPin,
  Building2,
  FileText,
  Phone,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";
import { CATEGORIES, NIGERIAN_STATES } from "@/lib/constants";

export function BecomeVendorView() {
  const { goHome, openAuth, openVendor } = useAppStore();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const me = useQuery(api.users.me, { userId });
  const isLoading = userId ? me === undefined : false;

  const apply = useMutation(api.vendors.apply);

  const [form, setForm] = useState({
    businessName: "",
    category: "",
    description: "",
    products: "",
    state: "",
    city: "",
    whatsapp: "",
    instagramHandle: "",
    instagramLink: "",
    photos: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" onClick={() => goHome()} className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to home
        </Button>
        <Card className="p-10 text-center">
          <Store className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Want to list your business?</h2>
          <p className="text-muted-foreground mb-6">Sign in to apply and start reaching trusted customers.</p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => openAuth("login")}>Log in</Button>
            <Button variant="outline" onClick={() => openAuth("signup")}>Create account</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const existing = me?.vendor;
  if (existing) {
    const status = existing.status;
    const isPending = status === "PENDING";
    const isApproved = status === "APPROVED";
    const isRejected = status === "REJECTED";
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" onClick={() => goHome()} className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to home
        </Button>
        <Card className="p-10 text-center">
          {isApproved ? (
            <>
              <Sparkles className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">You&apos;re already a vendor!</h2>
              <p className="text-muted-foreground mb-6">
                <strong>{existing.businessName}</strong> is live on TrustVend.
              </p>
              <Button onClick={() => existing.id && openVendor(existing.id)}>
                View your profile
              </Button>
            </>
          ) : isPending ? (
            <>
              <Clock className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Application under review</h2>
              <p className="text-muted-foreground mb-2">
                We received your application for <strong>{existing.businessName}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Our team typically reviews applications within 24–48 hours. You&apos;ll get an email when it&apos;s approved.
              </p>
            </>
          ) : isRejected ? (
            <>
              <FileText className="h-12 w-12 mx-auto text-rose-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Application not approved</h2>
              {existing.rejectionReason && (
                <p className="text-sm text-muted-foreground mb-6 bg-rose-50 p-3 rounded-lg border border-rose-200">
                  <strong>Reason:</strong> {existing.rejectionReason}
                </p>
              )}
              <p className="text-muted-foreground mb-4">
                You can update your details and re-apply below.
              </p>
            </>
          ) : (
            <>
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Vendor status: {status}</h2>
              <p className="text-muted-foreground">
                Contact support if you need help with your application.
              </p>
            </>
          )}
        </Card>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!form.businessName || !form.category || !form.state || !form.city || !form.instagramHandle) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apply({
        userId,
        businessName: form.businessName,
        category: form.category,
        description: form.description,
        products: form.products || undefined,
        state: form.state,
        city: form.city,
        instagramHandle: form.instagramHandle,
        instagramUrl: form.instagramLink || undefined,
        whatsappNumber: form.whatsapp || undefined,
        photos: form.photos.length ? form.photos : undefined,
      });
      toast.success("Application submitted! We'll review within 24–48 hours.");
      if (res.id) openVendor(res.id);
      else goHome();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <Button variant="ghost" size="sm" onClick={() => goHome()} className="mb-4 -ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to home
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Store className="h-7 w-7 text-primary" />
          Apply to be a vendor
        </h1>
        <p className="text-muted-foreground mt-1">
          Join 100s of trusted Nigerian vendors. We review applications within 24–48 hours.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Business details</h2>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Business name *</label>
            <Input
              required
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="Glow by Amara"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Category *</label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Description *</label>
            <Textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What do you sell? What makes you stand out?"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Products / services</label>
            <Textarea
              value={form.products}
              onChange={(e) => setForm({ ...form, products: e.target.value })}
              placeholder="List your main products or services (one per line)"
              rows={3}
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Location</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">State *</label>
              <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                <SelectTrigger><SelectValue placeholder="Choose state" /></SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">City *</label>
              <Input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Lekki"
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Contact</h2>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">WhatsApp number</label>
            <Input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="+234 803 123 4567"
            />
            <p className="text-xs text-muted-foreground mt-1">Customers will reach you via WhatsApp for enquiries.</p>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Instagram className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Instagram</h2>
            <Badge variant="secondary" className="ml-auto">Required for verification</Badge>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Instagram handle *</label>
            <Input
              required
              value={form.instagramHandle}
              onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })}
              placeholder="@yourbrand"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Instagram profile link (optional)</label>
            <Input
              type="url"
              value={form.instagramLink}
              onChange={(e) => setForm({ ...form, instagramLink: e.target.value })}
              placeholder="https://instagram.com/yourbrand"
            />
          </div>
        </Card>

        <Card className="p-5 bg-muted/40 border-amber-200/60">
          <div className="flex gap-3">
            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">What happens next?</p>
              <ol className="text-sm text-muted-foreground mt-1 space-y-1 list-decimal pl-4">
                <li>Our team manually reviews your Instagram account</li>
                <li>You receive an email when your application is approved</li>
                <li>Pay the one-time verification fee to earn the ✓ badge</li>
                <li>Get listed and start receiving customer enquiries</li>
              </ol>
            </div>
          </div>
        </Card>

        <Button type="submit" disabled={submitting} size="lg" className="w-full">
          {submitting ? "Submitting..." : "Submit application"}
        </Button>
      </form>
    </div>
  );
}