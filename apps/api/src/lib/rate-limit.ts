/**
 * Rate-limit budgets, enforced by @fastify/rate-limit (registered in index.ts
 * with global:false; /health is allow-listed there).
 *
 * Admin routes (/api/admin/*) get their 60/min budget via the onRoute hook
 * in index.ts — no per-file wiring needed.
 */
export const ORDER_RATE_LIMIT = { max: 20, timeWindow: "1 minute" } as const;
export const FEEDBACK_RATE_LIMIT = { max: 10, timeWindow: "1 minute" } as const;
