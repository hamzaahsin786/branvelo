"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setStaffToken, tenantApiOrigin } from "@/lib/staff-api";

/** Admin sign-in - Django staff login (per-tenant token auth). */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const exchanged = useRef(false);

  // Central sign-in handoff: the platform site's login sends owners here
  // with a short-lived signed handoff in the URL. Swap it for the normal
  // staff token and go straight to the dashboard; on any failure fall
  // back to the regular form with the reason shown.
  useEffect(() => {
    if (exchanged.current) return;
    const handoff = new URLSearchParams(window.location.search).get(
      "handoff",
    );
    if (!handoff) return;
    exchanged.current = true;
    // Drop the handoff from the address bar so a refresh cannot replay it.
    window.history.replaceState(null, "", window.location.pathname);
    setBusy(true);
    (async () => {
      try {
        const res = await fetch(`${tenantApiOrigin()}/api/staff/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handoff }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.token) {
          setError(
            data.detail ||
              "This sign-in link has expired. Please sign in here.",
          );
          return;
        }
        setStaffToken(data.token);
        router.replace("/admin/menu");
      } catch {
        setError("Network error. Please try again");
      } finally {
        setBusy(false);
      }
    })();
  }, [router]);

  const signIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${tenantApiOrigin()}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        setError(data.detail || "Invalid email or password");
        return;
      }
      setStaffToken(data.token);
      router.push("/admin/menu");
    } catch {
      setError("Network error. Please try again");
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
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
