"use client";

import { useState } from "react";
import { useTenantSlug } from "@/lib/tenant-context";
import { apiFetch } from "@/lib/api";

const TYPES = [
  ["complaint", "Complaint"],
  ["praise", "Praise"],
  ["suggestion", "Suggestion"],
] as const;

/** Feedback / complaint form - posts to the API (rate-limited). */
export function FeedbackForm() {
  const slug = useTenantSlug();
  const [type, setType] = useState<(typeof TYPES)[number][0]>("complaint");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (message.trim().length < 10) {
      setError("Please write a little more (min 10 characters).");
      return;
    }
    setStatus("sending");
    try {
      const res = await apiFetch("/api/feedback", slug, {
        method: "POST",
        body: JSON.stringify({
          type,
          name: name.trim(),
          phone: phone.trim(),
          order_no: orderNo ? Number(orderNo) : undefined,
          message: message.trim(),
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not send your feedback");
        setStatus("error");
        return;
      }
      setStatus("done");
      setMessage("");
      setName("");
      setPhone("");
      setOrderNo("");
    } catch {
      setError("Network error. Please try again");
      setStatus("error");
    }
  };

  return (
    <section id="feedback" className="scroll-mt-28 px-3 py-10">
      <div className="rounded-3xl bg-[var(--muted)] p-6">
        <h2 className="text-xl font-extrabold">From Complaint to Care</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tell us what went right, or what did not. We read everything.
        </p>

        {status === "done" ? (
          <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">
            Thank you. Your feedback has been received.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-2">
              {TYPES.map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setType(v)}
                  className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${
                    type === v
                      ? "bg-[var(--brand)] text-white"
                      : "bg-white text-neutral-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                inputMode="tel"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none"
              />
            </div>
            <input
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value.replace(/\D/g, ""))}
              placeholder="Order # (optional)"
              inputMode="numeric"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none"
            />
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              onClick={submit}
              disabled={status === "sending"}
              className="rounded-full bg-[var(--brand)] py-3 font-bold text-white disabled:opacity-50"
            >
              {status === "sending" ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
