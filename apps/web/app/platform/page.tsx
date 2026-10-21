import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import CommissionCalculator from "@/components/platform/CommissionCalculator";
import {
  BrandRing,
  DotGrid,
  SmileArc,
  SpeedStreaks,
} from "@/components/platform/Backdrop";

// PLACEHOLDER launch price (PKR/month) - Muhammad to confirm the final number.
// The calculator and the pricing section both read this one constant.
const PRICE_PKR = 2499;

export const metadata: Metadata = {
  title: "Branvelo - Your restaurant. Your orders. Zero commission.",
  description:
    "Your own ordering website and dashboard for one flat monthly fee. No commission on your orders, ever.",
};

const PKR = new Intl.NumberFormat("en-PK");

function SectionHeading({
  kicker,
  title,
  sub,
  dark = false,
}: {
  kicker: string;
  title: string;
  sub?: string;
  dark?: boolean;
}) {
  return (
    <div className="relative mx-auto max-w-2xl text-center">
      <p
        className={`text-[13px] font-black uppercase tracking-[0.14em] ${
          dark ? "text-[#F59E0B]" : "text-[#3B34C4]"
        }`}
      >
        {kicker}
      </p>
      <h2
        className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${
          dark ? "text-white" : "text-[#17143A]"
        }`}
      >
        {title}
      </h2>
      {sub && (
        <p
          className={`mt-3 text-[17px] font-semibold leading-relaxed ${
            dark ? "text-white/70" : "text-[#4A4570]"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const PRODUCTS = [
  {
    name: "Your own ordering website",
    status: "Available now",
    live: true,
    body: "Your menu, your brand, your link. Customers order from you, not a marketplace page that lists you beside every rival.",
    icon: (
      <Icon>
        <path d="M4 7l1.2-3h13.6L20 7" />
        <path d="M4 7h16a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0A2.5 2.5 0 0 1 4 7Z" />
        <path d="M5.5 12.5V20h13v-7.5" />
        <path d="M9.5 20v-4h5v4" />
      </Icon>
    ),
  },
  {
    name: "Admin dashboard",
    status: "Available now",
    live: true,
    body: "Every order, live. One tap per stage: confirm, cook, dispatch. Your whole day at a glance.",
    icon: (
      <Icon>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
      </Icon>
    ),
  },
  {
    name: "Live order tracking",
    status: "Available now",
    live: true,
    body: "Customers watch their food move towards them. You get fewer where-is-my-order calls.",
    icon: (
      <Icon>
        <path d="M12 21s-6.5-5.2-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.8 12 21 12 21Z" />
        <circle cx="12" cy="10.6" r="2.3" />
      </Icon>
    ),
  },
  {
    name: "WhatsApp order alerts",
    status: "Coming soon",
    live: false,
    body: "New orders ping you on WhatsApp. Customers get updates where they actually read them.",
    icon: (
      <Icon>
        <path d="M20 12a8 8 0 1 1-3.6-6.7L20 4l-1.2 3.4c.8 1.3 1.2 2.9 1.2 4.6Z" />
        <path d="M8.5 10.5c.5 2.5 3.5 5.5 6 6l1.8-1.8 2.7 1.3c-.3 1.6-1 2-2.4 1.8C11.9 17.2 6.8 12.1 6.2 7.4 6 6 6.4 5.3 8 5l1.3 2.7-1.8 1.8Z" transform="scale(0.92) translate(1,1)" />
      </Icon>
    ),
  },
  {
    name: "AI phone ordering",
    status: "Coming later",
    live: false,
    body: "An AI answers your phone in Urdu or English and takes the order. Sold only when it works properly.",
    icon: (
      <Icon>
        <path d="M5 4h4l1.5 4.5L8 10a12 12 0 0 0 6 6l1.5-2.5L20 15v4a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 6.2 2 2 0 0 1 5 4Z" />
        <path d="M17.5 3.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z" />
      </Icon>
    ),
  },
  {
    name: "Your customer data",
    status: "Available now",
    live: true,
    body: "Names, numbers, order history: yours. Bring regulars back without paying a marketplace to reach them.",
    icon: (
      <Icon>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M21 20H3" />
      </Icon>
    ),
  },
];

const FAQS = [
  {
    q: "How much does Branvelo cost, really?",
    a: `One flat fee of Rs ${PKR.format(PRICE_PKR)} per month. No commission, no percentage of sales, no setup fee, no per-order charges. 100 orders or 10,000 orders, the fee is the same.`,
  },
  {
    q: "Do I need any technical knowledge?",
    a: "No. Sign up, add your menu, share your link. If you can use WhatsApp, you can run Branvelo. We help with the first setup on a call if you want it.",
  },
  {
    q: "Can I keep my marketplace listings too?",
    a: "Yes. Keep them for discovery. Move your regulars to your own Branvelo site, where every order is commission-free. Regulars are where commission hurts most.",
  },
  {
    q: "How do customers pay?",
    a: "Cash on delivery from day one, plus JazzCash and Easypaisa for advance payment. Money goes to your accounts, never through us.",
  },
  {
    q: "What if I have more than one branch?",
    a: "Each branch gets its own site and dashboard, managed from one account. Tell us during signup and we set them up together.",
  },
  {
    q: "Is there a contract or lock-in?",
    a: "No. Monthly subscription, stop any time, and your menu and customer data export with you. A good product should be the reason you stay.",
  },
];

export default function PlatformHome() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F2FF] to-white">
        <DotGrid className="right-[-40px] top-[-30px] h-[300px] w-[420px]" drift />
        <DotGrid className="bottom-[10px] left-[-60px] h-[200px] w-[300px]" opacity={0.07} />
        <BrandRing className="right-[16%] top-[64px] hidden lg:block" size={92} />
        <SmileArc className="bottom-[26px] left-[38%] hidden lg:block" width={340} opacity={0.13} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#DDD9FA] bg-white px-3.5 py-1.5 text-[13px] font-extrabold text-[#2C24A3]">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              Online ordering for restaurants in Pakistan
            </p>
            <h1 className="mt-5 text-[42px] font-black leading-[1.05] tracking-tight text-[#17143A] sm:text-[56px]">
              Your restaurant.
              <br />
              Your orders.
              <br />
              <span className="text-[#2C24A3]">Zero commission.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[18px] font-semibold leading-relaxed text-[#4A4570]">
              Marketplaces take up to 30% of every order. Branvelo is one
              flat monthly fee, and every rupee of every order stays yours.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/platform/signup"
                className="rounded-full bg-[#2C24A3] px-7 py-3.5 text-[16px] font-extrabold text-white shadow-md transition hover:bg-[#3B34C4]"
              >
                Create your restaurant
              </Link>
              <Link
                href="/"
                className="rounded-full border-2 border-[#2C24A3] px-7 py-3.5 text-[16px] font-extrabold text-[#2C24A3] transition hover:bg-[#F1EFFF]"
              >
                See a live storefront
              </Link>
            </div>
            <p className="mt-4 text-sm font-bold text-[#6B6794]">
              Live in minutes. No setup fee. No contract.
            </p>
          </div>

          {/* Storefront mock */}
          <div className="relative mx-auto w-full max-w-[440px]">
            <SpeedStreaks className="left-[-38px] top-[38%] hidden sm:block" width={58} />
            <div className="relative rounded-[28px] border border-[#E7E4FA] bg-white p-4 shadow-2xl shadow-[#2C24A3]/10">
              <div className="flex items-center gap-3 border-b border-[#F0EEFC] pb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F59E0B] text-lg font-black text-white">
                  U
                </div>
                <div>
                  <p className="text-[16px] font-black leading-tight">Usama Burgers</p>
                  <p className="text-[13px] font-bold text-[#6B6794]">
                    Johar Town, Lahore · Open now
                  </p>
                </div>
                <span className="ml-auto rounded-full bg-[#E9F9EE] px-2.5 py-1 text-[12px] font-black text-[#15803D]">
                  LIVE DEMO
                </span>
              </div>
              {[
                { n: "Zinger Burger", p: 550, tag: "Bestseller" },
                { n: "Loaded Fries", p: 380, tag: "Popular" },
                { n: "Chicken Shawarma", p: 320, tag: "New" },
              ].map((item) => (
                <div
                  key={item.n}
                  className="flex items-center justify-between border-b border-[#F7F6FF] py-3 last:border-0"
                >
                  <div>
                    <p className="text-[15px] font-extrabold">{item.n}</p>
                    <p className="text-[12px] font-bold text-[#F59E0B]">{item.tag}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-black">Rs {item.p}</span>
                    <span className="rounded-full bg-[#2C24A3] px-3 py-1 text-[13px] font-extrabold text-white">
                      Add
                    </span>
                  </div>
                </div>
              ))}
              <div className="mt-3 rounded-2xl bg-[#F7F6FF] px-4 py-3 text-center text-[13px] font-bold text-[#4A4570]">
                A real restaurant running on Branvelo today
              </div>
            </div>
            <div className="bv-float-slow absolute -right-3 -top-4 rotate-2 rounded-2xl bg-[#17143A] px-4 py-3 text-white shadow-xl sm:-right-6">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#F59E0B]">
                New order
              </p>
              <p className="text-sm font-extrabold">2x Zinger · Rs 1,450</p>
              <p className="text-[12px] font-bold text-white/60">
                Commission paid: Rs 0
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HONEST PROOF STRIP */}
      <section className="relative border-y border-[#ECEAF9] bg-white">
        <div className="relative mx-auto grid max-w-6xl gap-6 px-4 py-8 text-center sm:grid-cols-3 sm:px-6">
          <div>
            <p className="text-2xl font-black text-[#17143A]">0%</p>
            <p className="mt-1 text-sm font-bold text-[#6B6794]">
              commission on your orders, forever
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#17143A]">1 live pilot</p>
            <p className="mt-1 text-sm font-bold text-[#6B6794]">
              Usama Burgers, Johar Town, taking real orders now
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#17143A]">Now onboarding</p>
            <p className="mt-1 text-sm font-bold text-[#6B6794]">
              our first Lahore restaurants, set up personally by our team
            </p>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculator" className="relative overflow-hidden bg-[#F7F6FF] py-16 lg:py-24">
        <DotGrid className="left-[-50px] top-[20px] h-[240px] w-[340px]" opacity={0.08} />
        <SmileArc className="right-[4%] top-[30px] hidden lg:block" width={240} opacity={0.12} />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="The commission problem"
            title="What do marketplaces really cost you?"
            sub="Your numbers. Thirty seconds. Prepare to be annoyed."
          />
          <div className="mt-10">
            <CommissionCalculator pricePkr={PRICE_PKR} />
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="relative overflow-hidden py-16 lg:py-24">
        <DotGrid className="right-[-50px] top-[10px] h-[260px] w-[360px]" drift />
        <BrandRing className="bottom-[30px] left-[-46px]" size={110} opacity={0.08} />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Products"
            title="Everything you need to sell direct"
            sub="What is live is live. What is coming is labelled."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div
                key={p.name}
                className="group rounded-3xl border border-[#E7E4FA] bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#C9C3F5] hover:shadow-xl hover:shadow-[#2C24A3]/10"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      p.live
                        ? "bg-[#EFEDFF] text-[#2C24A3]"
                        : "bg-[#FFF3DA] text-[#B97E00]"
                    }`}
                  >
                    {p.icon}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
                      p.live
                        ? "bg-[#E9F9EE] text-[#15803D]"
                        : "bg-[#FFF4DE] text-[#9A6A00]"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black text-[#17143A]">{p.name}</h3>
                <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-[#4A4570]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative overflow-hidden bg-[#17143A] py-16 text-white lg:py-24">
        <DotGrid className="right-[-40px] top-[0px] h-[280px] w-[400px]" color="#FFFFFF" opacity={0.07} />
        <SpeedStreaks className="bottom-[34px] left-[3%] hidden lg:block" width={64} />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            dark
            kicker="How it works"
            title="Live today, in three steps"
          />
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "1",
                t: "Sign up in minutes",
                b: "Your website and dashboard are created for you automatically.",
              },
              {
                n: "2",
                t: "Add your menu",
                b: "Items, photos, prices, zones, hours, coupons. Editable any time, live in seconds.",
              },
              {
                n: "3",
                t: "Share your link, keep your money",
                b: "Orders land in your dashboard. Customers track them live. The full amount is yours.",
              },
            ].map((step) => (
              <div key={step.n} className="rounded-3xl bg-white/5 p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F59E0B] text-lg font-black text-[#17143A]">
                  {step.n}
                </span>
                <h3 className="mt-4 text-xl font-black">{step.t}</h3>
                <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/70">
                  {step.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <DotGrid className="left-[-60px] top-[30px] h-[220px] w-[300px]" opacity={0.07} />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative grid items-center gap-10 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#2C24A3] to-[#17143A] px-6 py-12 text-white sm:px-10 lg:grid-cols-[1.3fr_1fr]">
            <SmileArc className="bottom-[10px] right-[6%]" width={260} opacity={0.14} />
            <div className="relative">
              <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#F59E0B]">
                Live demo
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Do not take our word for it. Place a test order.
              </h2>
              <p className="mt-3 max-w-lg text-[16px] font-semibold leading-relaxed text-white/75">
                Usama Burgers runs on Branvelo. Open the real storefront and
                see exactly what your customers will get.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-full bg-[#F59E0B] px-7 py-3.5 text-[16px] font-black text-[#17143A] transition hover:bg-[#FFB224]"
              >
                Open the live storefront
              </Link>
            </div>
            <div className="relative rounded-3xl bg-white/10 p-6">
              <Image
                src="/brand/logo-icon.svg"
                alt="Branvelo icon"
                width={56}
                height={56}
              />
              <p className="mt-4 text-[15px] font-semibold leading-relaxed text-white/80">
                The same system, with your name, your colors, your menu.
                Taking your orders this week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative overflow-hidden bg-[#F7F6FF] py-16 lg:py-24">
        <DotGrid className="right-[-40px] top-[16px] h-[240px] w-[340px]" opacity={0.08} drift />
        <SpeedStreaks className="left-[4%] top-[44%] hidden lg:block" width={58} slow />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Pricing"
            title="One flat price. That is the whole pricing page."
            sub="No tiers. No percentages. No surprises."
          />
          <div className="relative mx-auto mt-10 max-w-md rounded-[32px] border-2 border-[#2C24A3] bg-white p-8 shadow-xl shadow-[#2C24A3]/10">
            <p className="text-center text-[13px] font-black uppercase tracking-[0.14em] text-[#3B34C4]">
              Branvelo
            </p>
            <p className="mt-3 text-center">
              <span className="text-5xl font-black tracking-tight text-[#17143A]">
                Rs {PKR.format(PRICE_PKR)}
              </span>
              <span className="text-lg font-bold text-[#6B6794]"> /month</span>
            </p>
            <p className="mt-2 text-center text-sm font-bold text-[#6B6794]">
              Launch pricing. Every feature included.
            </p>
            <ul className="mt-7 space-y-3 text-[15px] font-bold text-[#4A4570]">
              {[
                "Your own ordering website and subdomain",
                "Admin dashboard with live orders",
                "Menu, zones, coupons and hours in your control",
                "Live customer order tracking",
                "Your customer data, exportable any time",
                "No commission, no setup fee, no contract",
              ].map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-0.5 font-black text-[#15803D]">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/platform/signup"
              className="mt-8 block rounded-full bg-[#2C24A3] py-3.5 text-center text-[16px] font-extrabold text-white transition hover:bg-[#3B34C4]"
            >
              Start with Branvelo
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative overflow-hidden py-16 lg:py-24">
        <BrandRing className="right-[-40px] top-[60px]" size={96} opacity={0.07} />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading kicker="FAQ" title="Questions, answered straight" />
          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-[#E7E4FA] bg-white px-6 py-4 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none text-[16px] font-extrabold text-[#17143A] marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-2.5 text-[15px] font-medium leading-relaxed text-[#4A4570]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative pb-20">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[32px] bg-[#F59E0B] px-6 py-12 text-center sm:px-10">
            <DotGrid className="left-[-30px] top-[-20px] h-[180px] w-[300px]" color="#17143A" opacity={0.1} />
            <DotGrid className="bottom-[-30px] right-[-30px] h-[180px] w-[300px]" color="#17143A" opacity={0.1} />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-black tracking-tight text-[#17143A] sm:text-4xl">
              Your regulars already love your food. Stop paying commission on
              them.
            </h2>
            <Link
              href="/platform/signup"
              className="relative mt-7 inline-block rounded-full bg-[#17143A] px-8 py-4 text-[16px] font-extrabold text-white transition hover:bg-[#2C24A3]"
            >
              Create your restaurant now
            </Link>
            <p className="relative mt-3.5 text-sm font-bold text-[#17143A]/70">
              Free to set up. Live in minutes.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
