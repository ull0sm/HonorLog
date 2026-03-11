'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabaseClient'

interface Student {
  id: string
  full_name: string
  student_id: string
  belt_rank: string
  dojo: string
}

interface Metric {
  label: string
  value: number
  accent?: boolean
}

const scoreboardHeadingSize = 'text-[clamp(1.5rem,4.0vw,4.4rem)]'

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
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em]"
      style={styles[belt] ?? {}}
    >
      {belt} belt
    </span>
  )
}

function CountUpNumber({ value, active }: { value: number; active: boolean }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!active) {
      return
    }

    let frameId = 0
    const duration = 1400
    const startTime = performance.now()

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(value * eased))

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)

    return () => window.cancelAnimationFrame(frameId)
  }, [active, value])

  return <>{displayValue.toLocaleString()}</>
}

function ScoreboardSection({ metrics, active }: { metrics: Metric[]; active: boolean }) {
  return (
    <div className="panel relative overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:30px_30px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Data dashboard
        </div>
        <h2 className={`mx-auto mt-4 max-w-full whitespace-nowrap font-bold tracking-tight text-foreground ${scoreboardHeadingSize}`}>
          Every student. Every dojo. Every belt.
        </h2>
        <h2 className={`mx-auto mt-1 max-w-full whitespace-nowrap font-bold tracking-tight text-foreground ${scoreboardHeadingSize}`}>
          One dashboard!
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          HonorLog turns the entire organization into one clean readout, so staff can see the full shape of the dojo network, competition footprint, and belt ladder at a glance.
        </p>
      </div>

      <div className="relative z-10 mx-auto mt-8 grid max-w-4xl gap-2.5 sm:mt-9">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-background/30 px-4 py-3.5 backdrop-blur-sm sm:grid-cols-[200px_minmax(0,1fr)_auto] sm:px-5 sm:py-4"
          >
            <div className="min-w-0 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
              {metric.label}
            </div>
            <div className="hidden h-px w-full bg-gradient-to-r from-border/20 via-border/70 to-transparent sm:block" />
            <div className={`text-right font-mono text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl ${metric.accent ? 'text-primary' : 'text-foreground'}`}>
              <CountUpNumber value={metric.value} active={active} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EntryDeskPromo() {
  return (
    <div className="panel relative overflow-hidden px-5 py-6 sm:px-6 sm:py-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_top,rgba(239,68,68,0.14),transparent_28%),radial-gradient(circle_at_left_bottom,rgba(16,185,129,0.12),transparent_30%)]" />
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-400">
            Event registration platform
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Need coach and organizer workflows too?
          </h3>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Move to EntryDesk.
          </h3>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            EntryDesk handles event registration end-to-end: organizers create and manage events, coaches manage students, and participation flows into one clean operations dashboard.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <a
            href="https://entrydesk.shorinkai.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Open EntryDesk
            <span className="shrink-0 text-base leading-none" aria-hidden="true">↗</span>
          </a>
          <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            For events, coaches, organizers
          </span>
        </div>
      </div>
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
  const statsRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [eventCount, setEventCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statsVisible, setStatsVisible] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase
        .from('students')
        .select('id, full_name, student_id, belt_rank, dojo')
        .order('full_name'),
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true }),
    ]).then(([studentsResponse, eventsResponse]) => {
      if (!studentsResponse.error) {
        setAllStudents(studentsResponse.data ?? [])
      }

      if (!eventsResponse.error) {
        setEventCount(eventsResponse.count ?? 0)
      }

      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const node = statsRef.current

    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const focusSearchFromHash = () => {
      if (window.location.hash !== '#search' && window.location.hash !== '#search-input') {
        return
      }

      window.requestAnimationFrame(() => {
        searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        searchInputRef.current?.focus()
      })
    }

    focusSearchFromHash()
    window.addEventListener('hashchange', focusSearchFromHash)

    return () => window.removeEventListener('hashchange', focusSearchFromHash)
  }, [])

  const fuse = useMemo(
    () => new Fuse(allStudents, { keys: ['full_name', 'student_id'], threshold: 0.35, distance: 100 }),
    [allStudents]
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 8).map((result) => result.item)
  }, [query, fuse])

  const totalDojos = useMemo(() => new Set(allStudents.map((student) => student.dojo)).size, [allStudents])
  const beltCounts = useMemo(() => {
    return allStudents.reduce<Record<string, number>>((accumulator, student) => {
      accumulator[student.belt_rank] = (accumulator[student.belt_rank] ?? 0) + 1
      return accumulator
    }, {})
  }, [allStudents])

  const metrics = useMemo<Metric[]>(() => [
    { label: 'Students', value: allStudents.length, accent: true },
    { label: 'Dojos', value: totalDojos },
    { label: 'Events', value: eventCount },
    { label: 'Black belts', value: beltCounts.Black ?? 0 },
    { label: 'Brown belts', value: beltCounts.Brown ?? 0 },
    { label: 'Green belts', value: beltCounts.Green ?? 0 },
    { label: 'Yellow belts', value: beltCounts.Yellow ?? 0 },
    { label: 'White belts', value: beltCounts.White ?? 0 },
  ], [allStudents.length, beltCounts, eventCount, totalDojos])

  return (
    <div className="min-h-[calc(100dvh-4.5rem)]">
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="animate-enter text-center">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            HonorLog
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.18em] text-muted-foreground sm:text-base">
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
              id="search-input"
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="panel p-8">
                <div className="inline-flex rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
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
                  ) : allStudents.slice(0, 3).map((student) => (
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

            <div ref={statsRef}>
              <ScoreboardSection metrics={metrics} active={statsVisible && !loading} />
            </div>

            <EntryDeskPromo />
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
                  {results.map((student) => (
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
