/**
 * @branvelo/shared - order state machine.
 * placed -> confirmed -> preparing -> ready -> dispatched -> delivered
 * (cancelled / refunded branch off from any non-terminal state)
 */
import type { OrderStatus } from "./types";
export declare const STATUS_FLOW: OrderStatus[];
export declare const STATUS_LABELS: Record<OrderStatus, string>;
export declare const TERMINAL_STATUSES: OrderStatus[];
/** Next allowed statuses from a given status (admin one-tap advance + cancel). */
export declare function nextStatuses(status: OrderStatus): OrderStatus[];
export declare function isValidTransition(from: OrderStatus, to: OrderStatus): boolean;
