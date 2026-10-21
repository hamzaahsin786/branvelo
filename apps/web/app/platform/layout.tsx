import Image from "next/image";
import Link from "next/link";
import { Nunito } from "next/font/google";
import type { ReactNode } from "react";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const NAV = [
  { href: "/platform#products", label: "Products" },
  { href: "/platform#calculator", label: "Calculator" },
  { href: "/platform#how", label: "How it works" },
  { href: "/platform#pricing", label: "Pricing" },
  { href: "/platform#faq", label: "FAQ" },
];

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${nunito.className} min-h-screen bg-white text-[#17143A]`}>
      <header className="sticky top-0 z-40 border-b border-[#ECEAF9] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/platform" aria-label="Branvelo home" className="shrink-0">
            <Image
              src="/brand/logo-full.svg"
              alt="Branvelo"
              width={174}
              height={50}
              priority
            />
          </Link>
          <nav className="ml-4 hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[15px] font-bold text-[#4A4570] transition hover:text-[#2C24A3]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/platform/login"
              className="hidden rounded-full px-4 py-2 text-[15px] font-extrabold text-[#2C24A3] transition hover:bg-[#F1EFFF] sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/platform/signup"
              className="rounded-full bg-[#2C24A3] px-5 py-2.5 text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#3B34C4]"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-[#17143A] text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Image
              src="/brand/logo-full-dark.svg"
              alt="Branvelo"
              width={190}
              height={55}
            />
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/70">
              Your restaurant. Your orders. Zero commission. Online ordering
              websites and dashboards for restaurants in Pakistan.
            </p>
            <p className="mt-4 text-[15px] font-bold text-white/85">
              hello@branvelo.com
            </p>
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-white/50">
              Products
            </h4>
            <ul className="mt-4 space-y-2.5 text-[15px] font-semibold text-white/80">
              <li><Link href="/platform#products" className="hover:text-white">Ordering website</Link></li>
              <li><Link href="/platform#products" className="hover:text-white">Admin dashboard</Link></li>
              <li><Link href="/platform#products" className="hover:text-white">Live order tracking</Link></li>
              <li><Link href="/" className="hover:text-white">Live demo</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-white/50">
              Company
            </h4>
            <ul className="mt-4 space-y-2.5 text-[15px] font-semibold text-white/80">
              <li><Link href="/platform#how" className="hover:text-white">How it works</Link></li>
              <li><Link href="/platform#pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/platform#faq" className="hover:text-white">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-white/50">
              Get started
            </h4>
            <ul className="mt-4 space-y-2.5 text-[15px] font-semibold text-white/80">
              <li><Link href="/platform/signup" className="hover:text-white">Create your restaurant</Link></li>
              <li><Link href="/platform/login" className="hover:text-white">Restaurant sign in</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-[13px] font-semibold text-white/50 sm:px-6">
            <span>© {new Date().getFullYear()} Branvelo. Made in Lahore, Pakistan.</span>
            <span>Flat monthly fee. No commission, ever.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
