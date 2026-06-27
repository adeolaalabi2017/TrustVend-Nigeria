"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImagePlus, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PhotoUploader({
  photos,
  onChange,
  max = 6,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - photos.length;
    if (remaining <= 0) {
      toast.error(`You can upload up to ${max} photos.`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        uploaded.push(data.url);
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message}`);
      }
    }
    if (uploaded.length) {
      onChange([...photos, ...uploaded]);
      toast.success(`${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} added.`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (photos.length >= max) {
      toast.error(`You can upload up to ${max} photos.`);
      return;
    }
    onChange([...photos, url]);
    setUrlInput("");
    setShowUrl(false);
  }

  function remove(i: number) {
    onChange(photos.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 transition p-6 text-center"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-sm font-medium">
              {uploading ? "Uploading..." : "Click to upload or drag & drop"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              JPG, PNG, WebP or GIF · max 5MB each
            </p>
          </div>
        </div>
      </div>

      {/* Preview grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <div
              key={i}
              className="relative group aspect-square rounded-lg overflow-hidden ring-1 ring-border"
            >
              <Image src={p} alt={`Photo ${i + 1}`} fill className="object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 rounded bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-bold">
                  COVER
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* URL fallback toggle */}
      <div>
        {!showUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrl(true)}
            className="text-muted-foreground"
          >
            <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Add via URL instead
          </Button>
        ) : (
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder="https://example.com/photo.jpg"
            />
            <Button type="button" size="sm" onClick={addUrl}>
              <ImagePlus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {photos.length}/{max} photos
      </p>
    </div>
  );
}
