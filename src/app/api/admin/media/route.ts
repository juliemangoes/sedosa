import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { sameOrigin } from "@/lib/http";
import { deleteMedia, MediaError, mediaUrl, saveMedia } from "@/lib/media";
import { getSettings, saveSettings } from "@/lib/settings";

/** The landing page shows up to this many uploaded photos. */
const GALLERY_MAX = 12;

export const dynamic = "force-dynamic";

/**
 * POST multipart { file, kind: "category", categoryId } — sets a category photo.
 * POST multipart { file, kind: "receipt" } — stores a receipt, returns its id.
 * POST multipart { file, kind: "gallery" } — adds a photo to the landing page's photo wall.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req) || !(await isAdmin())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  const kind = fd?.get("kind");
  if (!(file instanceof Blob) || (kind !== "category" && kind !== "receipt" && kind !== "gallery")) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  try {
    const db = await getDb();
    const buf = Buffer.from(await file.arrayBuffer());
    if (kind === "category") {
      const categoryId = Number(fd?.get("categoryId"));
      const cat = await db.query.categories.findFirst({ where: eq(t.categories.id, categoryId) });
      if (!cat) return NextResponse.json({ error: "Category not found." }, { status: 404 });
      const saved = await saveMedia(db, "category", buf);
      await db.update(t.categories).set({ imageId: saved.id }).where(eq(t.categories.id, cat.id));
      await deleteMedia(db, cat.imageId);
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, id: saved.id, url: mediaUrl(saved.id) });
    }
    if (kind === "gallery") {
      const settings = await getSettings(db);
      if (settings.galleryPhotos.length >= GALLERY_MAX) return NextResponse.json({ error: `The photo wall holds ${GALLERY_MAX} photos. Remove one to add another.` }, { status: 422 });
      const saved = await saveMedia(db, "gallery", buf);
      await saveSettings(db, { galleryPhotos: [...settings.galleryPhotos, { mediaId: saved.id, alt: "" }] });
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, id: saved.id, url: mediaUrl(saved.id) });
    }
    const saved = await saveMedia(db, "receipt", buf);
    return NextResponse.json({ ok: true, id: saved.id, url: mediaUrl(saved.id) });
  } catch (e) {
    if (e instanceof MediaError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error(e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
