/**
 * Vendor serialization helpers — used by client components to normalize
 * vendor data shapes from Convex queries into the format expected by UI components.
 *
 * These functions are pure (no DB access) and work with any vendor object shape.
 */

export type VendorCard = {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  state: string;
  city?: string | null;
  photos: string[];
  verified: boolean;
  available: boolean;
  availableNote?: string | null;
  featured: boolean;
  ratingAvg: number;
  ratingCount: number;
  views: number;
  instagramHandle: string;
  whatsapp?: string | null;
  description?: string | null;
};

export type VendorDetail = VendorCard & {
  products?: string | null;
  instagramLink?: string | null;
  instagramUrl?: string | null;
  status?: string;
  verificationStage?: string;
  rejectionReason?: string | null;
  createdAt?: number;
  featuredUntil?: number | null;
  verifiedAt?: number | null;
};

export function toVendorCard(v: any): VendorCard {
  let photos: string[] = [];
  try {
    photos = Array.isArray(v.photos) ? v.photos : JSON.parse(v.photos || "[]");
  } catch {
    photos = [];
  }
  return {
    id: v.id ?? v._id,
    businessName: v.businessName,
    slug: v.slug,
    category: v.category,
    state: v.state,
    city: v.city ?? null,
    photos,
    verified: v.verified ?? false,
    available: v.available ?? false,
    availableNote: v.availableNote ?? null,
    featured: v.featured ?? false,
    ratingAvg: v.ratingAvg ?? 0,
    ratingCount: v.ratingCount ?? 0,
    views: v.views ?? 0,
    instagramHandle: v.instagramHandle ?? "",
    whatsapp: v.whatsappNumber ?? v.whatsapp ?? null,
    description: v.description ?? null,
  };
}

export function toVendorDetail(v: any): VendorDetail {
  return {
    ...toVendorCard(v),
    products: v.products ?? null,
    instagramLink: v.instagramUrl ?? v.instagramLink ?? null,
    instagramUrl: v.instagramUrl ?? null,
    status: v.status,
    verificationStage: v.verificationStage,
    rejectionReason: v.rejectionReason ?? null,
    createdAt: v.createdAt,
    featuredUntil: v.featuredUntil ?? null,
    verifiedAt: v.verifiedAt ?? null,
  };
}
