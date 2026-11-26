import sharp from "sharp";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";

export class MediaError extends Error {}

const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/**
 * Normalizes an uploaded image: respects phone rotation, strips metadata
 * (including GPS), and re-encodes to WebP. Category photos are cropped to 4:3.
 */
export type MediaKind = "category" | "receipt" | "gallery";

export async function processImage(input: Buffer, kind: MediaKind) {
  if (input.length > MAX_INPUT_BYTES) throw new MediaError("That image is too large (12 MB max).");
  let img;
  try {
    img = sharp(input, { failOn: "error" }).rotate();
    const meta = await img.metadata();
    if (!meta.width || !meta.height) throw new Error("no dimensions");
  } catch {
    throw new MediaError("That file isn't an image we can read. Please use a JPG, PNG or WebP photo.");
  }
  const out =
    kind === "category"
      ? img.resize({ width: 1200, height: 900, fit: "cover", position: "attention" })
      : img.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  const { data, info } = await out.webp({ quality: kind === "receipt" ? 75 : 80 }).toBuffer({ resolveWithObject: true });
  return { bytes: data, width: info.width, height: info.height, mime: "image/webp" };
}

export async function saveMedia(db: DB, kind: MediaKind, input: Buffer) {
  const p = await processImage(input, kind);
  const [row] = await db.insert(t.media).values({ kind, ...p }).returning({ id: t.media.id, width: t.media.width, height: t.media.height });
  return row;
}

export async function deleteMedia(db: DB, id: number | null | undefined) {
  if (id) await db.delete(t.media).where(eq(t.media.id, id));
}

export function mediaUrl(id: number | null | undefined) {
  return id ? `/api/media/${id}` : null;
}
