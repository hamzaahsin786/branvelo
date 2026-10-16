import type { FastifyRequest } from "fastify";
import type { TenantUser } from "@mezban/shared";
import { supabase } from "./supabase";

export interface AdminCheck {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Verifies the Supabase Auth JWT from the Authorization header, then checks
 * the users table for an active owner/manager of the resolved tenant.
 * On success, attaches request.adminUser.
 */
export async function verifyAdmin(
  request: FastifyRequest
): Promise<AdminCheck> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing Authorization token" };
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return { ok: false, status: 401, error: "Missing Authorization token" };
  }

  const { data, error } = await supabase().auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  const { data: tu } = await supabase()
    .from("users")
    .select("id, tenant_id, role, name, phone, active")
    .eq("id", data.user.id)
    .eq("tenant_id", request.tenant.id)
    .maybeSingle();

  const tenantUser = tu as TenantUser | null;
  if (!tenantUser || !tenantUser.active) {
    return { ok: false, status: 403, error: "No staff account for this restaurant" };
  }
  if (tenantUser.role !== "owner" && tenantUser.role !== "manager") {
    return { ok: false, status: 403, error: "Requires owner or manager role" };
  }

  request.adminUser = tenantUser;
  return { ok: true };
}
