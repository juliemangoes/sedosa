import type { Metadata, Viewport } from "next";
import "@fontsource/alegreya/400.css";
import "@fontsource/alegreya/500.css";
import "@fontsource/alegreya/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sedosa Beauty Studio · Book an appointment",
  description: "Brows, Korean lash lifts, PMU and waxing in Covington & Decatur, GA. Book online.",
};

export const viewport: Viewport = { themeColor: "#ffe1f6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-serif antialiased">{children}</body>
    </html>
  );
}
