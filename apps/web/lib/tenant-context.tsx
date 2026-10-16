"use client";

import { createContext, useContext, type ReactNode } from "react";

const TenantContext = createContext<string>("");

/** Provides the resolved tenant slug to client components (for API calls). */
export function TenantProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider value={slug}>{children}</TenantContext.Provider>
  );
}

export function useTenantSlug(): string {
  return useContext(TenantContext);
}
