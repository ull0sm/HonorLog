import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { ThemeProvider } from "@/lib/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shorin Kai Student Profiles",
  description: "View student profiles and achievements - Okinawa Shorin Kai Karate Do",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <ThemeProvider>
          {/* Header */}
          <header className="sticky top-0 z-50 bg-[var(--karate-green)] text-white shadow-lg">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity group">
                  <div className="relative w-12 h-12 md:w-14 md:h-14 bg-white rounded-full p-1 overflow-hidden shrink-0 border-2 border-[var(--karate-yellow)] shadow-md group-hover:scale-105 transition-transform">
                    <Image src="/logo.png" alt="Shorin Kai Logo" fill className="object-cover" />
                  </div>
                  <div>
                    <h1 className="text-lg md:text-xl font-bold leading-tight tracking-tight">
                      Okinawa Shorin Kai
                    </h1>
                    <p className="text-xs md:text-sm text-[var(--karate-yellow)] font-semibold tracking-widest uppercase">
                      Karate Do
                    </p>
                  </div>
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-[var(--karate-black)] text-white py-8 mt-auto">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 bg-white rounded-full p-0.5 overflow-hidden">
                    <Image src="/logo.png" alt="Shorin Kai Logo" fill className="object-cover" />
                  </div>
                  <span className="font-semibold">Okinawa Shorin Kai Karate Do</span>
                </div>
                <p className="text-sm text-gray-400">
                  &copy; {new Date().getFullYear()} All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
