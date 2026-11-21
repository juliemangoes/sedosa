import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { sessionSecret } from "@/lib/session-secret";

/**
 * Optimistic gate for the owner dashboard: bounce signed-out visitors to the
 * login page early. Every dashboard page and server action still checks the
 * session itself (see requireAdmin).
 */
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin/login")) return NextResponse.next();
  const token = req.cookies.get("sedosa_admin")?.value;
  const secret = sessionSecret();
  if (token && secret) {
    try {
      await jwtVerify(token, secret, { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch {
      /* fall through */
    }
  }
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = { matcher: ["/admin/:path*"] };
