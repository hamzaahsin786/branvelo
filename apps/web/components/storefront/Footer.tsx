import type { Tenant } from "@mezban/shared";
import { displayPkPhone, hoursSummary } from "@mezban/shared";
import { ClockIcon, PhoneIcon, PinIcon } from "./icons";

/** Footer: contact, hours, map link, help - plus the Mezban bottom bar. */
export function Footer({ tenant }: { tenant: Tenant }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    tenant.address || tenant.name
  )}`;
  return (
    <footer className="mt-6">
      <div className="bg-neutral-900 px-6 py-10 text-white">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-[var(--accent)]">
              Contact us
            </h3>
            {tenant.phone && (
              <a
                href={`tel:${tenant.phone.replace(/\s/g, "")}`}
                className="mt-3 flex items-center gap-2 text-sm"
              >
                <PhoneIcon className="h-4 w-4" />
                {displayPkPhone(tenant.phone.replace(/\s/g, ""))}
              </a>
            )}
            {tenant.address && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-start gap-2 text-sm text-neutral-300"
              >
                <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {tenant.address}
              </a>
            )}
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-[var(--accent)]">
              Hours
            </h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
              <ClockIcon className="h-4 w-4" />
              Open daily · {hoursSummary(tenant.hours)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-[var(--accent)]">
              Help
            </h3>
            <div className="mt-3 flex flex-col gap-2 text-sm text-neutral-300">
              <a href="/track" className="hover:text-white">
                Track my order
              </a>
              <a href="#feedback" className="hover:text-white">
                Feedback & complaints
              </a>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="hover:text-white">
                Find us on the map
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[var(--brand)] px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-white">
        Powered by Mezban
      </div>
    </footer>
  );
}
