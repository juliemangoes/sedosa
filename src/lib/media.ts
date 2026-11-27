import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";

export class MediaError extends Error {}

/**
 * Photos are sized in the browser before upload (see prepareUpload in
 * components/admin/ImageUpload): rotated upright, scaled (category photos
 * cropped to 4:3) and re-encoded as JPEG, which drops camera and location
 * data. The server only accepts real JPEG, PNG or WebP images, reads their
 * dimensions and strips any metadata that is still present, in plain code that
 * runs anywhere (Node.js or Cloudflare Workers, which can't load native image
 * libraries).
 */
export type MediaKind = "category" | "receipt" | "gallery";

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
/** What we keep in the database and serve; browser-sized uploads are far below this. */
const MAX_STORED_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 4096;

type Info = { mime: "image/jpeg" | "image/png" | "image/webp"; width: number; height: number };

export async function processImage(input: Uint8Array, kind: MediaKind) {
  void kind;
  if (input.length > MAX_INPUT_BYTES) throw new MediaError("That image is too large (12 MB max).");
  const info = readImageInfo(input);
  if (!info || !info.width || !info.height) throw new MediaError("That file isn't an image we can read. Please use a JPG, PNG or WebP photo.");
  if (info.width > MAX_SIDE || info.height > MAX_SIDE) throw new MediaError("That photo is too big to use as it is. Please try a smaller copy.");
  const bytes = info.mime === "image/jpeg" ? stripJpeg(input) : info.mime === "image/png" ? stripPng(input) : stripWebp(input);
  if (bytes.length > MAX_STORED_BYTES) throw new MediaError("That photo is too large. Please try a smaller copy.");
  return { bytes: Buffer.from(bytes), width: info.width, height: info.height, mime: info.mime };
}

export async function saveMedia(db: DB, kind: MediaKind, input: Uint8Array) {
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

// ---------------------------------------------------------------- formats

const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u24le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32le = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const ascii = (b: Uint8Array, o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));

/** Format and pixel size from the file header, or null when it isn't a JPEG, PNG or WebP. */
export function readImageInfo(b: Uint8Array): Info | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return jpegInfo(b);
  if (b.length > 24 && ascii(b, 1, 3) === "PNG" && b[0] === 0x89 && ascii(b, 12, 4) === "IHDR") return { mime: "image/png", width: u32be(b, 16), height: u32be(b, 20) };
  if (b.length > 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return webpInfo(b);
  return null;
}

function jpegInfo(b: Uint8Array): Info | null {
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) return null;
    const marker = b[o + 1];
    if (marker === 0xff) {
      o++; // fill byte
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end of image / start of scan before a frame header
    const len = u16be(b, o + 2);
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { mime: "image/jpeg", height: u16be(b, o + 5), width: u16be(b, o + 7) };
    }
    o += 2 + len;
  }
  return null;
}

function webpInfo(b: Uint8Array): Info | null {
  const chunk = ascii(b, 12, 4);
  const d = 20;
  if (chunk === "VP8X") return { mime: "image/webp", width: u24le(b, d + 4) + 1, height: u24le(b, d + 7) + 1 };
  if (chunk === "VP8 " && b[d + 3] === 0x9d && b[d + 4] === 0x01 && b[d + 5] === 0x2a) {
    return { mime: "image/webp", width: u16le(b, d + 6) & 0x3fff, height: u16le(b, d + 8) & 0x3fff };
  }
  if (chunk === "VP8L" && b[d] === 0x2f) {
    const bits = u32le(b, d + 1);
    return { mime: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/** Drops EXIF/XMP (APP1), IPTC (APP13), other app segments and comments; keeps JFIF, ICC colour and Adobe markers. */
function stripJpeg(b: Uint8Array): Uint8Array {
  const keepApp = new Set([0xe0, 0xe2, 0xee]); // APP0 JFIF, APP2 ICC profile, APP14 Adobe
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let o = 2;
  while (o + 4 <= b.length && b[o] === 0xff) {
    const marker = b[o + 1];
    if (marker === 0xda) break; // the image data follows; copy the rest as is
    const len = u16be(b, o + 2);
    const seg = b.subarray(o, o + 2 + len);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    if (!(isApp && !keepApp.has(marker)) && marker !== 0xfe) parts.push(seg);
    o += 2 + len;
  }
  parts.push(b.subarray(o));
  return concat(parts);
}

/** Drops text and EXIF chunks (tEXt, zTXt, iTXt, eXIf, tIME) from a PNG. */
function stripPng(b: Uint8Array): Uint8Array {
  const drop = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let o = 8;
  while (o + 12 <= b.length) {
    const len = u32be(b, o);
    const type = ascii(b, o + 4, 4);
    const end = o + 12 + len;
    if (!drop.has(type)) parts.push(b.subarray(o, end));
    o = end;
    if (type === "IEND") break;
  }
  return concat(parts);
}

/** Drops EXIF and XMP chunks from a WebP and clears their flags. */
function stripWebp(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  let o = 12;
  while (o + 8 <= b.length) {
    const type = ascii(b, o, 4);
    const size = u32le(b, o + 4);
    const end = Math.min(b.length, o + 8 + size + (size & 1));
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = b.slice(o, end);
      if (type === "VP8X") chunk[8] &= ~(0x08 | 0x04); // EXIF and XMP flags
      parts.push(chunk);
    }
    o = end;
  }
  const body = concat(parts);
  const out = new Uint8Array(12 + body.length);
  out.set(b.subarray(0, 12));
  out.set(body, 12);
  const riff = out.length - 8;
  out[4] = riff & 0xff;
  out[5] = (riff >> 8) & 0xff;
  out[6] = (riff >> 16) & 0xff;
  out[7] = (riff >>> 24) & 0xff;
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
