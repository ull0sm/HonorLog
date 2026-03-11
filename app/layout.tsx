import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { ThemeProvider } from "@/lib/ThemeContext";
import SearchNavLink from "@/components/SearchNavLink";
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
      >
        <ThemeProvider>
          <header className="sticky top-0 z-50 nav-blur">
            <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
              <Link
                href="/"
                className="flex items-center gap-3 text-foreground"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-border bg-primary/15 ring-1 ring-primary/15">
                  <Image src="/logo.png" alt="Shorin Kai logo" fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tracking-tight">HonorLog</div>
                  <div className="truncate text-xs uppercase tracking-[0.14em] text-muted-foreground">Okinawa Shorin Kai</div>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
                  <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
                  <SearchNavLink className="transition-colors hover:text-foreground" />
                  <Link href="/#contact" className="transition-colors hover:text-foreground">Contact</Link>
                  <a
                    href="https://entrydesk.shorinkai.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    EntryDesk
                  </a>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="page-shell flex-1">{children}</main>

          <footer id="contact" className="border-t border-border/80 bg-background/40 backdrop-blur-sm">
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
              <div>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border bg-primary/15 ring-1 ring-primary/15">
                    <Image src="/logo.png" alt="Shorin Kai logo" fill className="object-cover" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">HonorLog</div>
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Student profile portal</div>
                  </div>
                </div>
                <p className="mt-4 max-w-md text-muted-foreground">
                  Search students, review competition history, and keep Okinawa Shorin Kai records accessible for staff and organizers.
                </p>
              </div>

              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Links</div>
                <div className="flex flex-col gap-2">
                  <Link href="/" className="footer-link inline-flex items-center gap-2">
                    Home
                    <span className="shrink-0 text-sm leading-none" aria-hidden="true">↗</span>
                  </Link>
                  <Link href="/#search" className="footer-link inline-flex items-center gap-2">
                    Search
                    <span className="shrink-0 text-sm leading-none" aria-hidden="true">↗</span>
                  </Link>
                  <a href="https://entrydesk.shorinkai.in" target="_blank" rel="noopener noreferrer" className="footer-link inline-flex items-center gap-2">
                    EntryDesk
                    <span className="shrink-0 text-sm leading-none" aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>

              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Contact</div>
                <div className="flex flex-col gap-2">
                  <a href="mailto:contact@shorinkai.in" className="footer-link">contact@shorinkai.in</a>
                  <a
                    href="https://github.com/ull0sm/HonorLog"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link inline-flex items-center gap-2"
                  >
                    GitHub repository
                    <span className="shrink-0 text-sm leading-none" aria-hidden="true">↗</span>
                  </a>
                  <span className="text-muted-foreground">© {new Date().getFullYear()} Okinawa Shorin Kai Karate Do</span>
                </div>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
