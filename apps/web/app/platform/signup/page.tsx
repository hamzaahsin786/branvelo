"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const FIELD =
  "w-full rounded-xl border border-[#D9D6F5] bg-white px-4 py-3 text-[15px] font-semibold text-[#17143A] outline-none transition focus:border-[#3B34C4] focus:ring-2 focus:ring-[#3B34C4]/20";
const LABEL =
  "mb-1.5 block text-[13px] font-extrabold uppercase tracking-wide text-[#6B6794]";

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // UI is complete; account creation is wired to the Django backend in
    // Phase 3 of the v2 plan. Until then the form confirms as a preview.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="bg-gradient-to-b from-[#F4F2FF] to-white py-16 lg:py-24">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <div className="rounded-[28px] border border-[#E4E1FA] bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E9F9EE] text-2xl font-black text-[#15803D]">
              ✓
            </span>
            <h1 className="mt-4 text-2xl font-black text-[#17143A]">
              {restaurantName ? `${restaurantName} is on its way.` : "You are on your way."}
            </h1>
            <p className="mt-2.5 text-[15px] font-semibold leading-relaxed text-[#4A4570]">
              This signup form is fully built and in preview. Account creation
              switches on with the new Branvelo backend, and your restaurant
              website and dashboard will be created automatically from these
              details.
            </p>
            <Link
              href="/platform"
              className="mt-6 inline-block rounded-full bg-[#2C24A3] px-6 py-3 text-[15px] font-extrabold text-white transition hover:bg-[#3B34C4]"
            >
              Back to the homepage
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-b from-[#F4F2FF] to-white py-12 lg:py-16">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#17143A] sm:text-4xl">
            Create your restaurant
          </h1>
          <p className="mt-2.5 text-[16px] font-semibold text-[#4A4570]">
            Your own ordering website and dashboard, for one flat monthly fee.
            No commission, ever.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-[28px] border border-[#E4E1FA] bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label className={LABEL} htmlFor="su-restaurant">Restaurant name</label>
            <input
              id="su-restaurant"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. Usama Burgers"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="su-owner">Your name</label>
            <input
              id="su-owner"
              required
              placeholder="Owner or manager name"
              className={FIELD}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="su-phone">Mobile number</label>
              <input
                id="su-phone"
                required
                type="tel"
                placeholder="03XX XXXXXXX"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="su-city">City</label>
              <input
                id="su-city"
                required
                placeholder="e.g. Lahore"
                className={FIELD}
              />
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor="su-email">Email</label>
            <input
              id="su-email"
              required
              type="email"
              placeholder="you@yourrestaurant.pk"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="su-locations">Number of locations</label>
            <select id="su-locations" className={FIELD} defaultValue="1">
              <option value="1">1 location</option>
              <option value="2">2 locations</option>
              <option value="3">3 locations</option>
              <option value="4+">4 or more</option>
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="su-password">Password</label>
            <input
              id="su-password"
              required
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              className={FIELD}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-[#2C24A3] py-3.5 text-[16px] font-extrabold text-white transition hover:bg-[#3B34C4]"
          >
            Create my restaurant
          </button>
          <p className="text-center text-[13px] font-semibold leading-relaxed text-[#6B6794]">
            Free to set up. By continuing you agree to our terms. We never
            take a percentage of your orders.
          </p>
        </form>

        <p className="mt-5 text-center text-[15px] font-bold text-[#4A4570]">
          Already on Branvelo?{" "}
          <Link href="/platform/login" className="font-extrabold text-[#2C24A3] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
