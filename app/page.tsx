'use client'

import { useState, useEffect, useMemo } from 'react'
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
    White: { background: '#ffffff', color: '#111827', border: '1px solid rgba(148, 163, 184, 0.45)' },
    Yellow: { background: '#facc15', color: '#111827', border: '1px solid #eab308' },
    Green: { background: '#22c55e', color: '#052e16', border: '1px solid #16a34a' },
    Brown: { background: '#b45309', color: '#ffffff', border: '1px solid #92400e' },
    Black: { background: '#111827', color: '#ffffff', border: '1px solid #374151' },
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.22em] uppercase"
      style={styles[belt] ?? {}}
    >
      {belt} belt
    </span>
  )
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'primary' }) {
  return (
    <div className="panel p-6 text-center">
      <div className={`text-3xl font-bold tracking-tight ${tone === 'primary' ? 'text-primary' : 'text-foreground'}`}>{value}</div>
      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
    </div>
  )
}

function SearchResultCard({ student, onOpen }: { student: Student; onOpen: (id: string) => void }) {
  const initials = student.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <button
      onClick={() => onOpen(student.id)}
      className="panel w-full p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-foreground ring-1 ring-border">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-foreground transition-colors hover:text-primary">
              {student.full_name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{student.student_id}</span>
              <span>•</span>
              <span className="truncate">{student.dojo}</span>
            </div>
          </div>
        </div>
        <BeltBadge belt={student.belt_rank} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="panel-soft px-3 py-3">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Student ID</div>
          <div className="mt-2 font-semibold text-foreground">{student.student_id}</div>
        </div>
        <div className="panel-soft px-3 py-3 sm:col-span-2">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Dojo</div>
          <div className="mt-2 font-semibold text-foreground">{student.dojo}</div>
        </div>
      </div>
    </button>
  )
}

export default function Home() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

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

  const totalDojos = useMemo(() => new Set(allStudents.map(student => student.dojo)).size, [allStudents])
  const beltCounts = useMemo(() => {
    return allStudents.reduce<Record<string, number>>((accumulator, student) => {
      accumulator[student.belt_rank] = (accumulator[student.belt_rank] ?? 0) + 1
      return accumulator
    }, {})
  }, [allStudents])

  return (
    <div className="min-h-[calc(100dvh-4.5rem)]">
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="animate-enter text-center">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            HonorLog
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.32em] text-muted-foreground sm:text-base">
            Okinawa Shorin Kai
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Search the student directory, find profiles instantly, and review belt rank and competition history without leaving one portal.
          </p>
        </div>

        <div id="search" className="mx-auto mt-12 max-w-2xl animate-enter">
          <div className="panel relative px-5 py-3 sm:px-6 sm:py-4">
            <svg className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search by student name or ID"
              className="w-full bg-transparent pl-8 pr-24 text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-lg"
              autoComplete="off"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {!query && (
          <div className="mt-16 space-y-10">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Students" value={allStudents.length} tone="primary" />
              <StatCard label="Dojos" value={totalDojos} />
              <StatCard label="Black belts" value={beltCounts.Black ?? 0} />
              <StatCard label="Brown belts" value={beltCounts.Brown ?? 0} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="panel p-8">
                <div className="inline-flex rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Instant student search
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Search profiles, not spreadsheets</h2>
                <p className="mt-4 max-w-2xl text-muted-foreground">
                  HonorLog lets staff search by full name or student ID and open a clean profile with belt rank, dojo, event count, and medal history in a few seconds.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="panel-soft p-4">
                    <div className="text-sm font-semibold text-foreground">Fuzzy search</div>
                    <p className="mt-2 text-sm text-muted-foreground">Handles partial names and student IDs.</p>
                  </div>
                  <div className="panel-soft p-4">
                    <div className="text-sm font-semibold text-foreground">Live directory</div>
                    <p className="mt-2 text-sm text-muted-foreground">Student records are loaded directly from Supabase.</p>
                  </div>
                  <div className="panel-soft p-4">
                    <div className="text-sm font-semibold text-foreground">Profile handoff</div>
                    <p className="mt-2 text-sm text-muted-foreground">Open a detailed record with one click.</p>
                  </div>
                </div>
              </div>

              <div className="panel p-6">
                <p className="text-sm font-semibold text-foreground">Directory snapshot</p>
                <div className="mt-5 space-y-3">
                  {loading ? (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Loading students…
                    </div>
                  ) : allStudents.slice(0, 3).map(student => (
                    <div key={student.id} className="panel-soft flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-foreground">{student.full_name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{student.student_id} • {student.dojo}</div>
                      </div>
                      <BeltBadge belt={student.belt_rank} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {query && (
          <div className="mt-12">
            {loading ? (
              <div className="panel flex items-center justify-center gap-3 px-6 py-10 text-muted-foreground">
                <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Loading directory…
              </div>
            ) : results.length === 0 ? (
              <div className="panel px-6 py-12 text-center">
                <p className="text-lg font-semibold text-foreground">No students found</p>
                <p className="mt-2 text-sm text-muted-foreground">Try a different name, student ID, or spelling variation for “{query}”.</p>
              </div>
            ) : (
              <>
                <div className="mb-5 text-sm text-muted-foreground">
                  {results.length} result{results.length === 1 ? '' : 's'} found
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {results.map(student => (
                    <SearchResultCard key={student.id} student={student} onOpen={(id) => router.push(`/student/${id}`)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
