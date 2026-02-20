'use client'

import { useTheme } from '@/lib/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-10 w-[92px] items-center rounded-full border border-[var(--card-border)] bg-[var(--surface-alt)] p-1 text-xs font-semibold text-[var(--muted)] transition-all hover:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
      aria-label="Toggle theme"
    >
      <span
        className={`absolute left-1 top-1 h-8 w-[calc(50%-4px)] rounded-full bg-[var(--accent)] transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      <span
        className={`relative z-10 flex w-1/2 items-center justify-center gap-1 transition-colors ${theme === 'light' ? 'text-white' : 'text-[var(--muted)]'}`}
      >
        <span aria-hidden>☀️</span> <span className="hidden sm:inline">Light</span>
      </span>
      <span
        className={`relative z-10 flex w-1/2 items-center justify-center gap-1 transition-colors ${theme === 'dark' ? 'text-white' : 'text-[var(--muted)]'}`}
      >
        <span aria-hidden>🌙</span> <span className="hidden sm:inline">Dark</span>
      </span>
    </button>
  )
}
