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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@600;700;800;900&family=Poppins:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
