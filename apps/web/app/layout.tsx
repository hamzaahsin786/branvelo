import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Branvelo - Order direct from your favourite restaurants",
  description:
    "Browse the menu, order in seconds, and track your food live. Powered by Branvelo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
