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
      className={`inline-flex items-center rounded font-medium ${pad}`}
      style={styles[belt] ?? { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
    >
      {belt} Belt
    </span>
  )
}

/* ─── Medal chip ─────────────────────────────────────────────── */
type MedalKey = 'GOLD' | 'SILVER' | 'BRONZE' | 'PARTICIPATION'

const MEDAL: Record<MedalKey, { icon: string; style: React.CSSProperties }> = {
  GOLD:          { icon: '🥇', style: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' } },
  SILVER:        { icon: '🥈', style: { background: '#f4f4f5', color: '#52525b', border: '1px solid #d4d4d8' } },
  BRONZE:        { icon: '🥉', style: { background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' } },
  PARTICIPATION: { icon: '',   style: { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' } },
}

/* ─── Stat card ──────────────────────────────────────────────── */
function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="rounded-lg p-4 text-center"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="text-2xl font-bold tabular-nums"
        style={{ color: highlight && value > 0 ? '#d97706' : 'var(--text)' }}
      >
        {value}
      </div>
      <div className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

/* ─── Loading spinner ────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <span
        className="w-5 h-5 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Profile not found.</p>
        <Link
          href="/"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-enter">

      {/* ── Back ── */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* ── Profile header ── */}
      <div className="flex items-start gap-4">
        {/* Avatar initials */}
        <div
          className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold select-none"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--text)' }}>
              {student.full_name}
            </h1>
            <BeltBadge belt={student.belt_rank} size="md" />
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
            <span
              className="text-xs font-mono px-1.5 py-px rounded"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {student.student_id}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{student.dojo}</span>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: 'var(--border)' }} />

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Events"  value={student.participations.length} />
        <StatCard label="Gold"    value={goldCount}   highlight />
        <StatCard label="Silver"  value={silverCount} />
        <StatCard label="Bronze"  value={bronzeCount} />
      </div>

      {/* ── Competition history ── */}
      {student.participations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Competition History
          </h2>

          {student.participations.map(p => {
            const year = new Date(p.events.date).getFullYear()
            return (
              <div
                key={p.id}
                className="rounded-lg p-4 transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)')}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')}
              >
                {/* Event header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
                      {p.events.name}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {p.events.location}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-xs font-mono px-1.5 py-px rounded"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    {year}
                  </span>
                </div>

                {/* Result chips */}
                {p.results.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.results.map(r => {
                      const cfg = MEDAL[r.medal as MedalKey] ?? MEDAL.PARTICIPATION
                      return (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={cfg.style}
                        >
                          {cfg.icon && <span>{cfg.icon}</span>}
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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No competitions recorded yet.
        </p>
      )}
    </div>
  )
}
