// Shared constants for TrustVend Nigeria

export const CATEGORIES = [
  "Fashion & Clothing",
  "Beauty & Makeup",
  "Hair & Wigs",
  "Food & Catering",
  "Photography & Videography",
  "Event Planning & Décor",
  "Health & Wellness",
  "Home & Interior",
  "Education & Tutoring",
  "Tech & Digital Services",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const NIGERIAN_STATES = [
  "Lagos",
  "Abuja FCT",
  "Rivers",
  "Kano",
  "Oyo",
  "Kaduna",
  "Enugu",
  "Anambra",
  "Delta",
  "Edo",
  "Ogun",
  "Cross River",
  "Akwa Ibom",
  "Imo",
  "Plateau",
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  "Fashion & Clothing": "Shirt",
  "Beauty & Makeup": "Sparkles",
  "Hair & Wigs": "Scissors",
  "Food & Catering": "UtensilsCrossed",
  "Photography & Videography": "Camera",
  "Event Planning & Décor": "PartyPopper",
  "Health & Wellness": "HeartPulse",
  "Home & Interior": "Sofa",
  "Education & Tutoring": "GraduationCap",
  "Tech & Digital Services": "Laptop",
};

export const VERIFICATION_STAGES = [
  { key: "INSTAGRAM_CHECK", label: "Instagram Check", desc: "Account confirmed real, active, and matches the business." },
  { key: "MANUAL_REVIEW", label: "Manual Review", desc: "Application reviewed — post history, engagement, no scam reports." },
  { key: "PAYMENT", label: "Verification Fee", desc: "One-time/annual verification fee paid." },
  { key: "COMPLETED", label: "Verified", desc: "Vendor earns the Verified ✓ badge." },
] as const;

export const VENDOR_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  SUSPENDED: "SUSPENDED",
  REJECTED: "REJECTED",
} as const;
