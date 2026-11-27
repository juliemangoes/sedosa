import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local dev database) ships WASM and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Cloudflare Workers has no server-side image optimizer (and no sharp); the site's
  // photos are already sized and compressed, so they are served as they are.
  images: { unoptimized: true },
};

export default nextConfig;
