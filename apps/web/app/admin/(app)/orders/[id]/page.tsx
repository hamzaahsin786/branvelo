"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy v1 route. In v2, order detail lives inside the orders board
 * (click any order), so this path simply forwards there. */
export default function LegacyOrderDetailRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return (
    <p className="text-sm font-semibold text-neutral-400">
      Opening the orders board...
    </p>
  );
}
