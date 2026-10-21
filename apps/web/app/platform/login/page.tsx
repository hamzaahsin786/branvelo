"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const FIELD =
  "w-full rounded-xl border border-[#D9D6F5] bg-white px-4 py-3 text-[15px] font-semibold text-[#17143A] outline-none transition focus:border-[#3B34C4] focus:ring-2 focus:ring-[#3B34C4]/20";
const LABEL =
  "mb-1.5 block text-[13px] font-extrabold uppercase tracking-wide text-[#6B6794]";

export default function LoginPage() {
  const [notice, setNotice] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Restaurant accounts live in the Django backend (v2 Phase 2/3).
    // This page is the finished UI; sign-in activates with those phases.
    setNotice(true);
  }

  return (
    <section className="bg-gradient-to-b from-[#F4F2FF] to-white py-12 lg:py-20">
      <div className="mx-auto max-w-md px-4 sm:px-6">
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
              placeholder="you@yourrestaurant.pk"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="li-password">Password</label>
            <input
              id="li-password"
              required
              type="password"
              placeholder="Your password"
              className={FIELD}
            />
          </div>
          {notice && (
            <p className="rounded-xl bg-[#FFF4DE] px-4 py-3 text-sm font-bold leading-relaxed text-[#7A5200]">
              Restaurant sign-in activates with the new Branvelo backend,
              which is being built now. Your account will use this same
              email and password.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-full bg-[#2C24A3] py-3.5 text-[16px] font-extrabold text-white transition hover:bg-[#3B34C4]"
          >
            Sign in to my dashboard
          </button>
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
