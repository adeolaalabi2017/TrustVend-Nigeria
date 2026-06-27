import { z } from "zod";

/**
 * Server-side validation schemas. The frontend has its own checks, but these
 * are the source of truth — every mutation validates against them.
 */

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(6).max(128);
export const nameSchema = z.string().trim().min(1).max(100);

export const whatsappSchema = z
  .string()
  .trim()
  .min(7, "WhatsApp number is too short")
  .max(20, "WhatsApp number is too long")
  .regex(/^[0-9+]+$/, "WhatsApp number may only contain digits and +");

export const instagramHandleSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^@?[a-zA-Z0-9._]+$/, "Instagram handle contains invalid characters")
  .transform((s) => s.replace(/^@/, ""));

export const instagramLinkSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .max(2048)
  .refine(
    (v) => /^https:\/\/(www\.)?instagram\.com\//.test(v),
    "Instagram link must be from instagram.com"
  )
  .optional()
  .or(z.literal(""));

export const urlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .max(2048)
  .refine(
    (v) => v.startsWith("https://") || v.startsWith("http://"),
    "Must be an http(s) URL"
  )
  .optional()
  .or(z.literal(""));

export const stateSchema = z.string().trim().min(1).max(60);
export const citySchema = z.string().trim().max(60).optional().or(z.literal(""));
export const categorySchema = z.string().trim().min(1).max(60);
export const descriptionSchema = z.string().trim().max(2000).optional().or(z.literal(""));
export const productsSchema = z.string().trim().max(2000).optional().or(z.literal(""));
export const businessNameSchema = z.string().trim().min(1).max(120);

// Photos: array of URL strings, max 6.
// Allowed: /uploads/<uuid>.<ext> (from /api/upload) or Instagram CDN URLs.
const UPLOAD_PATH_RE = /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif)$/i;
const INSTAGRAM_RE = /^https?:\/\/(www\.)?cdninstagram\.com\//i;

export const photosSchema = z
  .array(z.string().trim().max(2048))
  .max(6, "Maximum 6 photos allowed")
  .refine(
    (arr) =>
      arr.every(
        (p) =>
          UPLOAD_PATH_RE.test(p) ||
          INSTAGRAM_RE.test(p) ||
          /^https:\/\/instagram\.com\//i.test(p)
      ),
    "Photos must be uploaded images or Instagram CDN URLs"
  )
  .optional();

export const ratingSchema = z.number().int().min(1).max(5);
export const commentSchema = z.string().trim().min(1, "Review cannot be empty").max(2000);
export const messageSchema = z.string().trim().min(1, "Message cannot be empty").max(5000);
export const subjectSchema = z.string().trim().max(200).optional().or(z.literal(""));
export const noteSchema = z.string().trim().max(1000).optional().or(z.literal(""));

// Vendor apply payload
export const vendorApplySchema = z.object({
  businessName: businessNameSchema,
  category: categorySchema,
  description: descriptionSchema,
  products: productsSchema,
  state: stateSchema,
  city: citySchema,
  whatsapp: whatsappSchema,
  instagramHandle: instagramHandleSchema,
  instagramLink: instagramLinkSchema,
  photos: photosSchema,
});

// Vendor patch payload (all optional)
export const vendorPatchSchema = z
  .object({
    businessName: businessNameSchema.optional(),
    category: categorySchema.optional(),
    description: descriptionSchema.optional(),
    products: productsSchema.optional(),
    state: stateSchema.optional(),
    city: citySchema.optional(),
    whatsapp: whatsappSchema.optional(),
    instagramHandle: instagramHandleSchema.optional(),
    instagramLink: instagramLinkSchema.optional(),
    photos: photosSchema,
    available: z.boolean().optional(),
    availableNote: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .strict(); // reject unknown fields (mass-assignment guard)

// Register payload
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
  role: z.enum(["CUSTOMER", "VENDOR"]).optional(),
});

// Review payload
export const reviewSchema = z.object({
  rating: ratingSchema,
  comment: commentSchema,
});

// Thread start payload
export const threadStartSchema = z.object({
  vendorId: z.string().min(1),
  message: messageSchema,
  subject: subjectSchema,
});

// Message send payload
export const messageSendSchema = z.object({
  message: messageSchema,
});

// Bookmark toggle payload
export const bookmarkSchema = z.object({
  vendorId: z.string().min(1),
});

// Booking create payload
export const bookingCreateSchema = z.object({
  vendorId: z.string().min(1),
  requestedDate: z
    .union([z.string(), z.number(), z.date()])
    .refine((v) => !isNaN(new Date(v as any).getTime()), "Invalid date")
    .transform((v) => new Date(v as any).getTime()),
  note: noteSchema,
});

// Booking update payload
export const bookingUpdateSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["confirm", "decline", "cancel"]),
});

// Admin vendor action payload
export const adminVendorActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum([
    "approve",
    "reject",
    "suspend",
    "reinstate",
    "verify",
    "unverify",
    "feature",
    "unfeature",
    "advanceStage",
  ]),
  reason: z.string().trim().max(1000).optional(),
  featureDays: z.number().int().min(1).max(365).optional(),
  stage: z
    .enum(["NONE", "INSTAGRAM_CHECK", "MANUAL_REVIEW", "PAYMENT", "COMPLETED"])
    .optional(),
});

// Admin user action payload
export const adminUserActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["ban", "unban", "makeAdmin", "makeCustomer"]),
});

// Admin review action payload
export const adminReviewActionSchema = z.object({
  action: z.enum(["hide", "restore"]),
});

// Account change-password payload
export const changePasswordSchema = z.object({
  current: z.string().min(1),
  next: passwordSchema,
});

// Notification mark-read payload
export const markReadSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

// Blog post payload
export const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().min(1, "Content is required").max(50000),
  coverImage: urlSchema,
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  published: z.boolean().optional(),
});

// Event payload
export const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(5000),
  coverImage: urlSchema,
  eventDate: z.union([z.string(), z.number(), z.date()]),
  endDate: z.union([z.string(), z.number(), z.date()]).optional(),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  price: z.string().trim().max(60).optional().or(z.literal("")),
  rsvpLink: urlSchema,
});

// Event bookmark payload
export const eventBookmarkSchema = z.object({
  eventId: z.string().min(1),
});

/**
 * Validate `data` against `schema`. Returns { success, data, error }.
 * On failure, `error` is a human-readable string.
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const first = result.error.issues[0];
  return {
    success: false,
    error: first?.message || "Invalid input.",
  };
}
