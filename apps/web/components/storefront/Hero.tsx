import type { Tenant } from "@branvelo/shared";
import { hoursSummary, isOpenNow } from "@branvelo/shared";
import { ClockIcon, PhoneIcon } from "./icons";

/** Dark photographic-style hero banner (CSS gradient; photos come later). */
export function Hero({ tenant }: { tenant: Tenant }) {
  const open = isOpenNow(tenant.hours);
  return (
    <section className="px-3 pt-4">
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900 px-6 py-10 text-white sm:py-14">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px 300px at 80% 20%, var(--brand), transparent), radial-gradient(500px 300px at 10% 90%, var(--accent), transparent)",
          }}
        />
        <div className="relative">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              open ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${open ? "bg-green-400" : "bg-red-400"}`}
            />
            {open ? "Open now" : "Currently closed"}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold uppercase leading-tight sm:text-4xl">
            {tenant.name}
          </h1>
          {tenant.announcement && (
            <p className="mt-2 max-w-md text-sm text-neutral-300">
              {tenant.announcement}
            </p>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400">
            <ClockIcon className="h-4 w-4" />
            Open daily - {hoursSummary(tenant.hours)}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="#menu"
              className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white"
            >
              Order Now
            </a>
            {tenant.phone && (
              <a
                href={`tel:${tenant.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold"
              >
                <PhoneIcon className="h-4 w-4" />
                {tenant.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
