"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareUpload } from "./ImageUpload";
import { btnCls } from "./ui";

/** Adds one or more photos to the landing page's photo wall. */
export default function GalleryUpload({ remaining }: { remaining: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: File[]) => {
    setError(null);
    const list = files.slice(0, remaining);
    if (files.length > remaining) setError(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} fit on the wall; the rest were skipped.`);
    for (let i = 0; i < list.length; i++) {
      setProgress({ done: i, total: list.length });
      const fd = new FormData();
      fd.set("file", await prepareUpload(list[i], "gallery"), "photo.jpg");
      fd.set("kind", "gallery");
      const res = await fetch("/api/admin/media", { method: "POST", body: fd }).catch(() => null);
      if (!res?.ok) {
        const j = res ? await res.json().catch(() => ({})) : {};
        setError(j.error ?? "Upload failed. Please try again.");
        break;
      }
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    router.refresh();
  };

  return (
    <div>
      <input
        ref={input}
        id="gallery-file"
        aria-label="Add photos to the photo wall"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) void upload(files);
        }}
      />
      <button type="button" className={btnCls} disabled={!!progress || remaining <= 0} onClick={() => input.current?.click()}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {progress ? `Uploading ${progress.done + 1} of ${progress.total}…` : remaining <= 0 ? "Photo wall is full" : "Add photos"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-[#a61b2b]">
          {error}
        </p>
      )}
    </div>
  );
}
