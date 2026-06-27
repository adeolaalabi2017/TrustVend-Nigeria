"use client";

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold ring-1 ring-emerald-600/20",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
      title="This vendor has been verified by TrustVend"
    >
      <BadgeCheck className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      Verified
    </span>
  );
}
