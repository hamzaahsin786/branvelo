import type { TenantUser } from "@mezban/shared";
import type { ResolvedTenant } from "./lib/tenant";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the tenant-resolution hook for every /api/* request. */
    tenant: ResolvedTenant;
    /** Set by verifyAdmin() for /api/admin/* requests. */
    adminUser?: TenantUser;
  }
}
