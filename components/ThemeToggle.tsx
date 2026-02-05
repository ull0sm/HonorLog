'use client'

import { useTheme } from '@/lib/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] transition-all hover:border-[var(--karate-green)] focus:outline-none focus:ring-2 focus:ring-[var(--karate-green)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
      aria-label="Toggle theme"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[var(--karate-green)] flex items-center justify-center text-white text-sm transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {theme === 'light' ? '☀️' : '🌙'}
      </span>
    </button>
  )
}
