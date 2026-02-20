'use client'

import { useTheme } from '@/lib/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        background: theme === 'dark' ? '#011023' : '#052558',
        border: '1px solid rgba(82, 127, 176, 0.4)',
      }}
      aria-label="Toggle theme"
    >
      <span
        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm transition-transform duration-300"
        style={{
          background: '#527FB0',
          boxShadow: '0 0 8px rgba(82, 127, 176, 0.5)',
          transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(0)',
        }}
      >
        {theme === 'light' ? '☀️' : '🌙'}
      </span>
    </button>
  )
}
