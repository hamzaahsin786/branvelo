"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Display currency for the Branvelo platform site.
 * Detected from the country the visitor connects from (IP geolocation),
 * with browser language/timezone as offline fallbacks. A manual choice in
 * the header is remembered in localStorage and always wins. Billing
 * itself is in PKR for now; other currencies are display conversions at
 * approximate rates, noted on the pricing section.
 */
export const BASE_PRICE_PKR = 2499;

export const CURRENCIES = [
  { code: "PKR", label: "PKR - Pakistan" },
  { code: "USD", label: "USD - United States" },
  { code: "CAD", label: "CAD - Canada" },
  { code: "EUR", label: "EUR - Eurozone" },
  { code: "GBP", label: "GBP - United Kingdom" },
  { code: "AED", label: "AED - UAE" },
  { code: "SAR", label: "SAR - Saudi Arabia" },
  { code: "INR", label: "INR - India" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

// Approximate display rates: units of currency per 1 PKR.
const RATES: Record<CurrencyCode, number> = {
  PKR: 1,
  USD: 0.0036,
  CAD: 0.0026,
  EUR: 0.0033,
  GBP: 0.0028,
  AED: 0.0132,
  SAR: 0.0135,
  INR: 0.3,
};

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  PK: "PKR",
  US: "USD",
  CA: "CAD",
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
  "America/Toronto": "CAD",
  "America/Vancouver": "CAD",
  "America/Winnipeg": "CAD",
  "America/Edmonton": "CAD",
  "America/Halifax": "CAD",
  "America/Montreal": "CAD",
  "America/St_Johns": "CAD",
};

function storedCurrency(): CurrencyCode | null {
  try {
    const stored = window.localStorage.getItem("branvelo-currency");
    if (stored && CURRENCIES.some((c) => c.code === stored)) {
      return stored as CurrencyCode;
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

/** Offline fallback signals: browser language region, then timezone. */
function detectFromBrowser(): CurrencyCode {
  const region = (navigator.language || "").split("-")[1]?.toUpperCase();
  if (region && COUNTRY_TO_CURRENCY[region]) return COUNTRY_TO_CURRENCY[region];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz && TIMEZONE_TO_CURRENCY[tz]) return TIMEZONE_TO_CURRENCY[tz];
  if (tz?.startsWith("America/")) return "USD";
  if (tz?.startsWith("Europe/")) return "EUR";
  return "PKR";
}

/**
 * Primary signal: the country the visitor connects FROM (IP geolocation).
 * This is what makes the currency follow travel and VPNs. All sources run
 * IN PARALLEL and the first answer wins: sequential checks with short
 * timeouts all died behind a slow free-VPN proxy, and individual sources
 * rate-limit shared VPN exits (ipapi.co did; ipwho.is answered for the
 * same IP). Cloudflare's trace endpoint is included because it is fast
 * and almost never blocked.
 */
const GEO_TIMEOUT_MS = 9000;

async function fetchJson(
  url: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
    });
    if (res.ok) return (await res.json()) as Record<string, unknown>;
    console.debug(`[branvelo] geo source ${url} answered HTTP ${res.status}`);
  } catch (err) {
    console.debug(`[branvelo] geo source ${url} failed`, err);
  }
  return null;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
    });
    if (res.ok) return await res.text();
    console.debug(`[branvelo] geo source ${url} answered HTTP ${res.status}`);
  } catch (err) {
    console.debug(`[branvelo] geo source ${url} failed`, err);
  }
  return null;
}

function pick(
  currencyRaw: unknown,
  countryRaw: unknown,
): { currency: CurrencyCode; country: string } | null {
  if (typeof countryRaw === "string" && COUNTRY_TO_CURRENCY[countryRaw]) {
    return { currency: COUNTRY_TO_CURRENCY[countryRaw], country: countryRaw };
  }
  if (
    typeof currencyRaw === "string" &&
    CURRENCIES.some((c) => c.code === currencyRaw)
  ) {
    return { currency: currencyRaw as CurrencyCode, country: "" };
  }
  return null;
}

async function detectFromIp(): Promise<{
  currency: CurrencyCode;
  country: string;
} | null> {
  const attempts: Array<
    Promise<{ currency: CurrencyCode; country: string } | null>
  > = [
    (async () => {
      const d = await fetchJson("https://ipwho.is/");
      if (!d) return null;
      const cur = d.currency as { code?: unknown } | undefined;
      return pick(cur?.code, d.country_code);
    })(),
    (async () => {
      const t = await fetchText("https://www.cloudflare.com/cdn-cgi/trace");
      const loc = t?.match(/^loc=([A-Z]{2})$/m)?.[1];
      return loc ? pick(undefined, loc) : null;
    })(),
    (async () => {
      const d = await fetchJson("https://ipapi.co/json/");
      return d ? pick(d.currency, d.country_code) : null;
    })(),
    (async () => {
      const d = await fetchJson("https://api.country.is/");
      return d ? pick(undefined, d.country) : null;
    })(),
    (async () => {
      const d = await fetchJson("https://get.geojs.io/v1/ip/country.json");
      return d ? pick(undefined, d.country) : null;
    })(),
  ];
  return new Promise((resolve) => {
    let pending = attempts.length;
    let settled = false;
    attempts.forEach((p) =>
      p
        .then((hit) => {
          if (hit && !settled) {
            settled = true;
            console.debug(
              `[branvelo] detected country ${hit.country || "?"} -> ${hit.currency}`,
            );
            resolve(hit);
          } else if (--pending === 0 && !settled) {
            resolve(null);
          }
        })
        .catch(() => {
          if (--pending === 0 && !settled) resolve(null);
        }),
    );
  });
}

const COUNTRY_NAMES: Record<string, string> = {
  PK: "Pakistan",
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AE: "UAE",
  SA: "Saudi Arabia",
  IN: "India",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  IE: "Ireland",
  PT: "Portugal",
  AT: "Austria",
  BE: "Belgium",
  FI: "Finland",
  GR: "Greece",
};

type CurrencyCtx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** True while the currency follows the detected country automatically. */
  auto: boolean;
  /** Switch back to automatic (by-country) detection. */
  useAuto: () => void;
  /** Country code from the last successful IP detection, if any. */
  detectedCountry: string | null;
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
  auto: true,
  useAuto: () => {},
  detectedCountry: null,
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
  const [auto, setAuto] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const autoRef = useRef(true);
  const lastIpCheck = useRef(0);

  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  /** IP-based detection, throttled so tab-switching cannot spam lookups. */
  function checkIp(force = false) {
    const now = Date.now();
    if (!force && now - lastIpCheck.current < 15000) return;
    lastIpCheck.current = now;
    void detectFromIp().then((hit) => {
      if (hit && autoRef.current) {
        setCurrencyState(hit.currency);
        if (hit.country) setDetectedCountry(hit.country);
      }
    });
  }

  function runDetection() {
    // Instant best guess from the browser, then the IP-based country
    // (the connection country) refines it a moment later.
    setCurrencyState(detectFromBrowser());
    checkIp(true);
  }

  // In Auto mode, re-check when the visitor returns to this tab. This is
  // what makes the currency follow a VPN switched mid-session, with no
  // reload: connect elsewhere, come back to the tab, it corrects itself.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && autoRef.current) {
        checkIp();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // A manual choice in the header always wins and is never overridden.
    const manual = storedCurrency();
    if (manual) {
      setCurrencyState(manual);
      setAuto(false);
      return;
    }
    return runDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    setAuto(false);
    try {
      window.localStorage.setItem("branvelo-currency", c);
    } catch {
      /* storage unavailable */
    }
  }

  function useAuto() {
    try {
      window.localStorage.removeItem("branvelo-currency");
    } catch {
      /* storage unavailable */
    }
    setAuto(true);
    setDetectedCountry(null);
    runDetection();
  }

  const value: CurrencyCtx = {
    currency,
    setCurrency,
    auto,
    useAuto,
    detectedCountry,
    fromPkr: (n) => formatIn(n * RATES[currency], currency),
    format: (n) => formatIn(n, currency),
    fee: Math.round(BASE_PRICE_PKR * RATES[currency]),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function CurrencySelector() {
  const { currency, setCurrency, auto, useAuto, detectedCountry } =
    useCurrency();
  const autoLabel = detectedCountry
    ? `Auto - ${COUNTRY_NAMES[detectedCountry] ?? detectedCountry}`
    : "Auto - by country";
  return (
    <select
      aria-label="Display currency"
      value={auto ? "AUTO" : currency}
      onChange={(e) => {
        if (e.target.value === "AUTO") useAuto();
        else setCurrency(e.target.value as CurrencyCode);
      }}
      className="cursor-pointer rounded-full border border-[#DDD9FA] bg-white px-2.5 py-2 text-[13px] font-extrabold text-[#2C24A3] outline-none transition hover:bg-[#F1EFFF]"
    >
      <option value="AUTO">{autoLabel}</option>
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
