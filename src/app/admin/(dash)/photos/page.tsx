import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { mediaUrl } from "@/lib/media";
import { moveGalleryPhotoAction, removeGalleryPhotoAction, saveGalleryAltAction } from "../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import GalleryUpload from "@/components/admin/GalleryUpload";
import { Card, Empty, Flash, PageHeader, btnDangerCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const MAX = 12;
const iconBtn = "grid size-9 place-items-center rounded-full bg-panel text-ink ring-1 ring-line-strong transition hover:bg-plaster hover:ring-lacquer disabled:opacity-40";

const Arrow = ({ up }: { up?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
  </svg>
);

export default async function PhotosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const photos = settings.galleryPhotos;
  const ids = photos.map((p) => p.mediaId);
  const media = ids.length ? await db.select({ id: t.media.id, width: t.media.width, height: t.media.height }).from(t.media).where(inArray(t.media.id, ids)) : [];
  const dims = new Map(media.map((m) => [m.id, m]));
  const shown = photos.filter((p) => dims.has(p.mediaId));

  return (
    <>
      <PageHeader title="Photos" subtitle={`The photo wall on your booking page · ${shown.length} of ${MAX}`}>
        <GalleryUpload remaining={MAX - shown.length} />
      </PageHeader>
      <Flash sp={sp} />

      <Card title="How it works" className="mb-6">
        <p className="max-w-2xl text-sm text-ink-soft">
          Photos added here hang on the booking page under &ldquo;Fresh from the chair&rdquo;, in this order, after your menu. Your work, the studio, a fresh set of brows: anything clients should see.
          Phone photos are fine; they&apos;re resized and cleaned of location data automatically. Category photos for the menu are added under Services.
        </p>
      </Card>

      {shown.length === 0 ? (
        <Card>
          <Empty
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
                <circle cx="9" cy="10" r="1.6" />
                <path d="m20.5 16-4.8-4.8L6 19" />
              </svg>
            }
          >
            No photos yet. Add a few to fill the photo wall on your booking page.
          </Empty>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p, i) => (
            <li key={p.mediaId}>
              <Card className="h-full">
                <div className="flex gap-4">
                  <span className="mirror block aspect-[3/4] w-24 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(p.mediaId)!} alt={p.alt || `Photo ${i + 1}`} className="absolute inset-0 size-full object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">Photo {i + 1}</p>
                    <form key={p.alt} action={saveGalleryAltAction} className="mt-2 space-y-2">
                      <input type="hidden" name="mediaId" value={p.mediaId} />
                      <label htmlFor={`alt-${p.mediaId}`} className="block text-sm font-medium">
                        Describe it
                      </label>
                      <input id={`alt-${p.mediaId}`} name="alt" defaultValue={p.alt} maxLength={200} placeholder="e.g. Fresh brow lamination" className={inputCls} />
                      <SubmitButton className={`${btnSecondaryCls} px-3 py-1.5 text-xs`}>Save</SubmitButton>
                    </form>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <div className="flex gap-1.5">
                    <form action={moveGalleryPhotoAction}>
                      <input type="hidden" name="mediaId" value={p.mediaId} />
                      <input type="hidden" name="dir" value="up" />
                      <button type="submit" disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className={iconBtn}>
                        <Arrow up />
                      </button>
                    </form>
                    <form action={moveGalleryPhotoAction}>
                      <input type="hidden" name="mediaId" value={p.mediaId} />
                      <input type="hidden" name="dir" value="down" />
                      <button type="submit" disabled={i === shown.length - 1} aria-label={`Move photo ${i + 1} later`} className={iconBtn}>
                        <Arrow />
                      </button>
                    </form>
                  </div>
                  <form action={removeGalleryPhotoAction}>
                    <input type="hidden" name="mediaId" value={p.mediaId} />
                    <SubmitButton className={`${btnDangerCls} px-3 py-1.5 text-xs`} confirm="Remove this photo from your booking page?" pendingText="Removing…">
                      Remove
                    </SubmitButton>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
