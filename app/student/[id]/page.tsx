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

const beltBadges: Record<string, string> = {
  White: 'bg-white border border-slate-200 text-slate-700',
  Yellow: 'bg-yellow-200 border border-yellow-300 text-yellow-900',
  Green: 'bg-emerald-500 border border-emerald-500 text-white',
  Brown: 'bg-amber-700 border border-amber-700 text-amber-50',
  Black: 'bg-black border border-black text-white',
}

const medalStyles: Record<string, string> = {
  GOLD: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400',
  SILVER: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300',
  BRONZE: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400',
  PARTICIPATION: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400',
}

export default function StudentProfile() {
  const { id } = useParams()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStudent() {
      if (!id) return
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          participations (
            id,
            events (name, date, location),
            results (id, category, medal)
          )
        `)
        .eq('id', id)
        .single()

      if (!error) setStudent(data)
      setLoading(false)
    }
    fetchStudent()
  }, [id])

  if (loading) return null

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="panel glass clean-shadow max-w-md rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Link href="/" className="inline-flex rounded-full border border-[var(--card-border)] bg-[var(--surface-alt)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  const medals = student.participations.flatMap((p) => p.results)

  return (
    <div className="app-backdrop min-h-screen pb-16 px-4 py-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-alt)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Search
          </Link>
          <span className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${beltBadges[student.belt_rank]}`}>{student.belt_rank} Belt</span>
        </div>

        <section className="panel glass clean-shadow rounded-3xl overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-[var(--accent)] via-[var(--ring)] to-[var(--accent-soft)]" />
          <div className="px-6 pb-6 md:px-8 md:pb-8">
            <div className="-mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] text-3xl font-black text-[var(--accent)] clean-shadow">
                  {student.full_name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">{student.full_name}</h1>
                  <p className="mt-1 text-sm text-[var(--muted)]">{student.student_id} · {student.dojo}</p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                Active Profile
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Events" value={student.participations.length} />
          <StatCard label="Gold" value={medals.filter((r) => r.medal === 'GOLD').length} />
          <StatCard label="Silver" value={medals.filter((r) => r.medal === 'SILVER').length} />
          <StatCard label="Bronze" value={medals.filter((r) => r.medal === 'BRONZE').length} />
        </section>

        <section className="panel glass clean-shadow rounded-3xl p-5 md:p-6">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-[var(--foreground)]">
            <span className="h-6 w-1.5 rounded-full bg-[var(--accent)]" />
            Competition Timeline
          </h2>
          <div className="space-y-4">
            {student.participations.map((p) => (
              <article key={p.id} className="hover-shadow rounded-2xl border border-[var(--card-border)] bg-[var(--surface-alt)] p-4">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--foreground)]">{p.events.name}</h3>
                    <p className="text-sm text-[var(--muted)]">{p.events.location}</p>
                  </div>
                  <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {new Date(p.events.date).getFullYear()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.results.map((r) => (
                    <span
                      key={r.id}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${medalStyles[r.medal] || medalStyles.PARTICIPATION}`}
                    >
                      {r.medal !== 'PARTICIPATION' && <span aria-hidden>{r.medal === 'GOLD' ? '🥇' : r.medal === 'SILVER' ? '🥈' : '🥉'}</span>}
                      {r.category}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel glass clean-shadow rounded-2xl p-4 text-center">
      <p className="text-3xl font-black text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
    </div>
  )
}
