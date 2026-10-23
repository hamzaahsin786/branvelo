"use client";

import { useRouter } from "next/navigation";
import { clearStaffToken } from "@/lib/staff-api";

export function SignOutButton() {
  const router = useRouter();
  const signOut = () => {
    clearStaffToken();
    router.push("/admin/login");
  };
  return (
    <button
      onClick={signOut}
      className="rounded-full border border-neutral-200 px-4 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
    >
      Sign out
    </button>
  );
}
