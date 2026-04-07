import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Metadata = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Wealth Tracker - Kelola Keuangan Anda",
  description: "Aplikasi pencatatan keuangan modern dengan fitur lengkap untuk tracking kas masuk, keluar, dan target tabungan",
  keywords: ["keuangan", "tracker", "kas", "tabungan", "investasi"],
  authors: [{ name: "Tyger Earth | Ahtjong Labs" }],
  icons: {
    icon: "/logo.PNG",
    shortcut: "/logo.PNG",
    apple: "/logo.PNG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
