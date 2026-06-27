"use client";

import { ShieldCheck, Instagram, Mail, MapPin } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { CATEGORIES } from "@/lib/constants";

export function Footer() {
  const goHome = useAppStore((s) => s.goHome);
  const openBecomeVendor = useAppStore((s) => s.openBecomeVendor);

  return (
    <footer className="mt-auto border-t border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="font-extrabold">TrustVend Nigeria</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Nigeria&apos;s trusted directory for Instagram businesses. Find
              verified vendors, shop with confidence.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button onClick={() => goHome()} className="hover:text-primary transition">
                  Browse vendors
                </button>
              </li>
              <li>
                <button onClick={() => goHome({ category: "Fashion & Clothing" })} className="hover:text-primary transition">
                  Fashion &amp; Clothing
                </button>
              </li>
              <li>
                <button onClick={() => goHome({ category: "Food & Catering" })} className="hover:text-primary transition">
                  Food &amp; Catering
                </button>
              </li>
              <li>
                <button onClick={() => goHome({ category: "Beauty & Makeup" })} className="hover:text-primary transition">
                  Beauty &amp; Makeup
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">For vendors</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button onClick={openBecomeVendor} className="hover:text-primary transition">
                  List your business
                </button>
              </li>
              <li>
                <button onClick={() => goHome()} className="hover:text-primary transition">
                  How verification works
                </button>
              </li>
              <li>
                <button onClick={() => goHome()} className="hover:text-primary transition">
                  Featured listings
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> hello@trustvend.ng
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="h-3.5 w-3.5" /> @trustvendng
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> Lagos, Nigeria
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TrustVend Nigeria. Built for trust in online commerce.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <button className="hover:text-primary transition">Privacy</button>
            <button className="hover:text-primary transition">Terms</button>
            <button className="hover:text-primary transition">Help</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
