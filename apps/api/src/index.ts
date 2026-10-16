import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import "./types"; // FastifyRequest augmentation (tenant, adminUser)
import { env } from "./env";
import { resolveTenant } from "./lib/tenant";
import { verifyAdmin } from "./lib/admin-auth";
import { healthRoutes } from "./routes/health";
import { catalogRoutes } from "./routes/catalog";
import { orderRoutes } from "./routes/orders";
import { feedbackRoutes } from "./routes/feedback";
import { adminOrderRoutes } from "./routes/admin/orders";
import { adminMenuRoutes } from "./routes/admin/menu";
import { adminZoneRoutes } from "./routes/admin/zones";
import { adminMeRoutes, adminSettingsRoutes } from "./routes/admin/settings";

/** Stricter per-minute budget for every /api/admin/* route. */
const ADMIN_RATE_LIMIT = { max: 60, timeWindow: "1 minute" } as const;

async function main() {
  const app = Fastify({
    logger: true,
    // Behind Render's reverse proxy so request.ip reflects the real client.
    trustProxy: true,
    // Explicit cap on JSON payloads (default is also 1mb; be explicit).
    bodyLimit: 1024 * 1024,
  });

  // Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, ...).
  // Sensible @fastify/helmet defaults; this is a JSON API, no HTML served.
  await app.register(helmet);

  // CORS: reflect ONLY the configured web origins. No wildcard, and no
  // credentials mode (auth uses Bearer tokens, not cookies).
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    // x-tenant-slug + Authorization are custom headers → allow them
    allowedHeaders: ["Content-Type", "Authorization", "x-tenant-slug"],
  });

  // Rate limiting. global:false → only routes with an explicit config are
  // limited (/health has none, so keep-warm pings can never 429).
  await app.register(rateLimit, {
    global: false,
    // No PII in the limit key: client IP only.
    keyGenerator: (req: FastifyRequest) => req.ip,
  });

  // Apply the admin budget to every /api/admin/* route at registration time.
  app.addHook("onRoute", (routeOptions) => {
    if (typeof routeOptions.url === "string" && routeOptions.url.startsWith("/api/admin/")) {
      routeOptions.config = {
        ...(routeOptions.config as object | undefined),
        rateLimit: ADMIN_RATE_LIMIT,
      };
    }
  });

  // Tenant resolution for every /api/* request (except /health)
  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health" || !request.url.startsWith("/api")) return;
    const raw = request.headers["x-tenant-slug"];
    const slug = Array.isArray(raw) ? raw[0] : raw;
    if (!slug) {
      return reply.code(400).send({ error: "Missing x-tenant-slug header" });
    }
    const tenant = await resolveTenant(slug);
    if (!tenant) {
      return reply.code(404).send({ error: "Unknown restaurant" });
    }
    request.tenant = tenant;
  });

  // Admin role gate for /api/admin/*
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/admin/")) return;
    const check = await verifyAdmin(request);
    if (!check.ok) {
      return reply.code(check.status ?? 403).send({ error: check.error });
    }
  });

  await app.register(healthRoutes);
  await app.register(catalogRoutes);
  await app.register(orderRoutes);
  await app.register(feedbackRoutes);
  await app.register(adminOrderRoutes);
  await app.register(adminMenuRoutes);
  await app.register(adminZoneRoutes);
  await app.register(adminMeRoutes);
  await app.register(adminSettingsRoutes);

  app.setErrorHandler((error, _request, reply) => {
    // Generic message to the client; full error stays in server logs.
    app.log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[mezban-api] failed to start:", err);
  process.exit(1);
});
