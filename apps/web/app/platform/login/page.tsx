"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { DotGrid, SmileArc } from "@/components/platform/Backdrop";

const FIELD =
  "w-full rounded-xl border border-[#D9D6F5] bg-white px-4 py-3 text-[15px] font-semibold text-[#17143A] outline-none transition focus:border-[#3B34C4] focus:ring-2 focus:ring-[#3B34C4]/20";
const LABEL =
  "mb-1.5 block text-[13px] font-extrabold uppercase tracking-wide text-[#6B6794]";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // The platform API checks the owner account inside the tenant's
      // schema and returns a short-lived signed handoff. The browser then
      // moves to the restaurant's own subdomain, whose admin login swaps
      // the handoff for the normal staff session.
      const res = await fetch(`${API_BASE}/api/platform/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.slug || !data.handoff) {
        setError(data.detail || "Invalid email or password.");
        setBusy(false);
        return;
      }
      const apex = window.location.hostname.replace(/^www\./, "");
      const port = window.location.port ? `:${window.location.port}` : "";
      window.location.href =
        `${window.location.protocol}//${data.slug}.${apex}${port}` +
        `/admin/login?handoff=${encodeURIComponent(data.handoff)}`;
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F2FF] to-white py-12 lg:py-20">
      <DotGrid className="left-[-40px] top-[-20px] h-[220px] w-[320px]" drift />
      <SmileArc className="bottom-[24px] right-[5%] hidden lg:block" width={230} opacity={0.12} />
      <div className="relative mx-auto max-w-md px-4 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#17143A]">
            Restaurant sign in
          </h1>
          <p className="mt-2.5 text-[16px] font-semibold text-[#4A4570]">
            Open your dashboard to see today's orders.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-[28px] border border-[#E4E1FA] bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label className={LABEL} htmlFor="li-email">Email</label>
            <input
              id="li-email"
              required
              type="email"
              autoComplete="email"
              placeholder="you@yourrestaurant.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="li-password">Password</label>
            <input
              id="li-password"
              required
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD}
            />
          </div>
          {error && (
            <p className="rounded-xl bg-[#FEF2F2] px-4 py-3 text-[14px] font-bold text-[#B91C1C]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#2C24A3] py-3.5 text-[16px] font-extrabold text-white transition hover:bg-[#3B34C4] disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign in to my dashboard"}
          </button>
          <p className="text-center text-[13px] font-semibold leading-relaxed text-[#6B6794]">
            This sign-in is for the restaurant owner account. Managers and
            staff sign in on the restaurant's own web address.
          </p>
        </form>

        <p className="mt-5 text-center text-[15px] font-bold text-[#4A4570]">
          New to Branvelo?{" "}
          <Link href="/platform/signup" className="font-extrabold text-[#2C24A3] hover:underline">
            Create your restaurant
          </Link>
        </p>
      </div>
    </section>
  );
}
