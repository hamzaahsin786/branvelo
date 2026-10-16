/**
 * @mezban/shared - Pakistan-first formatting helpers.
 */
import type { HoursJson } from "./types";

/** Rs 1,250 - no decimals, Pakistani thousands separators. */
export function formatRs(n: number): string {
  return "Rs " + Math.round(n).toLocaleString("en-PK");
}

/**
 * Normalize a Pakistani mobile number to +92XXXXXXXXXX.
 * Accepts 03XXXXXXXXX, 923XXXXXXXXX, +923XXXXXXXXX (spaces/dashes tolerated).
 * Returns null when invalid.
 */
export function normalizePkPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (/^03\d{9}$/.test(cleaned)) return "+92" + cleaned.slice(1);
  if (/^923\d{9}$/.test(cleaned)) return "+" + cleaned;
  if (/^\+923\d{9}$/.test(cleaned)) return cleaned;
  return null;
}

export function isValidPkPhone(raw: string): boolean {
  return normalizePkPhone(raw) !== null;
}

/** Display form: 0339 5249000 */
export function displayPkPhone(e164: string): string {
  const m = e164.match(/^\+92(\d{3})(\d{7})$/);
  return m ? `0${m[1]} ${m[2]}` : e164;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Is the restaurant open right now? Handles hours that cross midnight
 * (e.g. open 12:00, close 04:30 means open until 4:30 AM the next day).
 */
export function isOpenNow(hours: HoursJson, now: Date = new Date()): boolean {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const openAt = (key: string): boolean => {
    const dh = hours.days?.[key];
    if (!dh) return false;
    const open = toMinutes(dh.open);
    const close = toMinutes(dh.close);
    const cur = now.getHours() * 60 + now.getMinutes();
    if (close > open) return cur >= open && cur < close;
    // crosses midnight: open from `open` tonight OR before `close` this morning
    return cur >= open || cur < close;
  };
  return openAt(days[now.getDay()]);
}

/** "12:00 PM - 4:30 AM" summary for the footer. */
export function hoursSummary(hours: HoursJson): string {
  const fmt = (hhmm: string): string => {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };
  const mon = hours.days?.mon;
  if (!mon) return "";
  return `${fmt(mon.open)} - ${fmt(mon.close)}`;
}
