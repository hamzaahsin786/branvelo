"use client";

import { useState } from "react";
import type { DeliveryZone, DinerLocation, Tenant } from "@mezban/shared";
import { formatRs } from "@mezban/shared";
import { useCart } from "@/lib/cart";
import { useTenantSlug } from "@/lib/tenant-context";
import { apiFetch } from "@/lib/api";
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from "./icons";

interface Props {
  tenant: Tenant;
  zones: DeliveryZone[];
  location: DinerLocation | null;
  onLocationOpen: () => void;
}

type Step = "cart" | "checkout" | "success";

interface PlacedOrder {
  order_no: number;
  tracking_token: string;
}

/** Slide-in cart drawer with qty steppers → checkout → success. */
export function CartDrawer({ tenant, zones, location, onLocationOpen }: Props) {
  const { lines, subtotal, count, setQty, clear, isOpen, setOpen } = useCart();
  const slug = useTenantSlug();
  const [step, setStep] = useState<Step>("cart");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setStep("cart");
      setPlaced(null);
    }, 300);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-extrabold">
                {step === "cart" && "Your Order"}
                {step === "checkout" && "Checkout"}
                {step === "success" && "Order Placed"}
              </h2>
              <button
                onClick={close}
                aria-label="Close cart"
                className="rounded-full p-1 hover:bg-neutral-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {step === "cart" && (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  {lines.length === 0 ? (
                    <p className="mt-10 text-center text-sm text-neutral-500">
                      Your cart is empty. Add something tasty.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {lines.map((l) => (
                        <li
                          key={l.item.id}
                          className="flex items-center gap-3 rounded-2xl border border-neutral-100 p-3"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-lg font-extrabold text-[var(--brand)]/40">
                            {l.item.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{l.item.name}</p>
                            <p className="text-xs text-neutral-500">
                              {formatRs(l.item.price)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setQty(l.item.id, l.qty - 1)}
                              aria-label="Decrease quantity"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold">
                              {l.qty}
                            </span>
                            <button
                              onClick={() => setQty(l.item.id, l.qty + 1)}
                              aria-label="Increase quantity"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)] text-white"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {lines.length > 0 && (
                  <div className="border-t p-4">
                    <div className="flex justify-between text-sm font-bold">
                      <span>Subtotal</span>
                      <span>{formatRs(subtotal)}</span>
                    </div>
                    <button
                      onClick={() => setStep("checkout")}
                      className="mt-3 w-full rounded-full bg-[var(--brand)] py-3.5 font-bold text-white"
                    >
                      Checkout · {formatRs(subtotal)}
                    </button>
                  </div>
                )}
              </>
            )}

            {step === "checkout" && (
              <CheckoutForm
                tenant={tenant}
                zones={zones}
                location={location}
                onLocationOpen={onLocationOpen}
                onBack={() => setStep("cart")}
                onSuccess={(o) => {
                  setPlaced(o);
                  setStep("success");
                  clear();
                }}
              />
            )}

            {step === "success" && placed && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckIcon className="h-8 w-8" />
                </span>
                <h3 className="mt-4 text-xl font-extrabold">
                  Order #{placed.order_no} placed!
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  {tenant.name} has received your order and will start preparing
                  it shortly.
                </p>
                <a
                  href={`/track/${placed.tracking_token}`}
                  className="mt-6 w-full rounded-full bg-[var(--brand)] py-3.5 text-center font-bold text-white"
                >
                  Track My Order
                </a>
                <button
                  onClick={close}
                  className="mt-2 w-full rounded-full py-3 text-sm font-bold text-neutral-500"
                >
                  Back to menu
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function CheckoutForm({
  tenant,
  zones,
  location,
  onLocationOpen,
  onBack,
  onSuccess,
}: {
  tenant: Tenant;
  zones: DeliveryZone[];
  location: DinerLocation | null;
  onLocationOpen: () => void;
  onBack: () => void;
  onSuccess: (o: PlacedOrder) => void;
}) {
  const { lines, subtotal } = useCart();
  const slug = useTenantSlug();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"delivery" | "pickup">(
    location?.type ?? "delivery"
  );
  const [address, setAddress] = useState("");
  const [zoneId, setZoneId] = useState(location?.zoneId ?? "");
  const [coupon, setCoupon] = useState("");
  const [payment, setPayment] = useState<"cod" | "jazzcash" | "easypaisa">("cod");
  const [paymentRef, setPaymentRef] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const zone = zones.find((z) => z.id === zoneId);
  const fee =
    type === "delivery" && zone
      ? zone.free_above != null && subtotal >= zone.free_above
        ? 0
        : zone.fee
      : 0;

  const place = async () => {
    setError(null);
    if (lines.length === 0) return;
    if (name.trim().length < 2) return setError("Please enter your name");
    if (!/^[\d\s+\-()]{10,20}$/.test(phone))
      return setError("Please enter a valid phone number (03XXXXXXXXX)");
    if (type === "delivery") {
      if (address.trim().length < 5) return setError("Please enter your delivery address");
      if (!zoneId) return setError("Please choose your delivery area");
    }
    setPlacing(true);
    try {
      const res = await apiFetch("/api/orders", slug, {
        method: "POST",
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          type,
          customer_address: address.trim(),
          zone_id: type === "delivery" ? zoneId : undefined,
          coupon_code: coupon.trim() || undefined,
          payment_method: payment,
          payment_ref: paymentRef.trim(),
          notes: notes.trim(),
          scheduled_for: scheduled ? new Date(scheduled).toISOString() : undefined,
          items: lines.map((l) => ({ menu_item_id: l.item.id, qty: l.qty })),
        }),
      });
      const body = (await res.json()) as {
        error?: string;
        order_no?: number;
        tracking_token?: string;
      };
      if (!res.ok) {
        setError(body.error || "Could not place your order");
        return;
      }
      onSuccess({
        order_no: body.order_no as number,
        tracking_token: body.tracking_token as string,
      });
    } catch {
      setError("Network error. Please try again");
    } finally {
      setPlacing(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-full bg-neutral-100 p-1">
        {(["delivery", "pickup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full py-2 text-sm font-bold capitalize ${
              type === t ? "bg-[var(--brand)] text-white" : "text-neutral-500"
            }`}
          >
            {t === "delivery" ? "Delivery" : "Pick-Up"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={inputCls}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone: 03XXXXXXXXX"
          inputMode="tel"
          className={inputCls}
        />
        {type === "delivery" && (
          <>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full delivery address"
              rows={2}
              className={inputCls}
            />
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select area…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}: {formatRs(z.fee)} delivery
                </option>
              ))}
            </select>
            <button
              onClick={onLocationOpen}
              className="text-left text-xs font-semibold text-[var(--brand)]"
            >
              Change order type / area
            </button>
          </>
        )}
        <input
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="Coupon code (optional)"
          className={inputCls}
        />
        <div>
          <p className="mb-1 text-sm font-semibold">Payment</p>
          <div className="flex flex-col gap-2">
            {(
              [
                ["cod", "Cash on Delivery"],
                ["jazzcash", "JazzCash"],
                ["easypaisa", "Easypaisa"],
              ] as const
            ).map(([v, label]) => (
              <label
                key={v}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                  payment === v
                    ? "border-[var(--brand)] bg-[var(--brand)]/5"
                    : "border-neutral-200"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={payment === v}
                  onChange={() => setPayment(v)}
                  className="accent-[#15803d]"
                />
                {label}
              </label>
            ))}
          </div>
          {payment !== "cod" && (
            <input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="Transaction ID / sender number (verified on call)"
              className={`${inputCls} mt-2`}
            />
          )}
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes for the kitchen (optional)"
          className={inputCls}
        />
        <label className="text-sm">
          <span className="font-semibold">Schedule for later (optional)</span>
          <input
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
            className={`${inputCls} mt-1`}
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-bold">{formatRs(subtotal)}</span>
        </div>
        {type === "delivery" && (
          <div className="mt-1 flex justify-between">
            <span>Delivery fee</span>
            <span className="font-bold">
              {fee === 0 ? "FREE" : formatRs(fee)}
            </span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-extrabold">
          <span>Total</span>
          <span>{formatRs(subtotal + fee)}</span>
        </div>
        <p className="mt-1 text-[11px] text-neutral-400">
          Discounts are applied by the restaurant at confirmation.
        </p>
      </div>

      <div className="mt-4 flex gap-2 pb-2">
        <button
          onClick={onBack}
          className="rounded-full border border-neutral-200 px-5 py-3.5 text-sm font-bold"
        >
          Back
        </button>
        <button
          onClick={place}
          disabled={placing || lines.length === 0}
          className="flex-1 rounded-full bg-[var(--brand)] py-3.5 font-bold text-white disabled:opacity-50"
        >
          {placing ? "Placing…" : `Place Order · ${formatRs(subtotal + fee)}`}
        </button>
      </div>
    </div>
  );
}
