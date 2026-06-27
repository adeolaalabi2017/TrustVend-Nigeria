type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonArray = JsonValue[];

/**
 * Parse a JSON string column from SQLite (where photos/tags are stored as
 * TEXT). Returns a typed array for callers without manual JSON.parse.
 */
export function parseJsonArray(raw: string | null | undefined): JsonArray {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Serialize an array back to a JSON string for storage.
 */
export function stringifyJsonArray(arr: JsonArray): string {
  return JSON.stringify(arr);
}

/**
 * Vendor.photos helper — returns the first photo URL or null.
 */
export function firstPhoto(vendor: { photos: string }): string | null {
  const arr = parseJsonArray(vendor.photos);
  return (arr[0] as string) ?? null;
}

/**
 * Vendor.photos helper — returns all photo URLs.
 */
export function parseVendorPhotos(vendor: { photos: string }): string[] {
  return parseJsonArray(vendor.photos).filter((p): p is string => typeof p === "string");
}

/**
 * Post.tags helper — returns the parsed tags array.
 */
export function parsePostTags(post: { tags: string }): string[] {
  return parseJsonArray(post.tags).filter((t): t is string => typeof t === "string");
}

/**
 * Post.tags helper — serializes tags array for storage.
 */
export function stringifyPostTags(tags: string[]): string {
  return stringifyJsonArray(tags);
}
