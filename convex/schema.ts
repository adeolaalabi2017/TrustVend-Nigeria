import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * TrustVend Nigeria — Convex schema.
 *
 * Direct port of the Prisma schema in prisma/schema.prisma.
 * Convex replaces SQLite + Prisma; NextAuth stays as the auth provider.
 *
 * Index naming follows Convex conventions (`by_<field>`). Compound indexes
 * use `by_<field1>_<field2>`. Unique constraints are expressed as
 * `.index(..., ["f1", "f2"])` and enforced at the application layer
 * (see the matching function in convex/<entity>.ts).
 */

const role = v.union(
  v.literal("CUSTOMER"),
  v.literal("VENDOR"),
  v.literal("ADMIN")
);

const vendorStatus = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("SUSPENDED"),
  v.literal("REJECTED")
);

const verificationStage = v.union(
  v.literal("NONE"),
  v.literal("INSTAGRAM_CHECK"),
  v.literal("MANUAL_REVIEW"),
  v.literal("PAYMENT"),
  v.literal("COMPLETED")
);

const bookingStatus = v.union(
  v.literal("PENDING"),
  v.literal("CONFIRMED"),
  v.literal("DECLINED"),
  v.literal("CANCELLED")
);

const notificationType = v.union(
  v.literal("NEW_MESSAGE"),
  v.literal("NEW_ENQUIRY"),
  v.literal("NEW_REVIEW"),
  v.literal("VENDOR_APPROVED"),
  v.literal("VENDOR_REJECTED"),
  v.literal("VERIFIED"),
  v.literal("BOOKING_REQUEST"),
  v.literal("BOOKING_CONFIRMED"),
  v.literal("BOOKING_DECLINED"),
  v.literal("BOOKING_CANCELLED"),
  v.literal("EVENT_REMINDER")
);

export default defineSchema(
  {
    // --- Users --------------------------------------------------------------
    users: defineTable({
      email: v.string(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      role,
      password: v.string(), // PBKDF2 (see convex/_helpers.ts)
      banned: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_email", ["email"])
      .index("by_role", ["role"]),

    // --- Vendors ------------------------------------------------------------
    vendors: defineTable({
      userId: v.id("users"),
      slug: v.string(),
      businessName: v.string(),
      category: v.string(),
      description: v.string(),
      products: v.string(),
      city: v.string(),
      state: v.string(),
      instagramHandle: v.string(),
      instagramUrl: v.string(),
      whatsappNumber: v.optional(v.string()),
      photos: v.array(v.string()),
      status: vendorStatus,
      verified: v.boolean(),
      verificationStage,
      featured: v.boolean(),
      featuredUntil: v.optional(v.number()),
      ratingAvg: v.number(),
      ratingCount: v.number(),
      views: v.number(),
      availableNote: v.optional(v.string()),
      rejectionReason: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_slug", ["slug"])
      .index("by_status", ["status"])
      .index("by_category", ["category"])
      .index("by_state", ["state"])
      .index("by_featured", ["featured"])
      .index("by_verified", ["verified"])
      .index("by_featuredUntil", ["featuredUntil"]),

    // --- Reviews ------------------------------------------------------------
    reviews: defineTable({
      vendorId: v.id("vendors"),
      userId: v.id("users"),
      rating: v.number(),
      comment: v.string(),
      hidden: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_vendor", ["vendorId"])
      .index("by_user", ["userId"])
      .index("by_vendor_user", ["vendorId", "userId"]),

    // --- Bookmarks ----------------------------------------------------------
    bookmarks: defineTable({
      userId: v.id("users"),
      vendorId: v.id("vendors"),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_vendor", ["vendorId"])
      .index("by_user_vendor", ["userId", "vendorId"]),

    // --- Threads / Messages -------------------------------------------------
    threads: defineTable({
      customerId: v.id("users"),
      vendorId: v.id("vendors"),
      lastMessageAt: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_customer", ["customerId"])
      .index("by_vendor", ["vendorId"])
      .index("by_customer_vendor", ["customerId", "vendorId"])
      .index("by_lastMessageAt", ["lastMessageAt"]),

    messages: defineTable({
      threadId: v.id("threads"),
      senderId: v.id("users"),
      body: v.string(),
      read: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_thread", ["threadId"])
      .index("by_thread_createdAt", ["threadId", "createdAt"]),

    // --- Notifications ------------------------------------------------------
    notifications: defineTable({
      userId: v.id("users"),
      type: notificationType,
      title: v.string(),
      body: v.optional(v.string()),
      link: v.optional(v.string()),
      read: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_read", ["userId", "read"])
      .index("by_user_createdAt", ["userId", "createdAt"]),

    // --- AuditLog -----------------------------------------------------------
    auditLogs: defineTable({
      actorId: v.optional(v.id("users")),
      action: v.string(),
      targetId: v.optional(v.string()),
      targetType: v.optional(v.string()),
      detail: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_actor", ["actorId"])
      .index("by_action", ["action"])
      .index("by_target", ["targetType", "targetId"])
      .index("by_createdAt", ["createdAt"]),

    // --- Bookings -----------------------------------------------------------
    bookings: defineTable({
      vendorId: v.id("vendors"),
      customerId: v.id("users"),
      customerName: v.string(),
      customerEmail: v.string(),
      customerPhone: v.optional(v.string()),
      eventDate: v.string(), // ISO date string (matches Prisma)
      eventType: v.string(),
      location: v.string(),
      notes: v.optional(v.string()),
      status: bookingStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_vendor", ["vendorId"])
      .index("by_customer", ["customerId"])
      .index("by_status", ["status"]),

    // --- Posts (blog) -------------------------------------------------------
    posts: defineTable({
      authorId: v.id("users"),
      title: v.string(),
      slug: v.string(),
      excerpt: v.string(),
      content: v.string(),
      coverImage: v.optional(v.string()),
      tags: v.array(v.string()),
      published: v.boolean(),
      views: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_published", ["published"])
      .index("by_published_createdAt", ["published", "createdAt"])
      .index("by_author", ["authorId"]),

    // --- Events -------------------------------------------------------------
    events: defineTable({
      vendorId: v.optional(v.id("vendors")),
      organizerId: v.id("users"),
      title: v.string(),
      slug: v.string(),
      description: v.string(),
      coverImage: v.optional(v.string()),
      eventDate: v.number(),
      endDate: v.optional(v.number()),
      location: v.string(),
      state: v.optional(v.string()),
      category: v.optional(v.string()),
      price: v.optional(v.string()),
      rsvpLink: v.optional(v.string()),
      capacity: v.optional(v.number()),
      views: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_vendor", ["vendorId"])
      .index("by_organizer", ["organizerId"])
      .index("by_eventDate", ["eventDate"])
      .index("by_slug", ["slug"])
      .index("by_category_state", ["category", "state"]),

    // --- EventBookmarks -----------------------------------------------------
    eventBookmarks: defineTable({
      userId: v.id("users"),
      eventId: v.id("events"),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_event", ["eventId"])
      .index("by_user_event", ["userId", "eventId"]),

    // --- Sessions (mirrors NextAuth DB sessions table; the JWT strategy
    //     in src/lib/auth.ts is session-less, but this is here for parity
    //     and for future Account/Session tables if you switch from JWT).
    // --- Vendor view tracking (per-IP dedupe) ------------------------------
    vendorViews: defineTable({
      vendorId: v.id("vendors"),
      ip: v.string(),
      viewedAt: v.number(),
    })
      .index("by_vendor_ip", ["vendorId", "ip"])
      .index("by_viewedAt", ["viewedAt"]),
  },
  {
    // schemaValidation: false, // uncomment if you want to relax validation
  }
);
