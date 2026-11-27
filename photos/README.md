# Photos to add to the site

Drop the studio's photos in this folder (on GitHub: open this folder, then
**Add file → Upload files**, drag the photos in, and commit).

JPG, PNG or WebP, any size; large originals are best. They are resized and
optimised when they're placed on the site, so nothing here is served as-is.

Then ask Claude to "use the photos in /photos". Say if a photo is meant for a
particular spot, for example the hero, a menu category, or the photo wall.

## In use

Resized copies (no camera or location data) live in `src/assets/photos/` and
are wired up in `src/content/photos.ts`:

| Original | Used as |
| --- | --- |
| beautician-working-client-s-eyebrows (1).jpg | Hero (`hero-brow-mapping.jpg`) |
| beautician-working-client-s-eyebrows.jpg | All Things Brows card (`cat-brows.jpg`) |
| high-angle-hand-holding-pink-swab.jpg | Korean Lash Lifts card (`cat-lash-lift.jpg`) |
| professional-eyelash-extension-application-…jpg | Lash Lift + Brow Packages card (`cat-packages.jpg`) |
| beautician-applying-eyelash-extensions-…jpg | Lash Removal card (`cat-lash-removal.jpg`) |
| woman-going-through-microblading-treatment.jpg | PMU Services card (`cat-pmu.jpg`) |
| beautician-waxing-female-legs-spa-center.jpg | Waxing card (`cat-waxing.jpg`) |
| young-woman-going-through-microblading-procedure.jpg | Not used yet |

Photos uploaded in the dashboard always take their place: a category photo
under Services, or "Use as hero" under Photos.
