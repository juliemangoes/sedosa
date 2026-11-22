import type { Metadata, Viewport } from "next";
import "@fontsource/alegreya/400.css";
import "@fontsource/alegreya/500.css";
import "@fontsource/alegreya/600.css";
import "@fontsource/alegreya/700.css";
import "@fontsource/antonio/latin-300.css";
import "@fontsource/sacramento/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sedosa Beauty Studio · Book an appointment",
  description: "Brows, Korean lash lifts, PMU and waxing in Covington & Decatur, GA. Book online.",
};

export const viewport: Viewport = { themeColor: "#0b0709", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen font-serif antialiased">{children}</body>
    </html>
  );
}
