"use client";

import { useState } from "react";
import type { Tenant } from "@branvelo/shared";
import { useCart } from "@/lib/cart";
import {
  CartIcon,
  ChevronDownIcon,
  MenuIcon,
  PhoneIcon,
  PinIcon,
  XIcon,
} from "./icons";

interface Props {
  tenant: Tenant;
  locationLabel: string;
  onLocationOpen: () => void;
}

export function PillHeader({ tenant, locationLabel, onLocationOpen }: Props) {
  const { count, setOpen } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-[22px] z-40 mx-3 mt-2">
        <div className="flex items-center justify-between gap-2 rounded-full bg-white py-2 pl-2 pr-2 shadow-lg ring-1 ring-black/5">
          {/* left: location + phone */}
          <div className="flex min-w-0 items-center gap-1">
            <button
              onClick={onLocationOpen}
              className="flex min-w-0 items-center gap-1 rounded-full px-2 py-1.5 text-left hover:bg-neutral-100"
            >
              <PinIcon className="h-5 w-5 shrink-0 text-[var(--brand)]" />
              <span className="truncate text-xs font-semibold">
                {locationLabel}
              </span>
              <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            </button>
            {tenant.phone && (
              <a
                href={`tel:${tenant.phone.replace(/\s/g, "")}`}
                aria-label="Call us"
                className="hidden rounded-full p-2 hover:bg-neutral-100 sm:block"
              >
                <PhoneIcon className="h-5 w-5 text-[var(--brand)]" />
              </a>
            )}
          </div>

          {/* center: brand */}
          <div className="flex min-w-0 flex-1 flex-col items-center">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : null}
            <span className="truncate text-sm font-extrabold uppercase tracking-wide text-[var(--brand)]">
              {tenant.name}
            </span>
          </div>

          {/* right: cart + menu */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open cart"
              className="relative rounded-full bg-[var(--brand)] p-2.5 text-white"
            >
              <CartIcon className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-black">
                  {count}
                </span>
              )}
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="rounded-full bg-[var(--accent)] p-2.5 text-black"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* slide-in menu drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <span className="font-extrabold uppercase text-[var(--brand)]">
                {tenant.name}
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-full p-1 hover:bg-neutral-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4 text-sm font-medium">
              <a href="#menu" onClick={() => setDrawerOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-neutral-100">
                Full Menu
              </a>
              <a href="/track" onClick={() => setDrawerOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-neutral-100">
                Track My Order
              </a>
              <a href="#feedback" onClick={() => setDrawerOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-neutral-100">
                Feedback & Complaints
              </a>
              {tenant.phone && (
                <a
                  href={`tel:${tenant.phone.replace(/\s/g, "")}`}
                  className="rounded-lg px-3 py-2.5 hover:bg-neutral-100"
                >
                  Call {tenant.phone}
                </a>
              )}
            </nav>
            <div className="mt-auto border-t p-4 text-center text-xs text-neutral-400">
              Powered by Branvelo
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
