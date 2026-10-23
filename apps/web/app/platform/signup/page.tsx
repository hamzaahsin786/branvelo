"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { DotGrid, SpeedStreaks } from "@/components/platform/Backdrop";

const FIELD =
  "w-full rounded-xl border border-[#D9D6F5] bg-white px-4 py-3 text-[15px] font-semibold text-[#17143A] outline-none transition focus:border-[#3B34C4] focus:ring-2 focus:ring-[#3B34C4]/20";
const LABEL =
  "mb-1.5 block text-[13px] font-extrabold uppercase tracking-wide text-[#6B6794]";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SWATCHES = [
  { value: "#2C24A3", name: "Branvelo Indigo" },
  { value: "#C2410C", name: "Terracotta" },
  { value: "#15803D", name: "Leaf Green" },
  { value: "#B91C1C", name: "Chili Red" },
  { value: "#0F766E", name: "Teal" },
  { value: "#17143A", name: "Charcoal" },
];
const LAYOUTS = [
  { value: "classic", name: "Classic", blurb: "Menu list with photos. The proven restaurant layout." },
  { value: "grid", name: "Photo grid", blurb: "Big pictures in cards. Best for visual menus." },
  { value: "minimal", name: "Minimal", blurb: "Clean text menu. Fastest to browse." },
];
const FONTS = [
  { value: "nunito", name: "Nunito - friendly and rounded" },
  { value: "poppins", name: "Poppins - modern and geometric" },
  { value: "inter", name: "Inter - clean and neutral" },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

type SlugState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "bad"; reason: string };

type SignupResult = {
  slug: string;
  domain: string;
  storefront_url: string;
  status: string;
  trial_ends_at: string;
};

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>({ kind: "idle" });

  const [primary, setPrimary] = useState(SWATCHES[0].value);
  const [layout, setLayout] = useState("classic");
  const [font, setFont] = useState("nunito");
  const [sections, setSections] = useState({
    announcement: true,
    featured: true,
    about: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<SignupResult | null>(null);

  // Suggest the web address from the restaurant name until the owner
  // edits it by hand.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(restaurantName));
  }, [restaurantName, slugTouched]);

  // Live availability check, debounced.
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugState({ kind: "idle" });
      return;
    }
    setSlugState({ kind: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/platform/slug-check?slug=${encodeURIComponent(slug)}`,
        );
        const data = await res.json();
        setSlugState(
          data.available
            ? { kind: "ok" }
            : { kind: "bad", reason: data.reason || "Not available." },
        );
      } catch {
        // The check is a convenience; signup itself re-validates.
        setSlugState({ kind: "idle" });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [slug]);

  const trialEndLabel = useMemo(() => {
    if (!result) return "";
    try {
      return new Date(result.trial_ends_at).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, [result]);

  function onDetailsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (slugState.kind === "bad") return;
    setStep(2);
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch(`${API_BASE}/api/platform/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: restaurantName,
          slug,
          owner_name: ownerName,
          owner_email: email,
          owner_phone: phone,
          city,
          password,
          theme: { primary, layout, font, sections },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        setResult(data as SignupResult);
        setStep(3);
        return;
      }
      const firstFieldError =
        data && typeof data === "object"
          ? Object.values(data).flat().find((v) => typeof v === "string")
          : undefined;
      setServerError(
        (data && typeof data.detail === "string" && data.detail) ||
          (typeof firstFieldError === "string" && firstFieldError) ||
          "Something went wrong. Please check the details and try again.",
      );
    } catch {
      setServerError(
        "Could not reach the Branvelo server. Please try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 3 && result) {
    return (
      <section className="bg-gradient-to-b from-[#F4F2FF] to-white py-16 lg:py-24">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <div className="rounded-[28px] border border-[#E4E1FA] bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E9F9EE] text-[#15803D]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className="mt-4 text-2xl font-black text-[#17143A]">
              {restaurantName} is on Branvelo.
            </h1>
            <p className="mt-2.5 text-[15px] font-semibold leading-relaxed text-[#4A4570]">
              Your restaurant account is created and your web address is
              reserved:
            </p>
            <p className="mt-3 inline-block rounded-full bg-[#F1EFFF] px-4 py-2 text-[15px] font-extrabold text-[#2C24A3]">
              {result.domain}
            </p>
            {trialEndLabel && (
              <p className="mt-3 text-[14px] font-bold text-[#4A4570]">
                Your free trial runs until {trialEndLabel}.
              </p>
            )}
            <div className="mt-5 rounded-2xl bg-[#FAFAFF] p-4 text-left text-[14px] font-semibold leading-relaxed text-[#4A4570]">
              <p className="font-extrabold text-[#17143A]">What happens next</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                <li>Your storefront opens at your address with your colors and layout already applied.</li>
                <li>Add your menu, zones and hours from your dashboard.</li>
                <li>Share your address and start taking orders, commission free.</li>
              </ul>
            </div>
            <a
              href={result.storefront_url}
              className="mt-6 inline-block rounded-full bg-[#2C24A3] px-6 py-3 text-[15px] font-extrabold text-white transition hover:bg-[#3B34C4]"
            >
              Visit your storefront
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F2FF] to-white py-12 lg:py-16">
      <DotGrid className="right-[-40px] top-[-20px] h-[240px] w-[340px]" drift />
      <DotGrid className="bottom-[-10px] left-[-50px] h-[200px] w-[280px]" opacity={0.07} />
      <SpeedStreaks className="left-[6%] top-[110px] hidden xl:block" width={56} slow />
      <div className="relative mx-auto max-w-lg px-4 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#17143A] sm:text-4xl">
            Create your restaurant
          </h1>
          <p className="mt-2.5 text-[16px] font-semibold text-[#4A4570]">
            Your own ordering website and dashboard, for one flat monthly fee.
            No commission, ever.
          </p>
          <p className="mt-3 text-[13px] font-extrabold uppercase tracking-wide text-[#6B6794]">
            Step {step} of 2 - {step === 1 ? "Your details" : "Make it yours"}
          </p>
        </div>

        {step === 1 && (
          <form
            onSubmit={onDetailsSubmit}
            className="mt-8 space-y-4 rounded-[28px] border border-[#E4E1FA] bg-white p-6 shadow-sm sm:p-8"
          >
            <div>
              <label className={LABEL} htmlFor="su-restaurant">Restaurant name</label>
              <input
                id="su-restaurant"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Your restaurant's name"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="su-slug">Your web address</label>
              <div className="flex items-stretch overflow-hidden rounded-xl border border-[#D9D6F5] bg-white transition focus-within:border-[#3B34C4] focus-within:ring-2 focus-within:ring-[#3B34C4]/20">
                <input
                  id="su-slug"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  placeholder="your-restaurant"
                  className="w-full px-4 py-3 text-[15px] font-semibold text-[#17143A] outline-none"
                />
                <span className="flex items-center bg-[#F4F2FF] px-3 text-[14px] font-bold text-[#6B6794]">
                  .branvelo.com
                </span>
              </div>
              {slugState.kind === "checking" && (
                <p className="mt-1.5 text-[13px] font-bold text-[#6B6794]">Checking availability...</p>
              )}
              {slugState.kind === "ok" && (
                <p className="mt-1.5 text-[13px] font-bold text-[#15803D]">Available. This will be your address.</p>
              )}
              {slugState.kind === "bad" && (
                <p className="mt-1.5 text-[13px] font-bold text-[#B91C1C]">{slugState.reason}</p>
              )}
            </div>
            <div>
              <label className={LABEL} htmlFor="su-owner">Your name</label>
              <input
                id="su-owner"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XX XXXXXXX"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="su-city">City</label>
                <input
                  id="su-city"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourrestaurant.pk"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="su-password">Password</label>
              <input
                id="su-password"
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={FIELD}
              />
            </div>
            <button
              type="submit"
              disabled={slugState.kind === "bad"}
              className="w-full rounded-full bg-[#2C24A3] py-3.5 text-[16px] font-extrabold text-white transition hover:bg-[#3B34C4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
            <p className="text-center text-[13px] font-semibold leading-relaxed text-[#6B6794]">
              Free to set up. By continuing you agree to our terms. We never
              take a percentage of your orders.
            </p>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={onCreate}
            className="mt-8 space-y-5 rounded-[28px] border border-[#E4E1FA] bg-white p-6 shadow-sm sm:p-8"
          >
            <div>
              <span className={LABEL}>Brand color</span>
              <div className="flex flex-wrap items-center gap-2.5">
                {SWATCHES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    title={s.name}
                    aria-label={s.name}
                    onClick={() => setPrimary(s.value)}
                    className={`h-10 w-10 rounded-full transition ${
                      primary === s.value
                        ? "ring-2 ring-[#17143A] ring-offset-2"
                        : "ring-1 ring-black/10 hover:scale-105"
                    }`}
                    style={{ backgroundColor: s.value }}
                  />
                ))}
                <label className="ml-1 flex cursor-pointer items-center gap-2 text-[13px] font-bold text-[#4A4570]">
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-full border border-[#D9D6F5] bg-white p-1"
                  />
                  Custom
                </label>
              </div>
            </div>

            <div>
              <span className={LABEL}>Storefront layout</span>
              <div className="space-y-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLayout(l.value)}
                    className={`w-full rounded-2xl border p-3.5 text-left transition ${
                      layout === l.value
                        ? "border-[#3B34C4] bg-[#F4F2FF] ring-2 ring-[#3B34C4]/20"
                        : "border-[#E4E1FA] bg-white hover:border-[#B9B4EE]"
                    }`}
                  >
                    <span className="block text-[15px] font-extrabold text-[#17143A]">{l.name}</span>
                    <span className="mt-0.5 block text-[13px] font-semibold text-[#6B6794]">{l.blurb}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="su-font">Font style</label>
              <select
                id="su-font"
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className={FIELD}
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <span className={LABEL}>Sections on your storefront</span>
              <div className="space-y-2">
                {(
                  [
                    ["announcement", "Announcement bar", "A strip on top for offers and timings."],
                    ["featured", "Featured dishes", "A highlighted row of your best sellers."],
                    ["about", "About section", "Your story, address and opening hours."],
                  ] as const
                ).map(([key, name, blurb]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E4E1FA] p-3.5"
                  >
                    <input
                      type="checkbox"
                      checked={sections[key]}
                      onChange={(e) =>
                        setSections((s) => ({ ...s, [key]: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 accent-[#2C24A3]"
                    />
                    <span>
                      <span className="block text-[14px] font-extrabold text-[#17143A]">{name}</span>
                      <span className="block text-[13px] font-semibold text-[#6B6794]">{blurb}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Live mini preview in the chosen color */}
            <div className="overflow-hidden rounded-2xl border border-[#E4E1FA]">
              <div className="px-4 py-3" style={{ backgroundColor: primary }}>
                <p className="text-[15px] font-black text-white">
                  {restaurantName || "Your Restaurant"}
                </p>
                <p className="text-[12px] font-bold text-white/80">
                  {(slug || "your-restaurant") + ".branvelo.com"}
                </p>
              </div>
              <div className="flex items-center justify-between bg-white px-4 py-3">
                <span className="text-[13px] font-semibold text-[#6B6794]">
                  Layout: {LAYOUTS.find((l) => l.value === layout)?.name}
                </span>
                <span
                  className="rounded-full px-3.5 py-1.5 text-[12px] font-extrabold text-white"
                  style={{ backgroundColor: primary }}
                >
                  Order now
                </span>
              </div>
            </div>

            {serverError && (
              <p className="rounded-xl bg-[#FEF2F2] px-4 py-3 text-[14px] font-bold text-[#B91C1C]">
                {serverError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-[#D9D6F5] px-5 py-3.5 text-[15px] font-extrabold text-[#2C24A3] transition hover:bg-[#F4F2FF]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-[#2C24A3] py-3.5 text-[16px] font-extrabold text-white transition hover:bg-[#3B34C4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating your restaurant..." : "Create my restaurant"}
              </button>
            </div>
            <p className="text-center text-[13px] font-semibold text-[#6B6794]">
              You can change every one of these later in your dashboard.
            </p>
          </form>
        )}

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
