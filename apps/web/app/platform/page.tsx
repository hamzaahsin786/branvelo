import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CommissionCalculator from "@/components/platform/CommissionCalculator";

// PLACEHOLDER launch price (PKR/month) - Muhammad to confirm the final number.
// The calculator and the pricing section both read this one constant.
const PRICE_PKR = 2499;

export const metadata: Metadata = {
  title: "Branvelo - Your restaurant. Your orders. Zero commission.",
  description:
    "Branvelo gives your restaurant its own online ordering website and dashboard for one flat monthly fee. No commission on your orders, ever.",
};

const PKR = new Intl.NumberFormat("en-PK");

function SectionHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#3B34C4]">
        {kicker}
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-[#17143A] sm:text-4xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 text-[17px] font-semibold leading-relaxed text-[#4A4570]">
          {sub}
        </p>
      )}
    </div>
  );
}

const PRODUCTS = [
  {
    name: "Your own ordering website",
    status: "Available now",
    live: true,
    body: "A fast ordering site under your own name and brand, with your menu, your photos and your prices. Customers order from you, not from a marketplace listing you next to every competitor in the city.",
  },
  {
    name: "Admin dashboard",
    status: "Available now",
    live: true,
    body: "Menus, prices, delivery zones, coupons and opening hours, all in your control. Orders arrive live, move through your kitchen with one tap per stage, and every order is searchable later.",
  },
  {
    name: "Live order tracking",
    status: "Available now",
    live: true,
    body: "Customers watch their order move from placed to confirmed to on-the-way on a tracking page with your branding. Fewer where-is-my-order calls for your counter staff.",
  },
  {
    name: "WhatsApp order alerts",
    status: "Coming soon",
    live: false,
    body: "New-order alerts and customer notifications on WhatsApp, the channel every restaurant in Pakistan already runs on.",
  },
  {
    name: "AI phone ordering",
    status: "Coming later",
    live: false,
    body: "An AI agent that answers your phone, takes the order in Urdu or English, and sends it straight to your dashboard. In development, not sold until it works properly.",
  },
  {
    name: "Your customer data",
    status: "Available now",
    live: true,
    body: "Every customer's name, phone and order history belongs to you. Run your own offers and bring your regulars back without paying a marketplace to reach them.",
  },
];

const FAQS = [
  {
    q: "How much does Branvelo cost, really?",
    a: `One flat fee of Rs ${PKR.format(PRICE_PKR)} per month for your restaurant. No commission on orders, no percentage of sales, no setup fee, and no per-order charges. If you take 100 orders or 10,000 orders, the fee is the same.`,
  },
  {
    q: "Do I need any technical knowledge?",
    a: "No. You sign up, add your menu and prices, and your website is ready to share. If you can use WhatsApp, you can run your Branvelo dashboard. We help with the first setup on a call if you want it.",
  },
  {
    q: "Can I keep my marketplace listings too?",
    a: "Yes. Many restaurants keep marketplace listings for discovery and move their regular customers to their own Branvelo site, where every order is commission-free. Your regulars are where the commission hurts most.",
  },
  {
    q: "How do customers pay?",
    a: "Cash on delivery from day one, with JazzCash and Easypaisa options for customers who prefer to pay in advance. Payment goes to your accounts, never through us.",
  },
  {
    q: "What if I have more than one branch?",
    a: "Each branch gets its own site and dashboard under your account, managed from one place. Talk to us during signup and we will set your branches up together.",
  },
  {
    q: "Is there a contract or lock-in?",
    a: "No lock-in. It is a monthly subscription you can stop at any time, and your menu and customer data export with you. We would rather keep you with a good product than a contract.",
  },
];

export default function PlatformHome() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F2FF] to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#DDD9FA] bg-white px-3.5 py-1.5 text-[13px] font-extrabold text-[#2C24A3]">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              Online ordering for restaurants in Pakistan
            </p>
            <h1 className="mt-5 text-[42px] font-black leading-[1.05] tracking-tight text-[#17143A] sm:text-[54px]">
              Your restaurant.
              <br />
              Your orders.
              <br />
              <span className="text-[#2C24A3]">Zero commission.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[18px] font-semibold leading-relaxed text-[#4A4570]">
              Marketplaces take 15 to 30 percent of every order you earn.
              Branvelo gives you your own ordering website and dashboard for
              one flat monthly fee, and every rupee of every order stays
              yours.
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
              Set up in minutes. No setup fee. No contract.
            </p>
          </div>

          {/* Storefront mock */}
          <div className="relative mx-auto w-full max-w-[440px]">
            <div className="rounded-[28px] border border-[#E7E4FA] bg-white p-4 shadow-2xl shadow-[#2C24A3]/10">
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
            <div className="absolute -right-3 -top-4 rotate-2 rounded-2xl bg-[#17143A] px-4 py-3 text-white shadow-xl sm:-right-6">
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
      <section className="border-y border-[#ECEAF9] bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-center sm:grid-cols-3 sm:px-6">
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
              our first restaurants in Lahore, personally set up by our team
            </p>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculator" className="bg-[#F7F6FF] py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="The commission problem"
            title="See what the marketplaces really cost you"
            sub="Drag the slider to your real numbers. Most restaurants are surprised, then annoyed, then they sign up."
          />
          <div className="mt-10">
            <CommissionCalculator pricePkr={PRICE_PKR} />
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Products"
            title="Everything you need to sell direct"
            sub="No template filler. What is live is live, and what is coming is labelled honestly."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div
                key={p.name}
                className="rounded-3xl border border-[#E7E4FA] bg-white p-6 shadow-sm"
              >
                <span
                  className={`inline-block rounded-full px-3 py-1 text-[12px] font-black uppercase tracking-wide ${
                    p.live
                      ? "bg-[#E9F9EE] text-[#15803D]"
                      : "bg-[#FFF4DE] text-[#9A6A00]"
                  }`}
                >
                  {p.status}
                </span>
                <h3 className="mt-3.5 text-lg font-black text-[#17143A]">{p.name}</h3>
                <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#4A4570]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-[#17143A] py-16 text-white lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#F59E0B]">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Live today, in three steps
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "1",
                t: "Sign up in minutes",
                b: "Create your account with your restaurant name and phone number. Your website and dashboard are created for you automatically.",
              },
              {
                n: "2",
                t: "Add your menu",
                b: "Add categories, items, photos, prices and delivery zones. Set your hours and coupons. Everything is editable any time, live in seconds.",
              },
              {
                n: "3",
                t: "Share your link, keep your money",
                b: "Put your link on Instagram, Google and your packaging. Orders land in your dashboard, customers track them live, and the full amount is yours.",
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
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 rounded-[32px] bg-gradient-to-br from-[#2C24A3] to-[#17143A] px-6 py-12 text-white sm:px-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#F59E0B]">
                Live demo
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Do not take our word for it. Place a test order.
              </h2>
              <p className="mt-3 max-w-lg text-[16px] font-semibold leading-relaxed text-white/75">
                Usama Burgers in Johar Town runs on Branvelo. Open their real
                storefront, browse the menu, and see exactly what your
                customers will get.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-full bg-[#F59E0B] px-7 py-3.5 text-[16px] font-black text-[#17143A] transition hover:bg-[#FFB224]"
              >
                Open the live storefront
              </Link>
            </div>
            <div className="rounded-3xl bg-white/10 p-6">
              <Image
                src="/brand/logo-icon.svg"
                alt="Branvelo icon"
                width={56}
                height={56}
              />
              <p className="mt-4 text-[15px] font-semibold leading-relaxed text-white/80">
                The same system, with your name, your colors and your menu,
                could be taking your orders this week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-[#F7F6FF] py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Pricing"
            title="One flat price. That is the whole pricing page."
            sub="No tiers to decode, no percentage of your sales, no surprises in month two."
          />
          <div className="mx-auto mt-10 max-w-md rounded-[32px] border-2 border-[#2C24A3] bg-white p-8 shadow-xl shadow-[#2C24A3]/10">
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
      <section id="faq" className="py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
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
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-[32px] bg-[#F59E0B] px-6 py-12 text-center sm:px-10">
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-[#17143A] sm:text-4xl">
              Your regulars already love your food. Stop paying commission on
              them.
            </h2>
            <Link
              href="/platform/signup"
              className="mt-7 inline-block rounded-full bg-[#17143A] px-8 py-4 text-[16px] font-extrabold text-white transition hover:bg-[#2C24A3]"
            >
              Create your restaurant now
            </Link>
            <p className="mt-3.5 text-sm font-bold text-[#17143A]/70">
              Free to set up. Live in minutes.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
