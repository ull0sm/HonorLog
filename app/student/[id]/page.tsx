'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface Student {
  id: string
  full_name: string
  student_id: string
  belt_rank: string
  dojo: string
  participations: Participation[]
}

interface Participation {
  id: string
  events: {
    name: string
    date: string
    location: string
  }
  results: Result[]
}

interface Result {
  id: string
  category: string
  medal: string
}

/* ─── Belt badge ─────────────────────────────────────────────── */
function BeltBadge({ belt, size = 'sm' }: { belt: string; size?: 'sm' | 'md' }) {
  const styles: Record<string, React.CSSProperties> = {
    White: { background: '#ffffff', color: '#111827', border: '1px solid rgba(148, 163, 184, 0.45)' },
    Yellow: { background: '#facc15', color: '#111827', border: '1px solid #eab308' },
    Green: { background: '#22c55e', color: '#052e16', border: '1px solid #16a34a' },
    Brown: { background: '#b45309', color: '#ffffff', border: '1px solid #92400e' },
    Black: { background: '#111827', color: '#ffffff', border: '1px solid #374151' },
  }
  const pad = size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1 text-[11px]'
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-[0.22em] ${pad} ${!styles[belt] ? 'bg-muted text-muted-foreground' : ''}`}
      style={styles[belt] ?? {}}
    >
      {belt} Belt
    </span>
  )
}

/* ─── Medal chip ─────────────────────────────────────────────── */
type MedalKey = 'GOLD' | 'SILVER' | 'BRONZE' | 'PARTICIPATION'

const MEDAL: Record<MedalKey, { icon: string; style: React.CSSProperties; className?: string }> = {
  GOLD: { icon: '🥇', style: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' } },
  SILVER: { icon: '🥈', style: { background: '#f4f4f5', color: '#52525b', border: '1px solid #d4d4d8' } },
  BRONZE: { icon: '🥉', style: { background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' } },
  PARTICIPATION: { icon: '', style: {}, className: 'bg-muted text-muted-foreground border border-border' },
}

/* ─── Stat card ──────────────────────────────────────────────── */
function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="stat-tile p-4 text-center sm:p-6">
      <div className={`text-4xl font-bold tabular-nums sm:text-5xl ${highlight && value > 0 ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground sm:text-sm">{label}</div>
    </div>
  )
}

/* ─── Loading spinner ────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <span
        className="w-5 h-5 rounded-full border-2 animate-spin border-muted border-t-primary"
      />
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function StudentProfile() {
  const { id } = useParams()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from('students')
      .select(`*, participations(id, events(name, date, location), results(id, category, medal))`)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error) setStudent(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <Spinner />

  if (!student) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center sm:px-6">
        <div className="panel px-8 py-10">
          <p className="text-base sm:text-lg text-muted-foreground">Profile not found.</p>
        </div>
        <Link
          href="/"
          className="text-base font-medium text-primary transition-colors hover:text-primary/80 sm:text-lg"
        >
          ← Back to search
        </Link>
      </div>
    )
  }

  const medals = student.participations.flatMap(p => p.results)
  const goldCount = medals.filter(r => r.medal === 'GOLD').length
  const silverCount = medals.filter(r => r.medal === 'SILVER').length
  const bronzeCount = medals.filter(r => r.medal === 'BRONZE').length
  const initials = student.full_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-12">

      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-accent"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to homepage
      </Link>

      <div className="panel p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-secondary text-3xl font-bold text-foreground ring-1 ring-border sm:h-24 sm:w-24 sm:text-4xl">
              {initials}
            </div>

            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                {student.full_name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>ID: {student.student_id}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {student.dojo}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:shrink-0">
            <BeltBadge belt={student.belt_rank} size="md" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Events" value={student.participations.length} />
          <StatCard label="Gold" value={goldCount} highlight />
          <StatCard label="Silver" value={silverCount} />
          <StatCard label="Bronze" value={bronzeCount} />
        </div>
      </div>

      {student.participations.length > 0 ? (
        <section className="panel p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Fight record</h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-6 space-y-4">
            {student.participations.map(p => {
              const year = new Date(p.events.date).getFullYear()
              return (
                <div key={p.id} className="panel-soft p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="rounded-full bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground ring-1 ring-border">
                          {year}
                        </span>
                        <h3 className="truncate text-lg font-bold text-foreground sm:text-xl">
                          {p.events.name}
                        </h3>
                      </div>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {p.events.location}
                      </p>
                    </div>

                    {p.results.length > 0 && (
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {p.results.map(r => {
                          const cfg = MEDAL[r.medal as MedalKey] ?? MEDAL.PARTICIPATION
                          return (
                            <span
                              key={r.id}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${cfg.className ?? ''}`}
                              style={cfg.style}
                            >
                              {cfg.icon && <span className="text-sm">{cfg.icon}</span>}
                              {r.category}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="panel px-6 py-10 text-sm text-muted-foreground">
          No competitions recorded yet.
        </div>
      )}
    </div>
  )
}
