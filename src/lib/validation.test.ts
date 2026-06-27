import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSchema,
  instagramHandleSchema,
  urlSchema,
  photosSchema,
  vendorApplySchema,
  vendorPatchSchema,
  instagramLinkSchema,
  validate,
} from "./validation";

describe("emailSchema", () => {
  it("accepts valid emails", () => {
    expect(emailSchema.parse("user@example.com")).toBe("user@example.com");
    expect(emailSchema.parse("test.user@domain.co.uk")).toBe("test.user@domain.co.uk");
    expect(emailSchema.parse("name+tag@gmail.com")).toBe("name+tag@gmail.com");
  });

  it("rejects invalid emails", () => {
    expect(() => emailSchema.parse("")).toThrow();
    expect(() => emailSchema.parse("notanemail")).toThrow();
    expect(() => emailSchema.parse("@nodomain.com")).toThrow();
    expect(() => emailSchema.parse("no@tld")).toThrow();
  });
});

describe("passwordSchema", () => {
  it("accepts valid passwords (6-128 chars)", () => {
    expect(passwordSchema.parse("123456")).toBe("123456");
    expect(passwordSchema.parse("MySecurePassword1")).toBe("MySecurePassword1");
    expect(passwordSchema.parse("a".repeat(128))).toBe("a".repeat(128));
  });

  it("rejects passwords too short (< 6 chars)", () => {
    expect(() => passwordSchema.parse("12345")).toThrow();
    expect(() => passwordSchema.parse("")).toThrow();
  });

  it("rejects passwords too long (> 128 chars)", () => {
    const longPassword = "a".repeat(129);
    expect(() => passwordSchema.parse(longPassword)).toThrow();
  });
});

describe("instagramHandleSchema", () => {
  it("accepts valid handles and strips @ prefix", () => {
    expect(instagramHandleSchema.parse("@username")).toBe("username");
    expect(instagramHandleSchema.parse("@valid_handle")).toBe("valid_handle");
    expect(instagramHandleSchema.parse("username")).toBe("username");
  });

  it("rejects handles with invalid characters", () => {
    expect(() => instagramHandleSchema.parse("@user name")).toThrow();
    expect(() => instagramHandleSchema.parse("@user!name")).toThrow();
  });

  it("rejects empty handles", () => {
    expect(() => instagramHandleSchema.parse("")).toThrow();
  });
});

describe("urlSchema", () => {
  it("accepts valid http(s) URLs", () => {
    expect(urlSchema.parse("https://example.com")).toBe("https://example.com");
    expect(urlSchema.parse("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("accepts empty string (optional)", () => {
    expect(urlSchema.parse("")).toBe("");
  });
});

describe("photosSchema", () => {
  it("accepts valid /uploads paths with UUID pattern", () => {
    const result = photosSchema.parse(["/uploads/550e8400-e29b-41d4-a716-446655440000.jpg"]);
    expect(result).toEqual(["/uploads/550e8400-e29b-41d4-a716-446655440000.jpg"]);
  });

  it("accepts Instagram CDN URLs", () => {
    const result = photosSchema.parse(["https://cdninstagram.com/photo.jpg"]);
    expect(result).toEqual(["https://cdninstagram.com/photo.jpg"]);
  });

  it("accepts instagram.com direct URLs", () => {
    const result = photosSchema.parse(["https://instagram.com/p/ABCD123"]);
    expect(result).toEqual(["https://instagram.com/p/ABCD123"]);
  });

  it("rejects arbitrary external URLs", () => {
    const result = validate(photosSchema, ["https://evil.com/x.jpg"]);
    expect(result.success).toBe(false);
  });

  it("rejects /uploads paths without UUID", () => {
    const result = validate(photosSchema, ["/uploads/photo.jpg"]);
    expect(result.success).toBe(false);
  });

  it("accepts up to 6 photos", () => {
    const urls = Array.from({ length: 6 }, (_, i) =>
      `/uploads/550e8400-e29b-41d4-a716-44665544000${i}.jpg`
    );
    const result = photosSchema.parse(urls);
    expect(result).toHaveLength(6);
  });

  it("rejects more than 6 photos", () => {
    const urls = Array.from({ length: 7 }, (_, i) =>
      `/uploads/550e8400-e29b-41d4-a716-44665544000${i}.jpg`
    );
    expect(() => photosSchema.parse(urls)).toThrow();
  });
});

describe("vendorApplySchema", () => {
  it("accepts complete valid payload", () => {
    const result = validate(vendorApplySchema, {
      businessName: "Ada's Couture",
      category: "Fashion & Clothing",
      description: "Custom Ankara designs",
      products: "Ankara gowns, agbada",
      state: "Lagos",
      city: "Lekki",
      whatsapp: "+2348012345678",
      instagramHandle: "adaezecouture",
      instagramLink: "https://instagram.com/adaezecouture",
      photos: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(validate(vendorApplySchema, {}).success).toBe(false);
    expect(validate(vendorApplySchema, { businessName: "Ada's Couture" }).success).toBe(false);
  });
});

describe("vendorPatchSchema", () => {
  it("accepts valid partial updates", () => {
    const result = validate(vendorPatchSchema, { businessName: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = validate(vendorPatchSchema, { unknownField: "value" });
    expect(result.success).toBe(false);
  });
});

describe("instagramLinkSchema", () => {
  it("accepts valid Instagram URLs", () => {
    expect(instagramLinkSchema.parse("https://instagram.com/username")).toBe("https://instagram.com/username");
    expect(instagramLinkSchema.parse("https://www.instagram.com/username")).toBe("https://www.instagram.com/username");
  });

  it("accepts empty string (optional)", () => {
    expect(instagramLinkSchema.parse("")).toBe("");
  });

  it("rejects non-Instagram URLs", () => {
    expect(validate(instagramLinkSchema, "https://twitter.com/username").success).toBe(false);
    expect(validate(instagramLinkSchema, "https://example.com/page").success).toBe(false);
  });
});
