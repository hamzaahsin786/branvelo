"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
require("./types"); // FastifyRequest augmentation (tenant, adminUser)
const env_1 = require("./env");
const tenant_1 = require("./lib/tenant");
const admin_auth_1 = require("./lib/admin-auth");
const health_1 = require("./routes/health");
const catalog_1 = require("./routes/catalog");
const orders_1 = require("./routes/orders");
const feedback_1 = require("./routes/feedback");
const orders_2 = require("./routes/admin/orders");
const menu_1 = require("./routes/admin/menu");
const zones_1 = require("./routes/admin/zones");
const settings_1 = require("./routes/admin/settings");
/** Stricter per-minute budget for every /api/admin/* route. */
const ADMIN_RATE_LIMIT = { max: 60, timeWindow: "1 minute" };
async function main() {
    const app = (0, fastify_1.default)({
        logger: true,
        // Behind Render's reverse proxy so request.ip reflects the real client.
        trustProxy: true,
        // Explicit cap on JSON payloads (default is also 1mb; be explicit).
        bodyLimit: 1024 * 1024,
    });
    // Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, ...).
    // Sensible @fastify/helmet defaults; this is a JSON API, no HTML served.
    await app.register(helmet_1.default);
    // CORS: reflect ONLY the configured web origins. No wildcard, and no
    // credentials mode (auth uses Bearer tokens, not cookies).
    await app.register(cors_1.default, {
        origin: env_1.env.WEB_ORIGIN,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        // x-tenant-slug + Authorization are custom headers -> allow them
        allowedHeaders: ["Content-Type", "Authorization", "x-tenant-slug"],
    });
    // Apply the admin budget to every /api/admin/* route at registration time.
    // NOTE: this onRoute hook must be added BEFORE the rate-limit plugin is
    // registered below, so the plugin sees the config when its own onRoute
    // hook fires for each route.
    app.addHook("onRoute", (routeOptions) => {
        if (typeof routeOptions.url === "string" && routeOptions.url.startsWith("/api/admin/")) {
            routeOptions.config = {
                ...routeOptions.config,
                rateLimit: ADMIN_RATE_LIMIT,
            };
        }
    });
    // Rate limiting. global:false -> only routes with an explicit config are
    // limited (/health has none, so keep-warm pings can never 429).
    await app.register(rate_limit_1.default, {
        global: false,
        // No PII in the limit key: client IP only.
        keyGenerator: (req) => req.ip,
    });
    // Tenant resolution for every /api/* request (except /health)
    app.addHook("onRequest", async (request, reply) => {
        if (request.url === "/health" || !request.url.startsWith("/api"))
            return;
        const raw = request.headers["x-tenant-slug"];
        const slug = Array.isArray(raw) ? raw[0] : raw;
        if (!slug) {
            return reply.code(400).send({ error: "Missing x-tenant-slug header" });
        }
        const tenant = await (0, tenant_1.resolveTenant)(slug);
        if (!tenant) {
            return reply.code(404).send({ error: "Unknown restaurant" });
        }
        request.tenant = tenant;
    });
    // Admin role gate for /api/admin/*
    app.addHook("preHandler", async (request, reply) => {
        if (!request.url.startsWith("/api/admin/"))
            return;
        const check = await (0, admin_auth_1.verifyAdmin)(request);
        if (!check.ok) {
            return reply.code(check.status ?? 403).send({ error: check.error });
        }
    });
    await app.register(health_1.healthRoutes);
    await app.register(catalog_1.catalogRoutes);
    await app.register(orders_1.orderRoutes);
    await app.register(feedback_1.feedbackRoutes);
    await app.register(orders_2.adminOrderRoutes);
    await app.register(menu_1.adminMenuRoutes);
    await app.register(zones_1.adminZoneRoutes);
    await app.register(settings_1.adminMeRoutes);
    await app.register(settings_1.adminSettingsRoutes);
    app.setErrorHandler((error, _request, reply) => {
        // Generic message to the client; full error stays in server logs.
        app.log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    });
    await app.listen({ port: env_1.env.PORT, host: "0.0.0.0" });
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[branvelo-api] failed to start:", err);
    process.exit(1);
});
