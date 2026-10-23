import { NextResponse, type NextRequest } from "next/server";

const TENANT_HEADER = "x-tenant-slug";

/**
 * Tenant resolution order:
 *  1. Subdomain - usama.branvelo.com / usama.localhost
 *  2. Path prefix - /t/<slug>/...
 *  3. DEFAULT_TENANT_SLUG env (dev fallback, 'usama-burgers')
 *
 * The resolved slug is set on the x-tenant-slug request header.
 * /t/<slug> paths are rewritten to strip the prefix so the app only
 * needs / routes (storefront, /track, /admin all work uniformly).
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();

  let slug: string | null = null;

  // 1) subdomain: *.branvelo.com and *.localhost
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    if (host.endsWith(".localhost")) {
      const sub = host.slice(0, -".localhost".length);
      if (sub && sub !== "www") slug = sub;
    } else if (host.endsWith(".branvelo.com")) {
      const sub = host.slice(0, -".branvelo.com".length);
      if (sub && sub !== "www" && !sub.includes(".")) slug = sub;
    }
  }

  // 2) /t/<slug> path prefix -> rewrite to strip it
  let rewriteTo: URL | null = null;
  const pathMatch = url.pathname.match(/^\/t\/([^/]+)(\/.*)?$/);
  if (pathMatch) {
    slug = decodeURIComponent(pathMatch[1]);
    const rest = pathMatch[2] || "/";
    rewriteTo = new URL(rest + url.search, req.url);
  }

  // 3) default (dev)
  if (!slug) {
    slug = process.env.DEFAULT_TENANT_SLUG || "usama-burgers";
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(TENANT_HEADER, slug);

  if (rewriteTo) {
    return NextResponse.rewrite(rewriteTo, {
      request: { headers: requestHeaders },
    });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
