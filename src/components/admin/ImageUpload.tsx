"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Shrinks a photo in the browser before upload (phones take 4–12 MB photos). */
export async function downscale(file: File, max = 1800): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file; // let the server try (it will explain if it can't read it)
  }
}

type Props = {
  kind: "category" | "receipt";
  categoryId?: number;
  currentUrl: string | null;
  label: string;
  /** Called with the new media id (receipts). Category uploads refresh the page. */
  onUploaded?: (id: number, url: string) => void;
  removeAction?: (fd: FormData) => void | Promise<void>;
};

export default function ImageUpload({ kind, categoryId, currentUrl, label, onUploaded, removeAction }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const fd = new FormData();
      fd.set("file", await downscale(file), "photo.jpg");
      fd.set("kind", kind);
      if (categoryId) fd.set("categoryId", String(categoryId));
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Upload failed.");
        setPreview(currentUrl);
        return;
      }
      setPreview(j.url);
      onUploaded?.(j.id, j.url);
      if (kind === "category") router.refresh();
    } finally {
      setBusy(false);
      URL.revokeObjectURL(local);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`group relative grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-plaster-2 ring-1 ring-line transition hover:ring-lacquer ${kind === "category" ? "h-20 w-28" : "size-16"}`}
        aria-label={preview ? `Replace ${label}` : `Upload ${label}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={`size-full object-cover transition ${busy ? "opacity-50" : "group-hover:scale-105"}`} />
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink-soft" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <circle cx="9" cy="10" r="1.8" />
            <path d="m21 16-5-5-8 8" />
          </svg>
        )}
        {busy && <span className="absolute inset-0 m-auto size-6 animate-spin rounded-full border-2 border-panel/60 border-t-lacquer" aria-hidden="true" />}
      </button>
      <div className="min-w-0 text-sm">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <button type="button" className="font-medium text-lacquer hover:underline" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : preview ? "Replace photo" : "Upload photo"}
          </button>
          {preview && removeAction && categoryId && (
            <form action={removeAction}>
              <input type="hidden" name="id" value={categoryId} />
              <button type="submit" className="text-ink-soft hover:text-[#a61b2b] hover:underline">
                Remove
              </button>
            </form>
          )}
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">{kind === "category" ? "Landscape works best; it's cropped to 4:3." : "Photo of the receipt."}</p>
        {error && (
          <p role="alert" className="mt-1 text-xs font-medium text-[#a61b2b]">
            {error}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
