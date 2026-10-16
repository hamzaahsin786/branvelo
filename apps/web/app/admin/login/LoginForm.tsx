"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { useTenantSlug } from "@/lib/tenant-context";

/** Admin sign-in — Supabase Auth email/password, then role-checked via the API. */
export function LoginForm() {
  const router = useRouter();
  const slug = useTenantSlug();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError || !data.session) {
        setError("Invalid email or password");
        return;
      }
      // Verify this account is actually staff of this restaurant
      const res = await apiFetch("/api/admin/me", slug, {
        token: data.session.access_token,
      });
      if (!res.ok) {
        await supabase.auth.signOut();
        setError("This account has no staff access for this restaurant");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm ring-1 ring-neutral-100">
        <h1 className="text-xl font-extrabold">Restaurant Admin</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sign in to manage orders & menu
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            onKeyDown={(e) => e.key === "Enter" && signIn()}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
          />
          <button
            onClick={signIn}
            disabled={busy}
            className="rounded-full bg-neutral-900 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
