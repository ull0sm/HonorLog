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
    White:  { background: '#f4f4f5', color: '#52525b', border: '1px solid #d4d4d8' },
    Yellow: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
    Green:  { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
    Brown:  { background: '#ffedd5', color: '#7c2d12', border: '1px solid #fdba74' },
    Black:  { background: '#18181b', color: '#f4f4f5', border: '1px solid #3f3f46' },
  }
  const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center font-black uppercase tracking-widest border-2 border-foreground ${pad} ${!styles[belt] ? 'bg-muted text-muted-foreground' : ''}`}
      style={styles[belt] ?? {}}
    >
      {belt} Belt
    </span>
  )
}

/* ─── Medal chip ─────────────────────────────────────────────── */
type MedalKey = 'GOLD' | 'SILVER' | 'BRONZE' | 'PARTICIPATION'

const MEDAL: Record<MedalKey, { icon: string; style: React.CSSProperties; className?: string }> = {
  GOLD:          { icon: '🥇', style: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' } },
  SILVER:        { icon: '🥈', style: { background: '#f4f4f5', color: '#52525b', border: '1px solid #d4d4d8' } },
  BRONZE:        { icon: '🥉', style: { background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' } },
  PARTICIPATION: { icon: '',   style: {}, className: 'bg-muted text-muted-foreground border border-border' },
}

/* ─── Stat card ──────────────────────────────────────────────── */
function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="bg-card athletic-shadow-sm p-4 sm:p-6 text-center border-t-4"
      style={{ borderTopColor: highlight && value > 0 ? 'var(--color-primary)' : 'var(--color-foreground)' }}
    >
      <div
        className={`text-4xl sm:text-5xl font-black tabular-nums ${highlight && value > 0 ? 'text-primary' : 'text-foreground'}`}
      >
        {value}
      </div>
      <div className="text-xs sm:text-sm mt-2 font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-base sm:text-lg text-muted-foreground">Profile not found.</p>
        <Link
          href="/"
          className="text-base sm:text-lg transition-colors hover:text-primary/80 font-medium text-primary"
        >
          ← Back to search
        </Link>
      </div>
    )
  }

  const medals      = student.participations.flatMap(p => p.results)
  const goldCount   = medals.filter(r => r.medal === 'GOLD').length
  const silverCount = medals.filter(r => r.medal === 'SILVER').length
  const bronzeCount = medals.filter(r => r.medal === 'BRONZE').length
    const initials    = student.full_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10 animate-enter">

      {/* ── Back ── */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background font-black uppercase tracking-widest text-sm hover:bg-primary hover:text-primary-foreground transition-colors border-2 border-foreground athletic-active"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        BACK TO HOMEPAGE
      </Link>

      {/* ── Profile header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b-4 border-foreground pb-8">
        {/* Avatar initials */}
        <div
          className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-primary text-primary-foreground border-4 border-foreground athletic-shadow-sm flex items-center justify-center text-3xl sm:text-4xl font-black select-none"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1 w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-6xl font-black leading-none uppercase tracking-tighter text-foreground">
                {student.full_name}
              </h1>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mt-2">
                <span
                  className="text-sm font-bold uppercase tracking-widest px-2 py-1 bg-muted border-2 border-foreground text-foreground"
                >
                  ID: {student.student_id}
                </span>
                <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {student.dojo}
                </span>
              </div>
            </div>
            <div className="mt-2 sm:mt-0">
              <BeltBadge belt={student.belt_rank} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider removed, handled by border-b-4 above ── */}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Events"  value={student.participations.length} />
        <StatCard label="Gold"    value={goldCount}   highlight />
        <StatCard label="Silver"  value={silverCount} />
        <StatCard label="Bronze"  value={bronzeCount} />
      </div>

      {/* ── Competition history ── */}
      {student.participations.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
              Fight Record
            </h2>
            <div className="h-1 flex-1 bg-foreground opacity-20" />
          </div>

          {student.participations.map(p => {
            const year = new Date(p.events.date).getFullYear()
            return (
              <div
                key={p.id}
                className="bg-card athletic-shadow-sm p-6 flex flex-col sm:flex-row gap-6 sm:items-center justify-between"
              >
                {/* Event header */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="shrink-0 text-xs font-black uppercase tracking-widest px-2 py-1 bg-foreground text-background border-2 border-foreground"
                    >
                      {year}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black uppercase leading-none text-foreground truncate">
                      {p.events.name}
                    </h3>
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {p.events.location}
                  </p>
                </div>

                {/* Result chips */}
                {p.results.length > 0 && (
                  <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
                    {p.results.map(r => {
                      const cfg = MEDAL[r.medal as MedalKey] ?? MEDAL.PARTICIPATION
                      return (
                        <span
                          key={r.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-foreground ${cfg.className ?? ''}`}
                          style={cfg.style}
                        >
                          {cfg.icon && <span className="text-base">{cfg.icon}</span>}
                          {r.category}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          No competitions recorded yet.
        </p>
      )}
    </div>
  )
}
