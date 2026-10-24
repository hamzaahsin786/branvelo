import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import CommissionCalculator from "@/components/platform/CommissionCalculator";
import StorefrontMock from "@/components/platform/StorefrontMock";
import { PriceAmount, PriceInline } from "@/components/platform/currency";
import {
  BrandRing,
  DotGrid,
  SmileArc,
  SpeedStreaks,
} from "@/components/platform/Backdrop";

export const metadata: Metadata = {
  title: "Branvelo - Your restaurant. Your orders. Zero commission.",
  description:
    "Your own ordering website and dashboard for one flat monthly fee. No commission on your orders, ever. Deals, smart upsells, tax handling, branches and rider management included.",
};

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
    body: "Your menu, your brand, your colors, your link. Customers order from you, not a marketplace page that lists you beside every rival.",
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
    body: "Every order, live. One tap per stage: confirm, cook, dispatch. Your whole day at a glance, plus staff accounts and rider assignment.",
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
    body: "Customers watch their food move towards them, and can schedule orders ahead. You get fewer where-is-my-order calls.",
    icon: (
      <Icon>
        <path d="M12 21s-6.5-5.2-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.8 12 21 12 21Z" />
        <circle cx="12" cy="10.6" r="2.3" />
      </Icon>
    ),
  },
  {
    name: "Deals and coupons",
    status: "Available now",
    live: true,
    body: "Bundle items into deals with SAVE % badges, run coupon codes, and put your best value where customers see it first.",
    icon: (
      <Icon>
        <path d="M20 12l-8 8-9-9V4h7l10 8Z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </Icon>
    ),
  },
  {
    name: "Smart upsells",
    status: "Available now",
    live: true,
    body: "The cart suggests what goes together, learned from your own orders, not guessed. Fries with burgers, drinks with deals. Order values grow on their own.",
    icon: (
      <Icon>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </Icon>
    ),
  },
  {
    name: "Tax, handled",
    status: "Available now",
    live: true,
    body: "Your country's rules, applied at checkout and shown as its own line. Pakistan's cash and digital split included. Override any rate in Settings.",
    icon: (
      <Icon>
        <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />
        <path d="M17 15l2 2 4-4" />
      </Icon>
    ),
  },
  {
    name: "Branches",
    status: "Available now",
    live: true,
    body: "Every outlet on one site for pickup, each with its address and directions. One menu, every location, no extra site per branch.",
    icon: (
      <Icon>
        <path d="M3 21h18M5 21V8l7-5 7 5v13" />
        <path d="M9 21v-6h6v6" />
      </Icon>
    ),
  },
  {
    name: "Team and riders",
    status: "Available now",
    live: true,
    body: "Create staff accounts with roles, assign deliveries from the Orders board, and give riders their own view with cash collection totals.",
    icon: (
      <Icon>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3 2.9-5 6.5-5s6.5 2 6.5 5" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M17.5 15.5c2 .7 4 2.3 4 4.5" />
      </Icon>
    ),
  },
  {
    name: "Reports and insights",
    status: "Available now",
    live: true,
    body: "Your orders, sales and best sellers at a glance. See what is working, and decide what to promote next.",
    icon: (
      <Icon>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 17v-4" />
        <path d="M12 17V8" />
        <path d="M16 17v-7" />
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

const ON_THE_WAY = [
  {
    name: "WhatsApp order alerts",
    status: "Coming soon",
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
    body: "An AI answers your phone in Urdu or English and takes the order. Sold only when it works properly.",
    icon: (
      <Icon>
        <path d="M5 4h4l1.5 4.5L8 10a12 12 0 0 0 6 6l1.5-2.5L20 15v4a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 6.2 2 2 0 0 1 5 4Z" />
        <path d="M17.5 3.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z" />
      </Icon>
    ),
  },
];

const FAQS = [
  {
    q: "How much does Branvelo cost, really?",
    a: (
      <>
        One flat fee of <PriceInline /> per month. No commission, no
        percentage of sales, no setup fee, no per-order charges. 100 orders
        or 10,000 orders, the fee is the same.
      </>
    ),
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
    a: "Cash on delivery from day one, plus JazzCash and Easypaisa for advance payment. Money goes to your accounts, never through us. In Pakistan, digital payments also mean the lower 8% GST rate for your customers.",
  },
  {
    q: "How is tax handled?",
    a: "At checkout, as its own line, using your country's rules. In Pakistan that means the provincial split: Punjab 16% on cash and 8% on digital payments, Sindh 15% and 8%. JazzCash and Easypaisa count as digital. Other countries get their VAT or GST defaults, and you can override any rate in Settings. Menu prices stay as you set them; tax is added on top.",
  },
  {
    q: "What if I have more than one branch?",
    a: "One restaurant lists all its outlets for pickup on the same site, each with its address and a directions link, and customers pick their outlet at checkout. If you want a fully separate menu and dashboard per branch, that is a separate site per branch instead. Tell us during signup and we set it up the way your business runs.",
  },
  {
    q: "Can customers order ahead?",
    a: "Yes. Customers can schedule an order for the next 7 days inside your opening hours, and add special instructions per item and per order. Staff and riders see both, so nothing gets lost between the phone and the kitchen.",
  },
  {
    q: "How does Branvelo help me sell more per order?",
    a: "Three ways, none of which need configuring. Deals with SAVE % badges put your best value first. A Most ordered section is built from your real orders. And the cart suggests what goes together, learned from what your customers actually buy together. Fries with burgers, drinks with deals.",
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
              Online ordering for restaurants, cafes and bakeries in Pakistan
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
              Plus the things marketplaces never give you: tax handled per
              your country's rules, every branch on one site, your own
              riders managed, and a cart that sells more on its own.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "GST handled for Pakistan",
                "Multi-branch pickup",
                "Rider management",
                "Smart upsells that learn",
                "Scheduled orders",
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#2C24A3] ring-1 ring-[#DDD9FA]"
                >
                  {chip}
                </span>
              ))}
            </div>
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
                See a sample storefront
              </Link>
            </div>
            <p className="mt-4 text-sm font-bold text-[#6B6794]">
              Live in minutes. No setup fee. No contract.
            </p>
          </div>

          <StorefrontMock />
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
            <p className="text-2xl font-black text-[#17143A]">1 flat fee</p>
            <p className="mt-1 text-sm font-bold text-[#6B6794]">
              no tiers, no percentages, no surprises in month two
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#17143A]">Same day</p>
            <p className="mt-1 text-sm font-bold text-[#6B6794]">
              from signup to taking orders, no developer needed
            </p>
          </div>
        </div>
      </section>

      {/* NEW THIS SEASON */}
      <section className="relative overflow-hidden bg-white py-16 lg:py-20">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="New in Branvelo"
            title="Built for restaurants that want more than a menu page"
            sub="The latest release turns your site from an order form into a selling machine."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl bg-[#F7F6FF] p-7 ring-1 ring-[#E7E4FA]">
              <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#3B34C4]">
                Sell more per order
              </p>
              <h3 className="mt-2 text-xl font-black text-[#17143A]">
                Deals, upsells, and proof that moves people
              </h3>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#4A4570]">
                Bundle items into deals with SAVE % badges. Show what your
                customers actually order most. And let the cart suggest what
                goes together, learned from your own orders. When customers
                buy burgers with fries, the cart knows.
              </p>
            </div>
            <div className="rounded-3xl bg-[#F7F6FF] p-7 ring-1 ring-[#E7E4FA]">
              <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#3B34C4]">
                Tax, handled
              </p>
              <h3 className="mt-2 text-xl font-black text-[#17143A]">
                Pakistan's GST split, built in
              </h3>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#4A4570]">
                16% on cash, 8% on digital payments in Punjab. 15% and 8%
                in Sindh. Shown as its own line at checkout, never buried
                in your prices. Other countries get their VAT and GST
                defaults, and every rate is overridable in Settings.
              </p>
            </div>
            <div className="rounded-3xl bg-[#F7F6FF] p-7 ring-1 ring-[#E7E4FA]">
              <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#3B34C4]">
                Every branch, every rider
              </p>
              <h3 className="mt-2 text-xl font-black text-[#17143A]">
                Run the whole operation from one dashboard
              </h3>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#4A4570]">
                List all your outlets for pickup on one site, with
                directions for each. Create staff accounts, assign riders
                from the Orders board, and let riders run their own
                deliveries with cash collection totals.
              </p>
            </div>
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
            <CommissionCalculator />
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
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFEDFF] text-[#2C24A3]">
                    {p.icon}
                  </span>
                  <span className="rounded-full bg-[#E9F9EE] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#15803D]">
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

          <p className="mt-12 text-center text-[13px] font-black uppercase tracking-[0.14em] text-[#6B6794]">
            On the way, labelled honestly
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {ON_THE_WAY.map((p) => (
              <div
                key={p.name}
                className="flex gap-4 rounded-3xl border border-dashed border-[#D8D2F5] bg-[#FFFCF2] p-6"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3DA] text-[#B97E00]">
                  {p.icon}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-[#17143A]">{p.name}</h3>
                    <span className="rounded-full bg-[#FFF4DE] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#9A6A00]">
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-[#4A4570]">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="relative overflow-hidden bg-[#F7F6FF] py-16 lg:py-24">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          <SectionHeading
            kicker="The honest comparison"
            title="Branvelo vs marketplaces, side by side"
            sub="The marketplace is great for discovery. It is a bad landlord for your regulars."
          />
          <div className="mt-10 overflow-hidden rounded-3xl border border-[#E7E4FA] bg-white shadow-sm">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-px bg-[#E7E4FA] text-[14px] font-extrabold sm:text-[15px]">
              <div className="bg-white px-4 py-3.5 text-[#17143A]"></div>
              <div className="bg-[#2C24A3] px-4 py-3.5 text-white">Branvelo</div>
              <div className="bg-white px-4 py-3.5 text-[#4A4570]">Marketplaces</div>
              {[
                ["Commission per order", "0%, forever", "Up to 30%"],
                ["Your customer data", "Yours, exportable", "The marketplace keeps it"],
                ["Your brand on the page", "Your site, your colors", "Their page, your listing"],
                ["Deals and smart upsells", "Your deals, your rules", "Their promotions, their terms"],
                ["Tax handling", "Built in, per country", "You figure it out"],
                ["Branches and riders", "Built in", "Not included"],
                ["Contract", "None, monthly", "Varies"],
              ].map(([label, ours, theirs]) => (
                <div key={label} className="contents">
                  <div className="bg-white px-4 py-3.5 font-bold text-[#17143A]">{label}</div>
                  <div className="bg-[#F7F6FF] px-4 py-3.5 font-bold text-[#2C24A3]">{ours}</div>
                  <div className="bg-white px-4 py-3.5 font-medium text-[#4A4570]">{theirs}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-sm font-bold text-[#6B6794]">
            Keep your marketplace listings for discovery. Move your regulars home.
          </p>
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
                b: "Items, photos, prices, deals, zones, branches, tax, hours. Import from a sheet or from photos. Editable any time, live in seconds.",
              },
              {
                n: "3",
                t: "Share your link, keep your money",
                b: "Orders land in your dashboard, riders get assigned, customers track live and can even schedule ahead. The full amount is yours.",
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
                Sample storefront
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Do not take our word for it. Place a test order.
              </h2>
              <p className="mt-3 max-w-lg text-[16px] font-semibold leading-relaxed text-white/75">
                A working sample storefront, the same pages your customers
                will use. Browse the menu, add items, and check out.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-full bg-[#F59E0B] px-7 py-3.5 text-[16px] font-black text-[#17143A] transition hover:bg-[#FFB224]"
              >
                Open the sample storefront
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
              <PriceAmount />
            </p>
            <p className="mt-2 text-center text-sm font-bold text-[#6B6794]">
              Launch pricing. Every feature included.
            </p>
            <ul className="mt-7 space-y-3 text-[15px] font-bold text-[#4A4570]">
              {[
                "Your own ordering website and subdomain",
                "Admin dashboard with live orders, team and riders",
                "Menu, deals, zones, branches and coupons in your control",
                "Tax handled per your country's rules",
                "Smart upsells, scheduled orders and live tracking",
                "Your customer data, exportable any time",
                "No commission, no setup fee, no contract",
              ].map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-[#15803D]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
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
