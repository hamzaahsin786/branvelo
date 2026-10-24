"use client";

// Local copies on purpose: importing from Storefront would create a
// Storefront -> CartPanel -> Storefront cycle (Storefront renders this
// drawer). The shapes mirror Storefront's CartLine.
function formatRs(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

interface CartLine {
  key: string;
  item_id: number;
  deal_id: number | null;
  name: string;
  unit_price: number;
  qty: number;
  options: { id: number; group: string; name: string; price_delta: number }[];
  note: string;
}

interface UpsellItem {
  id: number;
  name: string;
  price: number;
  photo_url: string;
}

/** v2 slide-out cart drawer: lines with qty steppers and notes, an
 * upsell rail ("Frequently bought with this"), and the subtotal.
 * Delivery fee and tax are calculated at checkout, where the zone and
 * payment method are known. */
export function CartPanel({
  lines,
  upsells,
  primary,
  onQty,
  onAddUpsell,
  onCheckout,
  onClose,
}: {
  lines: CartLine[];
  upsells: UpsellItem[];
  primary: string;
  onQty: (key: string, delta: number) => void;
  onAddUpsell: (itemId: number) => void;
  onCheckout: () => void;
  onClose: () => void;
}) {
  const subtotal = lines.reduce((n, l) => n + l.unit_price * l.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-sm flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-base font-black">Your cart</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-bold">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="block"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-neutral-400">
              Your cart is empty. Add something tasty first.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {lines.map((line) => (
                <div key={line.key} className="flex items-start gap-3 rounded-2xl bg-neutral-50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">{line.name}</p>
                    {line.options.length > 0 && (
                      <p className="mt-0.5 text-[12px] font-semibold text-neutral-500">
                        {line.options.map((o) => o.name).join(", ")}
                      </p>
                    )}
                    {line.note && (
                      <p className="mt-0.5 text-[12px] font-semibold italic text-neutral-500">
                        Note: {line.note}
                      </p>
                    )}
                    <p className="mt-1 text-[13px] font-bold text-neutral-600">
                      {formatRs(line.unit_price)} each
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => onQty(line.key, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-black ring-1 ring-neutral-200">-</button>
                    <span className="min-w-5 text-center text-sm font-extrabold">{line.qty}</span>
                    <button onClick={() => onQty(line.key, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-black ring-1 ring-neutral-200">+</button>
                  </div>
                  <p className="w-16 shrink-0 text-right text-sm font-black">
                    {formatRs(line.unit_price * line.qty)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {upsells.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
                Frequently bought with this
              </h3>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {upsells.map((item) => (
                  <div key={item.id} className="w-36 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-100">
                    {item.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photo_url} alt="" className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-neutral-100 text-lg font-black text-neutral-400">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="truncate text-[13px] font-extrabold">{item.name}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[13px] font-black">{formatRs(item.price)}</span>
                        <button
                          onClick={() => onAddUpsell(item.id)}
                          className="rounded-full px-3 py-1 text-[12px] font-extrabold text-white"
                          style={{ backgroundColor: primary }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-neutral-100 px-5 py-4">
            <p className="flex justify-between text-sm font-semibold text-neutral-600">
              <span>Subtotal</span>
              <span>{formatRs(subtotal)}</span>
            </p>
            <p className="mt-1 text-[12px] font-semibold text-neutral-400">
              Delivery fee and tax are calculated at checkout.
            </p>
            <button
              onClick={onCheckout}
              className="mt-3 w-full rounded-full py-3.5 text-sm font-extrabold text-white"
              style={{ backgroundColor: primary }}
            >
              Checkout - {formatRs(subtotal)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
