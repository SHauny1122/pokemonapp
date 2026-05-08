import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { CurrencySettingsSync } from "@/components/currency-settings-sync";
import { Geist, Geist_Mono } from "next/font/google";
import { CollectionProvider } from "@/components/collection-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Collector",
  description: "Mobile-first Pokemon card collector companion.",
  applicationName: "Smart Collector",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.svg", type: "image/svg+xml", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Smart Collector",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0b0c0f] text-zinc-100">
        <AuthProvider>
          <CurrencyProvider>
            <CurrencySettingsSync />
            <PwaRegister />
            <CollectionProvider>{children}</CollectionProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
