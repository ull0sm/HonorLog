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

const beltStyles: Record<string, string> = {
  White: 'bg-gray-100 text-gray-700 border-gray-200',
  Yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Green: 'bg-green-50 text-green-700 border-green-200',
  Brown: 'bg-amber-50 text-amber-800 border-amber-200',
  Black: 'bg-neutral-900 text-white border-neutral-800',
}

export default function Home() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    async function fetchStudents() {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, student_id, belt_rank, dojo')
        .order('full_name')

      if (error) {
        console.error(error)
      } else {
        setAllStudents(data || [])
      }
      setLoading(false)
    }
    fetchStudents()
  }, [])

  const fuse = useMemo(
    () =>
      new Fuse(allStudents, {
        keys: ['full_name', 'student_id'],
        threshold: 0.4,
        distance: 100,
      }),
    [allStudents]
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 8).map((result) => result.item)
  }, [query, fuse])
  const searchInputClass = isFocused
    ? 'border-[var(--ring)] shadow-lg ring-4 ring-[var(--accent-soft)]/35 dark:ring-[var(--accent-soft)]/20'
    : 'border-[var(--input-border)] hover:border-[var(--ring)]'
  const searchInputWrapperClass = `relative flex items-center w-full bg-[var(--input-bg)] border transition-colors duration-300 rounded-2xl ${searchInputClass}`

  return (
    <div className="app-backdrop min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto w-full max-w-6xl animate-fadeIn space-y-6">
        <section className="panel glass clean-shadow rounded-3xl p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Student Performance Cloud</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[var(--foreground)] md:text-5xl">
                Reimagined <span className="text-[var(--accent)]">Student Directory</span>
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] md:text-base text-[var(--muted)]">
                A fully refactored interface with sharper hierarchy, faster discovery flow, and cleaner profile navigation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <QuickStat label="Profiles" value={allStudents.length.toString()} />
              <QuickStat label="Engine" value="Fuse.js" />
              <QuickStat label="Source" value="Supabase" />
              <QuickStat label="Mode" value="Live" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="panel glass clean-shadow rounded-3xl p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">Search Students</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-alt)] px-2.5 py-1 text-xs text-[var(--muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                Ready
              </span>
            </div>

            <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.005]' : ''}`}>
              <div className={searchInputWrapperClass}>
                <div className="pl-5 text-[var(--muted)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Search student name or ID (SK-0001)"
                  className="w-full px-4 py-4 bg-transparent outline-none text-lg text-[var(--foreground)] placeholder:text-[var(--muted)]/70"
                  autoComplete="off"
                  autoFocus
                />
                {query && (
                  <button onClick={() => setQuery('')} className="pr-5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {query && (
                <div className="absolute top-full left-0 right-0 mt-3 panel glass rounded-2xl overflow-hidden z-20 animate-fadeIn clean-shadow">
                  {loading ? (
                    <div className="p-4 text-center text-[var(--muted)]">Loading directory...</div>
                  ) : results.length === 0 ? (
                    <div className="p-8 text-center text-[var(--muted)]">
                      <p>
                        No matches found for <span className="font-semibold text-[var(--foreground)]">&quot;{query}&quot;</span>
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto py-2">
                      {results.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => router.push(`/student/${student.id}`)}
                          className="w-full px-5 py-3 text-left hover:bg-[var(--accent-soft)]/35 dark:hover:bg-[var(--accent-soft)]/12 flex items-center justify-between group transition-colors"
                        >
                          <div>
                            <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{student.full_name}</h3>
                            <div className="text-sm text-[var(--muted)] flex items-center gap-2">
                              <span>{student.student_id}</span>
                              <span className="w-1 h-1 rounded-full bg-[var(--card-border)]" />
                              <span>{student.dojo}</span>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${beltStyles[student.belt_rank]}`}>{student.belt_rank}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="px-5 py-2 text-xs text-center text-[var(--muted)] border-t border-[var(--card-border)] bg-[var(--surface-alt)]">
                    Showing top matches
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="panel glass clean-shadow rounded-3xl p-5 md:p-6">
            <p className="text-sm font-semibold text-[var(--foreground)]">Directory Highlights</p>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <li className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-alt)] p-3">Unified view of students, belt ranks, and dojo affiliations.</li>
              <li className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-alt)] p-3">Fast fuzzy search for names and IDs with instant suggestions.</li>
              <li className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-alt)] p-3">Profile pages with timeline history and medal stats.</li>
            </ul>
          </aside>
        </section>
      </div>
    </div>
  )
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-alt)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[var(--foreground)]">{value}</p>
    </div>
  )
}
