"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Display currency for the Branvelo platform site.
 * Detected automatically from the visitor's browser (language region,
 * then timezone), remembered in localStorage, and switchable in the
 * header. Billing itself is in PKR for now; other currencies are
 * display conversions at approximate rates, noted on the pricing section.
 */
export const BASE_PRICE_PKR = 2499;

export const CURRENCIES = [
  { code: "PKR", label: "PKR · Pakistan" },
  { code: "USD", label: "USD · United States" },
  { code: "EUR", label: "EUR · Eurozone" },
  { code: "GBP", label: "GBP · United Kingdom" },
  { code: "AED", label: "AED · UAE" },
  { code: "SAR", label: "SAR · Saudi Arabia" },
  { code: "INR", label: "INR · India" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

// Approximate display rates: units of currency per 1 PKR.
const RATES: Record<CurrencyCode, number> = {
  PKR: 1,
  USD: 0.0036,
  EUR: 0.0033,
  GBP: 0.0028,
  AED: 0.0132,
  SAR: 0.0135,
  INR: 0.3,
};

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  PK: "PKR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  SA: "SAR",
  IN: "INR",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR",
  PT: "EUR", AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR",
};

const TIMEZONE_TO_CURRENCY: Record<string, CurrencyCode> = {
  "Asia/Karachi": "PKR",
  "Asia/Dubai": "AED",
  "Asia/Riyadh": "SAR",
  "Asia/Kolkata": "INR",
  "Asia/Calcutta": "INR",
  "Europe/London": "GBP",
  "Europe/Berlin": "EUR",
  "Europe/Paris": "EUR",
  "Europe/Madrid": "EUR",
  "Europe/Rome": "EUR",
  "Europe/Amsterdam": "EUR",
  "Europe/Dublin": "EUR",
};

function detectCurrency(): CurrencyCode {
  try {
    const stored = window.localStorage.getItem("branvelo-currency");
    if (stored && CURRENCIES.some((c) => c.code === stored)) {
      return stored as CurrencyCode;
    }
  } catch {
    /* storage unavailable */
  }
  const region = (navigator.language || "").split("-")[1]?.toUpperCase();
  if (region && COUNTRY_TO_CURRENCY[region]) return COUNTRY_TO_CURRENCY[region];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz && TIMEZONE_TO_CURRENCY[tz]) return TIMEZONE_TO_CURRENCY[tz];
  if (tz?.startsWith("America/")) return "USD";
  if (tz?.startsWith("Europe/")) return "EUR";
  return "PKR";
}

type CurrencyCtx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Convert a PKR amount and format it in the active currency. */
  fromPkr: (amountPkr: number) => string;
  /** Format an amount that is already in the active currency. */
  format: (amount: number) => string;
  /** The flat monthly fee, converted into the active currency (number). */
  fee: number;
};

const Ctx = createContext<CurrencyCtx>({
  currency: "PKR",
  setCurrency: () => {},
  fromPkr: (n) => `Rs ${Math.round(n).toLocaleString("en-PK")}`,
  format: (n) => `Rs ${Math.round(n).toLocaleString("en-PK")}`,
  fee: BASE_PRICE_PKR,
});

export function useCurrency() {
  return useContext(Ctx);
}

function formatIn(amount: number, code: CurrencyCode): string {
  if (code === "PKR") return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("PKR");

  useEffect(() => {
    setCurrencyState(detectCurrency());
  }, []);

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    try {
      window.localStorage.setItem("branvelo-currency", c);
    } catch {
      /* storage unavailable */
    }
  }

  const value: CurrencyCtx = {
    currency,
    setCurrency,
    fromPkr: (n) => formatIn(n * RATES[currency], currency),
    format: (n) => formatIn(n, currency),
    fee: Math.round(BASE_PRICE_PKR * RATES[currency]),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  return (
    <select
      aria-label="Display currency"
      value={currency}
      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
      className="cursor-pointer rounded-full border border-[#DDD9FA] bg-white px-2.5 py-2 text-[13px] font-extrabold text-[#2C24A3] outline-none transition hover:bg-[#F1EFFF]"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

/** The monthly fee, converted, for inline use in sentences. */
export function PriceInline() {
  const { fromPkr } = useCurrency();
  return <>{fromPkr(BASE_PRICE_PKR)}</>;
}

/** The big price for the pricing card. */
export function PriceAmount() {
  const { fromPkr, currency } = useCurrency();
  return (
    <>
      <span className="text-5xl font-black tracking-tight text-[#17143A]">
        {fromPkr(BASE_PRICE_PKR)}
      </span>
      <span className="text-lg font-bold text-[#6B6794]"> /month</span>
      {currency !== "PKR" && (
        <span className="mt-1 block text-[12px] font-bold text-[#6B6794]">
          Converted from Rs {BASE_PRICE_PKR.toLocaleString("en-PK")} at an
          approximate rate. Billing is in PKR.
        </span>
      )}
    </>
  );
}
