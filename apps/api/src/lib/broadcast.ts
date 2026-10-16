import { supabase } from "./supabase";

/**
 * Push an order-status update to the tracking page over Supabase Realtime
 * broadcast (channel `order:<tracking_token>`, event `status_changed`).
 * Best-effort: the tracking page also polls the public order endpoint.
 */
export async function broadcastOrderStatus(
  trackingToken: string,
  payload: { status: string; order_no: number }
): Promise<void> {
  try {
    const channel = supabase().channel(`order:${trackingToken}`);
    await channel.send({
      type: "broadcast",
      event: "status_changed",
      payload,
    });
    await supabase().removeChannel(channel);
  } catch {
    // Realtime is a live-update nicety; polling covers failures.
  }
}
