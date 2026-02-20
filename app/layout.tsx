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
          <header className="sticky top-0 z-50 border-b border-[var(--card-border)]/70 bg-[var(--background)]/90 text-[var(--foreground)] backdrop-blur-md">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity group">
                  <div className="relative w-12 h-12 md:w-14 md:h-14 bg-white rounded-full p-1 overflow-hidden shrink-0 border-2 border-[var(--karate-yellow)] shadow-sm group-hover:scale-105 transition-transform">
                    <Image src="/logo.png" alt="Shorin Kai Logo" fill className="object-cover" />
                  </div>
                  <div>
                    <h1 className="text-lg md:text-xl font-bold leading-tight tracking-tight">
                      Okinawa Shorin Kai
                    </h1>
                    <p className="text-xs md:text-sm text-[var(--muted)] font-semibold tracking-widest uppercase">
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
          <footer className="bg-[var(--background)]/90 text-[var(--foreground)] py-12 mt-auto border-t border-[var(--card-border)]/70">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Brand & Copyright */}
                <div className="flex flex-col items-center md:items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 bg-white rounded-full p-0.5 overflow-hidden">
                      <Image src="/logo.png" alt="Shorin Kai Logo" fill className="object-cover" />
                    </div>
                    <span className="font-semibold tracking-wide">Okinawa Shorin Kai Karate Do</span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    &copy; {new Date().getFullYear()} All rights reserved.
                  </p>
                </div>

                {/* Contact & Links */}
                <div className="flex flex-col md:flex-row items-center gap-6 text-sm text-[var(--muted)]">
                  <a href="mailto:contact@shorinkai.in" className="hover:text-[var(--karate-green)] transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    contact@shorinkai.in
                  </a>
                  <a 
                    href="https://github.com/ull0sm/animated-garbanzo" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                    View Source
                  </a>
                </div>

              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
