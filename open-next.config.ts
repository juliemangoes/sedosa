import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page that shows live data is rendered per request (force-dynamic), so the site
// needs no incremental cache: the adapter's default (no cache) fits.
export default defineCloudflareConfig({});
