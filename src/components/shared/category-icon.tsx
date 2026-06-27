"use client";

import {
  Shirt,
  Sparkles,
  Scissors,
  UtensilsCrossed,
  Camera,
  PartyPopper,
  HeartPulse,
  Sofa,
  GraduationCap,
  Laptop,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "Fashion & Clothing": Shirt,
  "Beauty & Makeup": Sparkles,
  "Hair & Wigs": Scissors,
  "Food & Catering": UtensilsCrossed,
  "Photography & Videography": Camera,
  "Event Planning & Décor": PartyPopper,
  "Health & Wellness": HeartPulse,
  "Home & Interior": Sofa,
  "Education & Tutoring": GraduationCap,
  "Tech & Digital Services": Laptop,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = MAP[category] ?? Shirt;
  return <Icon className={className} />;
}
