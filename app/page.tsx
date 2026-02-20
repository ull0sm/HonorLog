'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Fuse from 'fuse.js'

interface Student {
  id: string
  full_name: string
  student_id: string
  belt_rank: string
  dojo: string
}

function BeltBadge({ belt }: { belt: string }) {
  const styles: Record<string, React.CSSProperties> = {
    White:  { background: '#f4f4f5', color: '#52525b', border: '1px solid #d4d4d8' },
    Yellow: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
    Green:  { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
    Brown:  { background: '#ffedd5', color: '#7c2d12', border: '1px solid #fdba74' },
    Black:  { background: '#18181b', color: '#f4f4f5', border: '1px solid #3f3f46' },
  }
  return (
    <span
      className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={styles[belt] ?? { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
    >
      {belt}
    </span>
  )
}

export default function Home() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase
      .from('students')
      .select('id, full_name, student_id, belt_rank, dojo')
      .order('full_name')
      .then(({ data, error }) => {
        if (!error) setAllStudents(data ?? [])
        setLoading(false)
      })
  }, [])

  const fuse = useMemo(
    () => new Fuse(allStudents, { keys: ['full_name', 'student_id'], threshold: 0.35, distance: 100 }),
    [allStudents]
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 8).map(r => r.item)
  }, [query, fuse])

  const isActive = open && query.trim().length > 0

  function clear() {
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-96px)] px-4 py-16">

      {/* ── Wordmark ── */}
      <div className="mb-10 text-center animate-enter space-y-2">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          style={{ color: 'var(--text)' }}
        >
          Student Directory
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Okinawa Shorin Kai Karate Do
        </p>
      </div>

      {/* ── Search ── */}
      <div className="w-full max-w-lg relative">

        {/* Input wrapper */}
        <div
          className="relative flex items-center rounded-lg overflow-hidden transition-all duration-150"
          style={{
            background: 'var(--surface)',
            border: open ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
            boxShadow: open ? `0 0 0 3px var(--accent-dim), var(--shadow-sm)` : 'var(--shadow-sm)',
          }}
        >
          {/* Search icon */}
          <svg
            className="absolute left-3.5 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--text-placeholder)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120 /* allow click on result to fire before closing */)}
            placeholder="Search by name or student ID…"
            className="w-full pl-10 pr-10 py-3 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text)' }}
            autoComplete="off"
            autoFocus
          />

          {/* Clear button */}
          {query && (
            <button
              onMouseDown={e => { e.preventDefault(); clear() }}
              className="absolute right-3 flex items-center justify-center w-5 h-5 rounded transition-colors"
              style={{ color: 'var(--text-placeholder)' }}
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Results dropdown ── */}
        {isActive && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 rounded-lg overflow-hidden z-40 animate-enter"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {loading ? (
              <div className="py-8 flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              <ul className="py-1 max-h-72 overflow-y-auto">
                {results.map(s => (
                  <li key={s.id}>
                    <button
                      onMouseDown={() => router.push(`/student/${s.id}`)}
                      className="w-full px-4 py-2.5 flex items-center justify-between gap-4 text-left transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                    >
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text)' }}
                        >
                          {s.full_name}
                        </div>
                        <div
                          className="text-xs mt-0.5 flex items-center gap-1.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <span
                            className="font-mono px-1.5 py-px rounded text-xs"
                            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                          >
                            {s.student_id}
                          </span>
                          <span style={{ color: 'var(--text-placeholder)' }}>·</span>
                          <span className="truncate">{s.dojo}</span>
                        </div>
                      </div>
                      <BeltBadge belt={s.belt_rank} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Footer row */}
            <div
              className="px-4 py-2 flex items-center justify-between border-t"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-subtle)',
              }}
            >
              <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>
                {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : ''}
              </span>
              <kbd
                className="text-xs px-1.5 py-px rounded font-mono"
                style={{ background: 'var(--border)', color: 'var(--text-muted)', border: '1px solid var(--border-strong)' }}
              >
                ↵
              </kbd>
            </div>
          </div>
        )}
      </div>

      {/* ── Idle hint ── */}
      {!query && (
        <p
          className="mt-6 text-xs animate-fade"
          style={{ color: 'var(--text-placeholder)' }}
        >
          Start typing to search {allStudents.length > 0 ? `${allStudents.length} students` : 'the directory'}
        </p>
      )}
    </div>
  )
}
