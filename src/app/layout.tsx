import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "./providers";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Nestlings Monthly | Baby Essentials Planner",
  description:
    "Interactive dashboard that curates baby essentials timelines and bundles based on your family profile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className="antialiased"
        suppressHydrationWarning={true}
      >
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
