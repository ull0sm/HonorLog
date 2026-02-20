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
  title: "Shorin Kai · Student Directory",
  description: "Student profiles and achievements — Okinawa Shorin Kai Karate Do",
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
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <ThemeProvider>
          {/* ── Header ── */}
          <header
            className="sticky top-0 z-50 h-12 flex items-center"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
          >
            <div className="w-full max-w-5xl mx-auto px-4 flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2.5 group"
                style={{ color: "var(--text)" }}
              >
                <div
                  className="relative w-7 h-7 rounded-full overflow-hidden shrink-0"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <Image src="/logo.png" alt="Shorin Kai logo" fill className="object-cover" />
                </div>
                <span
                  className="text-sm font-semibold tracking-tight transition-opacity group-hover:opacity-70"
                >
                  Okinawa Shorin Kai
                </span>
              </Link>
              <ThemeToggle />
            </div>
          </header>

          {/* ── Main ── */}
          <main className="flex-1">{children}</main>

          {/* ── Footer ── */}
          <footer
            className="h-12 flex items-center"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div
              className="w-full max-w-5xl mx-auto px-4 flex items-center justify-between text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <span>&copy; {new Date().getFullYear()} Okinawa Shorin Kai Karate Do</span>
              <div className="flex items-center gap-4">
                <a
                  href="mailto:contact@shorinkai.in"
                  className="footer-link transition-colors"
                >
                  contact@shorinkai.in
                </a>
                <a
                  href="https://github.com/ull0sm/animated-garbanzo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
