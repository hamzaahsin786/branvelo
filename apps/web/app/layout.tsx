import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mezban - Order direct from your favourite restaurants",
  description:
    "Browse the menu, order in seconds, and track your food live. Powered by Mezban.",
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
