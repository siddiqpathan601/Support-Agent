import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "SupportAI — Autonomous Customer Support",
  description: "AI-powered customer support platform that resolves 80–90% of issues autonomously.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface text-slate-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
