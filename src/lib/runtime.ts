/** True when running inside Cloudflare Workers (workerd) rather than Node.js. */
export const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
