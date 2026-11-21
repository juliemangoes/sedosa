/** Public base URL for links in emails, SMS and Stripe redirects. */
export function appUrl(req?: Request): string {
  const fromEnv =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
