/**
 * @branvelo/shared - order state machine.
 * placed → confirmed → preparing → ready → dispatched → delivered
 * (cancelled / refunded branch off from any non-terminal state)
 */
import type { OrderStatus } from "./types";

export const STATUS_FLOW: OrderStatus[] = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "delivered",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  dispatched: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const TERMINAL_STATUSES: OrderStatus[] = [
  "delivered",
  "cancelled",
  "refunded",
];

/** Next allowed statuses from a given status (admin one-tap advance + cancel). */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  if (TERMINAL_STATUSES.includes(status)) return [];
  const idx = STATUS_FLOW.indexOf(status);
  const next = idx >= 0 ? STATUS_FLOW.slice(idx + 1, idx + 2) : [];
  return [...next, "cancelled"];
}

export function isValidTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return nextStatuses(from).includes(to);
}
