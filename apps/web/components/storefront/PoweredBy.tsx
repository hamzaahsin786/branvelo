"use client";

import { useEffect, useState } from "react";

/** The platform site's address from wherever this renders: strip the
 * tenant subdomain, keep the protocol and port. On the platform host
 * itself this resolves to the same address. */
export function platformUrl(): string {
  if (typeof window === "undefined") return "/platform";
  const { protocol, hostname, port } = window.location;
  const parts = hostname.split(".");
  const apex = parts.length > 2 ? parts.slice(1).join(".") : hostname;
  return `${protocol}//${apex}${port ? `:${port}` : ""}/platform`;
}

/** "Powered by Branvelo" attribution link, used in the storefront and
 * tracking footers. Opens the platform site in a new tab. */
export function PoweredBy({ className }: { className?: string }) {
  const [href, setHref] = useState("/platform");
  useEffect(() => {
    setHref(platformUrl());
  }, []);
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      Powered by Branvelo
    </a>
  );
}
