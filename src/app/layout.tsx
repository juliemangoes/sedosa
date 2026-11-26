import type { Metadata, Viewport } from "next";
import "@fontsource-variable/jost/wght.css";
import "@fontsource-variable/bodoni-moda/opsz.css";
import "./globals.css";
import RevealObserver from "@/components/RevealObserver";

export const metadata: Metadata = {
  title: "Sedosa Beauty Studio · Book an appointment",
  description: "Brows, Korean lash lifts, PMU and waxing in Covington & Decatur, GA. Book online.",
};

export const viewport: Viewport = { themeColor: "#dc7096", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <RevealObserver />
      </body>
    </html>
  );
}
