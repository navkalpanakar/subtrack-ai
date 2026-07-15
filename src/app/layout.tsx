import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SubTrack AI — Outsmart Your Subscriptions",
  description:
    "Track every subscription, catch price hikes, and earn rewards with Savvy AI. Scan receipts, sync your inbox, complete challenges, and unlock coupon scratch cards.",
  keywords: [
    "subscription tracker",
    "save money",
    "renewal reminders",
    "AI finance",
    "cancel subscriptions",
    "gamification",
  ],
  authors: [{ name: "SubTrack AI" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SubTrack AI",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "SubTrack AI — Outsmart Your Subscriptions",
    description:
      "Track subscriptions, earn Savvy Points, unlock coupon scratch cards. Powered by Savvy AI.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <Sonner />
        </Providers>
      </body>
    </html>
  );
}
