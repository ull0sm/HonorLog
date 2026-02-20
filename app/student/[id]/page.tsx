'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

// ... interfaces remain same ...
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

// Belt styles using new palette
const beltBadges: Record<string, string> = {
  'White': 'bg-white border-2 border-[#7C9FC9] text-[#052558]',
  'Yellow': 'bg-yellow-400 border-2 border-yellow-500 text-yellow-950',
  'Green': 'bg-emerald-600 border-2 border-emerald-700 text-white',
  'Brown': 'bg-amber-800 border-2 border-amber-900 text-amber-50',
  'Black': 'bg-[#011023] border-2 border-[#527FB0] text-[#C2E8FF]',
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Link href="/" className="transition-colors duration-200 hover:underline" style={{ color: '#527FB0' }}>Return Home</Link>
        </div>
      </div>
    )
  }

  const medals = student.participations.flatMap(p => p.results)

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <div className="h-6"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium transition-colors duration-200 mb-8"
          style={{ color: '#527FB0' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#052558')}
          onMouseLeave={e => (e.currentTarget.style.color = '#527FB0')}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Search
        </Link>

        {/* Profile Card */}
        <div
          className="rounded-3xl border shadow-xl overflow-hidden mb-8"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        >
          {/* Banner gradient */}
          <div
            className="relative h-32"
            style={{ background: 'linear-gradient(135deg, #011023 0%, #052558 60%, #527FB0 100%)' }}
          />

          <div className="px-8 pb-8">
            <div className="flex justify-between items-end -mt-12 mb-6">
              {/* Avatar */}
              <div
                className="w-24 h-24 rounded-2xl p-1.5 shadow-lg rotate-3"
                style={{ background: '#052558' }}
              >
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center text-2xl font-bold"
                  style={{ background: '#011023', color: '#C2E8FF' }}
                >
                  {student.full_name.charAt(0)}
                </div>
              </div>
              {/* Belt badge */}
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm ${beltBadges[student.belt_rank] ?? 'bg-[#052558] text-[#C2E8FF] border-2 border-[#527FB0]'}`}>
                {student.belt_rank} Belt
              </div>
            </div>

            <h1 className="text-3xl font-bold text-[var(--foreground)]">{student.full_name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm font-medium" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                {student.student_id}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {student.dojo}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Events" value={student.participations.length} valueColor="#C2E8FF" bg="#011023" />
          <StatCard label="Gold" value={medals.filter(r => r.medal === 'GOLD').length} valueColor="#fbbf24" bg="#011023" />
          <StatCard label="Silver" value={medals.filter(r => r.medal === 'SILVER').length} valueColor="#7C9FC9" bg="#011023" />
          <StatCard label="Bronze" value={medals.filter(r => r.medal === 'BRONZE').length} valueColor="#fb923c" bg="#011023" />
        </div>

        {/* Timeline heading */}
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--foreground)]">
          <span className="w-1.5 h-6 rounded-full" style={{ background: '#527FB0' }}></span>
          Competition History
        </h2>

        {/* Timeline */}
        <div className="space-y-6 pl-4 ml-3" style={{ borderLeft: '2px solid var(--card-border)' }}>
          {student.participations.map((p) => (
            <div key={p.id} className="relative pl-8 pb-2 group">
              {/* Timeline Dot */}
              <div
                className="absolute -left-[9px] top-1 w-4 h-4 rounded-full group-hover:scale-125 transition-transform"
                style={{ background: 'var(--card-bg)', border: '4px solid #527FB0' }}
              />

              <div
                className="p-5 rounded-2xl border clean-shadow hover-shadow transition-all"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-lg leading-tight text-[var(--foreground)]">{p.events.name}</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{p.events.location}</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(82, 127, 176, 0.12)', color: 'var(--muted)' }}
                  >
                    {new Date(p.events.date).getFullYear()}
                  </span>
                </div>

                {/* Results */}
                <div className="flex flex-wrap gap-2">
                  {p.results.map(r => (
                    <div
                      key={r.id}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                        ${r.medal === 'GOLD'
                          ? 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-400'
                          : r.medal === 'SILVER'
                          ? 'border-[#7C9FC9] text-[#7C9FC9] dark:text-[#7C9FC9]'
                          : r.medal === 'BRONZE'
                          ? 'bg-orange-50 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400'
                          : 'border-[#527FB0] text-[#527FB0]'}
                      `}
                      style={r.medal === 'SILVER' ? { background: 'rgba(124, 159, 201, 0.1)' } : r.medal === 'PARTICIPATION' ? { background: 'rgba(82, 127, 176, 0.1)' } : undefined}
                    >
                      {r.medal !== 'PARTICIPATION' && <span>{r.medal === 'GOLD' ? '🥇' : r.medal === 'SILVER' ? '🥈' : '🥉'}</span>}
                      {r.category}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

function StatCard({ label, value, valueColor, bg }: { label: string, value: number, valueColor: string, bg: string }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center justify-center border transition-colors duration-200 hover:border-[#527FB0]"
      style={{ background: bg, borderColor: 'var(--card-border)' }}
    >
      <span className="text-2xl md:text-3xl font-black" style={{ color: valueColor }}>{value}</span>
      <span className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: '#7C9FC9' }}>{label}</span>
    </div>
  )
}
