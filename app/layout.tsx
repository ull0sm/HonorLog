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
          <header className="sticky top-0 z-50 border-b border-[var(--card-border)]/70 bg-[var(--background)]/88 backdrop-blur-xl">
            <div className="h-0.5 bg-gradient-to-r from-[var(--accent)] via-[var(--ring)] to-[var(--accent)]" />
            <div className="container mx-auto px-4 py-4">
              <div className="panel glass clean-shadow flex items-center justify-between px-4 py-3">
                <Link href="/" className="group flex items-center gap-4">
                  <div className="relative h-12 w-12 md:h-14 md:w-14 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface-alt)] p-1 transition-transform group-hover:scale-105">
                    <Image src="/logo.png" alt="Shorin Kai Logo" fill className="object-cover rounded-xl" />
                  </div>
                  <div className="leading-tight">
                    <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[var(--foreground)]">Okinawa Shorin Kai</h1>
                    <p className="text-xs md:text-sm font-medium uppercase tracking-widest text-[var(--muted)]">Performance Portal</p>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <span className="hidden lg:inline-flex rounded-full border border-[var(--card-border)] bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">Live Directory</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>

          <footer className="mt-auto border-t border-[var(--card-border)]/70 bg-[var(--background)]/92 py-10">
            <div className="container mx-auto px-4">
              <div className="panel glass clean-shadow px-6 py-7 md:px-8">
                <div className="grid gap-8 md:grid-cols-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[var(--card-border)] bg-white p-0.5">
                        <Image src="/logo.png" alt="Shorin Kai Logo" fill className="object-cover rounded-lg" />
                      </div>
                      <p className="font-semibold tracking-wide text-[var(--foreground)]">Okinawa Shorin Kai Karate Do</p>
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Professional student analytics for ranks, performance history, and tournament insights.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Connect</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <a href="mailto:contact@shorinkai.in" className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-alt)] px-3 py-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        contact@shorinkai.in
                      </a>
                      <a href="https://github.com/ull0sm/animated-garbanzo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-alt)] px-3 py-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                        View Source
                      </a>
                    </div>
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Status</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">Built with Next.js + Supabase</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">&copy; {new Date().getFullYear()} All rights reserved.</p>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
