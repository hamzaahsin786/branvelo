"use client";

/**
 * Staff API layer for the v2 (Django) backend.
 *
 * Tenant resolution on the Django side happens by Host, so browser calls
 * must go to the API on the SAME hostname the page was served from
 * (spice-route.localhost:3000 -> spice-route.localhost:8000). Locally the
 * configured API URL points at plain localhost; we swap its hostname for
 * the page's hostname and keep its port. In production the platform is
 * same-origin behind one proxy, where this is a no-op.
 */
import { useCallback } from "react";

const TOKEN_KEY = "branvelo-staff-token";

export function tenantApiOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const url = new URL(configured);
    if (
      typeof window !== "undefined" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      window.location.hostname !== url.hostname
    ) {
      url.hostname = window.location.hostname;
    }
    return url.origin;
  } catch {
    return configured.replace(/\/$/, "");
  }
}

export function getStaffToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStaffToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearStaffToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Tenant slug from the current hostname (subdomain), for display/state. */
export function slugFromHostname(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "";
  }
  const parts = host.split(".");
  return parts.length > 2 ? parts[0] : "";
}

export async function staffFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getStaffToken();
  if (token) headers.set("Authorization", `Token ${token}`);
  // JSON is the default for string bodies; FormData bodies must keep the
  // browser's multipart content type (it carries the file boundary).
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${tenantApiOrigin()}${path}`, { ...init, headers });
}

/**
 * Drop-in replacement for the v1 useAuthedApi hook, against the Django
 * staff API. Paths are Django paths (e.g. /api/staff/catalog/items).
 */
export function useStaffApi() {
  return useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      if (!getStaffToken()) throw new Error("Not signed in");
      const res = await staffFetch(path, init);
      if (res.status === 401 || res.status === 403) {
        throw new Error("Not authorized for this restaurant");
      }
      return res;
    },
    [],
  );
}
