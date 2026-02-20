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
      className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
      style={styles[belt] ?? {}}
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-3.5rem)] px-4 py-12 sm:py-16">

      {/* ── Wordmark ── */}
      <div className="mb-14 text-center animate-enter space-y-1">
        <h1
          className="text-6xl sm:text-8xl font-black tracking-tighter uppercase text-foreground leading-none"
        >
          HonorLog
        </h1>
        <p className="text-xl sm:text-2xl font-bold uppercase tracking-widest text-primary">
          Okinawa Shorin Kai
        </p>
      </div>

      {/* ── Search ── */}
      <div className="w-full max-w-lg relative">

        {/* Input wrapper */}
        <div
          className={`relative flex items-center bg-background transition-transform duration-200 ${open ? 'athletic-shadow-sm' : 'border-2 border-foreground'}`}
        >
          {/* Search icon */}
          <svg
            className="absolute left-4 w-6 h-6 text-foreground pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120 /* allow click on result to fire before closing */)}
            placeholder="ENTER FIGHTER NAME OR ID"
            className="w-full pl-12 pr-12 py-4 bg-transparent text-xl sm:text-2xl font-bold uppercase placeholder:text-muted-foreground outline-none text-foreground"
            autoComplete="off"
            autoFocus
          />

          {/* Clear button */}
          {query && (
            <button
              onMouseDown={e => { e.preventDefault(); clear() }}
              className="absolute right-3 flex items-center justify-center w-5 h-5 rounded transition-colors text-muted-foreground hover:text-foreground"
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
            className="absolute top-full left-0 right-0 mt-2 athletic-shadow z-40 animate-in fade-in-0 slide-in-from-top-2"
          >
            {loading ? (
              <div className="py-8 flex items-center justify-center gap-3 text-muted-foreground">
                <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span className="text-base">Loading…</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <p className="text-base">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              <ul className="py-1 max-h-72 overflow-y-auto">
                {results.map(s => (
                  <li key={s.id}>
                    <button
                      onMouseDown={() => router.push(`/student/${s.id}`)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left transition-colors hover:bg-foreground hover:text-background border-b-2 border-foreground last:border-b-0 group"
                    >
                      <div className="min-w-0">
                        <div
                          className="text-xl sm:text-2xl font-black uppercase truncate group-hover:text-background"
                        >
                          {s.full_name}
                        </div>
                        <div
                          className="text-sm mt-1 flex items-center gap-2 font-bold uppercase tracking-widest group-hover:text-background/80"
                        >
                          <span
                            className="px-2 py-0.5 border-2 border-current"
                          >
                            {s.student_id}
                          </span>
                          <span>·</span>
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
              className="px-5 py-3 flex items-center justify-between border-t-2 border-foreground bg-muted font-bold uppercase tracking-widest"
            >
              <span className="text-xs text-muted-foreground">
                {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : ''}
              </span>
              <kbd
                className="text-xs px-1.5 py-px rounded font-mono bg-background border border-border text-muted-foreground shadow-sm"
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
          className="mt-6 text-xs text-muted-foreground animate-in fade-in"
        >
          Start typing to search {allStudents.length > 0 ? `${allStudents.length} students` : 'the directory'}
        </p>
      )}
    </div>
  )
}
