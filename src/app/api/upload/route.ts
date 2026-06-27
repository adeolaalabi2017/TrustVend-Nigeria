import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { requireSameOrigin } from "@/lib/request-guard";
import { getCurrentUser } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MAGIC_BYTES: [string, string][] = [
  ["\xFF\xD8\xFF", ".jpg"],
  ["\x89PNG\r\n\x1A\n", ".png"],
  ["RIFF", ".webp"], // partial; WebP in RIFF container
  ["GIF8", ".gif"],
];

function sniffType(buffer: Buffer): string | null {
  const header = buffer.slice(0, 12);
  const hex = header.toString("binary");

  if (hex.startsWith("\xFF\xD8\xFF")) return "image/jpeg";
  if (hex.startsWith("\x89PNG\r\n\x1A\n")) return "image/png";
  if (hex.startsWith("GIF8")) return "image/gif";
  if (hex.startsWith("RIFF") && hex.includes("WEBP")) return "image/webp";

  return null;
}

function extForType(type: string): string {
  switch (type) {
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/webp": return ".webp";
    case "image/gif": return ".gif";
    default: return ".bin";
  }
}

export async function POST(req: NextRequest) {
  // CSRF guard
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;

  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse multipart form
  let fileBuffer: Buffer | null = null;
  let detectedType: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Invalid file." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed." }, { status: 400 });
    }

    // Read buffer for magic-byte sniff
    fileBuffer = Buffer.from(await file.arrayBuffer());

    // Magic-byte validation — reject if MIME doesn't match content
    detectedType = sniffType(fileBuffer);
    if (!detectedType || detectedType !== file.type) {
      return NextResponse.json({ error: "File content does not match declared type." }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate UUID filename with correct extension
    const uuid = crypto.randomUUID();
    const ext = extForType(detectedType);
    const filename = `${uuid}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Write file
    await writeFile(filepath, fileBuffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (e: any) {
    console.error("upload error", e?.message);
    return NextResponse.json(
      { error: "Upload failed." },
      { status: 500 }
    );
  }
}
