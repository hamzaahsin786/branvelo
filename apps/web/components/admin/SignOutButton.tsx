"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export function SignOutButton() {
  const router = useRouter();
  const signOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
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
