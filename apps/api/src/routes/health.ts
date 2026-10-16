import type { FastifyInstance } from "fastify";

/** GET /health — keep-warm ping target + uptime probe. */
export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { ok: true, service: "mezban-api", time: new Date().toISOString() };
  });
}
