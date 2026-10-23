import type { Metadata } from "next";
import { TrackOrder } from "@/components/storefront/TrackOrder";

/** Public order tracking (v2): live status from the Django ordering API. */
export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <TrackOrder orderId={params.orderId} />;
}
