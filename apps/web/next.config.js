/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// API origin for CSP connect-src (the API the browser calls directly).
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
})();

// The browser always calls the API on the SAME hostname as the page
// (lib/staff-api swaps the host so tenant resolution works), so in local
// dev the allow-list must cover every tenant subdomain, not just bare
// localhost - an exact-origin entry blocks usama-burgers.localhost:8000
// before the request ever leaves the browser. Websockets (live orders)
// are governed by connect-src too, hence the ws entries. In production
// the API is same-origin behind one proxy and 'self' covers it.
const apiConnectSrc = (() => {
  try {
    const url = new URL(apiOrigin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      const port = url.port || "8000";
      return [
        apiOrigin,
        `http://localhost:${port}`,
        `http://*.localhost:${port}`,
        `ws://localhost:${port}`,
        `ws://*.localhost:${port}`,
      ].join(" ");
    }
  } catch {
    /* fall through to the bare origin */
  }
  return apiOrigin;
})();

// Uploaded photos (logo, cover, menu items) are served by the API from
// its media folder, and the upload endpoint returns absolute http URLs
// on the API host (usama-burgers.localhost:8000 in dev). img-src only
// allowed 'self' + https:, so in local dev every uploaded photo was
// blocked by the browser even though the file served fine - the same
// per-host trap as connect-src, one directive over. Dev-only loosening:
// allow the API's http origins for images. Production serves media over
// https (covered by https:) or same-origin, so it needs nothing extra.
const apiImgSrc = (() => {
  if (!isDev) return "";
  try {
    const url = new URL(apiOrigin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      const port = url.port || "8000";
      return ` http://localhost:${port} http://*.localhost:${port}`;
    }
  } catch {
    /* fall through to no extra image origins */
  }
  return "";
})();

// Supabase is used for Auth + Realtime + Storage.
const supabaseHosts = "https://*.supabase.co wss://*.supabase.co";

// Geo-IP providers the platform site uses for display-currency detection.
const geoHosts =
  "https://ipwho.is https://ipapi.co https://api.country.is https://get.geojs.io https://www.cloudflare.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js needs inline scripts/styles for hydration + Tailwind.
  // Dev mode additionally needs 'unsafe-eval' (React Refresh + webpack
  // dev runtime). Without it the dev page renders but its JavaScript is
  // dead on arrival: no hydration, no state updates. Production bundles
  // never eval, so production stays strict.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Menu photos come from Supabase Storage (https); uploaded photos come
  // from the API media host (see apiImgSrc); data: for tiny inlined assets.
  `img-src 'self' data: https:${apiImgSrc}`,
  // API calls + Supabase Auth/Realtime/Storage + geo-IP lookups.
  `connect-src 'self' ${apiConnectSrc} ${supabaseHosts} ${geoHosts}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  // Tenant subdomains (usama-burgers.localhost etc.) are first-class in
  // dev; without this Next warns about cross-origin dev requests.
  allowedDevOrigins: ["localhost", "*.localhost"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          // Never render this site inside a frame (clickjacking defense).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS is only honored over HTTPS; harmless on localhost.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
