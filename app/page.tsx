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

// Belt styles using new palette
const beltStyles: Record<string, string> = {
  'White': 'bg-white text-[#052558] border-[#7C9FC9]',
  'Yellow': 'bg-yellow-400 text-yellow-950 border-yellow-500',
  'Green': 'bg-emerald-600 text-white border-emerald-700',
  'Brown': 'bg-amber-800 text-amber-50 border-amber-900',
  'Black': 'bg-[#011023] text-[#C2E8FF] border-[#527FB0]',
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

  const fuse = useMemo(() => new Fuse(allStudents, {
    keys: ['full_name', 'student_id'],
    threshold: 0.4,
    distance: 100,
  }), [allStudents])

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 8).map(result => result.item)
  }, [query, fuse])

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center pt-[12vh] px-4">

      {/* Hero Section */}
      <div className="text-center mb-10 animate-slideUp space-y-3">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
          <span style={{ background: 'linear-gradient(to right, #052558, #527FB0, #C2E8FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Student Directory
          </span>
        </h2>
        <p className="text-[var(--muted)] text-base md:text-lg max-w-md mx-auto">
          Search for students, achievements, and ranks across all dojos.
        </p>
      </div>

      {/* Main Search Bar */}
      <div className={`w-full max-w-2xl relative transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
        <div
          className="relative flex items-center w-full transition-all duration-300 rounded-xl"
          style={{
            background: 'var(--input-bg)',
            border: `2px solid ${isFocused ? '#527FB0' : 'var(--input-border)'}`,
            boxShadow: isFocused ? '0 0 0 4px rgba(82, 127, 176, 0.15), 0 4px 20px rgba(82, 127, 176, 0.1)' : '0 2px 8px rgba(1, 16, 35, 0.06)',
          }}
        >
          <div className="pl-5" style={{ color: 'var(--muted)' }}>
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
            placeholder="Search by name or ID..."
            className="w-full px-4 py-4 bg-transparent outline-none text-lg text-[var(--foreground)] placeholder:text-[var(--muted)]"
            autoComplete="off"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="pr-5 transition-colors duration-200"
              style={{ color: 'var(--muted)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Floating Results Panel */}
        {query && (
          <div
            className="absolute top-full left-0 right-0 mt-3 rounded-2xl border shadow-2xl overflow-hidden z-20 animate-fadeIn"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
          >
            {loading ? (
              <div className="p-4 text-center" style={{ color: 'var(--muted)' }}>Loading directory...</div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
                <p>No matches found for <span className="font-semibold text-[var(--foreground)]">&quot;{query}&quot;</span></p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto py-2">
                {results.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => router.push(`/student/${student.id}`)}
                    className="px-6 py-3.5 cursor-pointer flex items-center justify-between group transition-all duration-200 border-l-4 border-transparent"
                    style={{ borderLeftColor: 'transparent' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(194, 232, 255, 0.12)'
                      ;(e.currentTarget as HTMLDivElement).style.borderLeftColor = '#527FB0'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = ''
                      ;(e.currentTarget as HTMLDivElement).style.borderLeftColor = 'transparent'
                    }}
                  >
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[#527FB0]">
                        {student.full_name}
                      </h3>
                      <div className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                        <span>{student.student_id}</span>
                        <span className="w-1 h-1 rounded-full" style={{ background: 'var(--steel)' }}></span>
                        <span>{student.dojo}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${beltStyles[student.belt_rank] ?? 'bg-[#052558] text-[#C2E8FF] border-[#527FB0]'}`}>
                        {student.belt_rank}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div
              className="px-6 py-2 text-xs text-center border-t"
              style={{ background: 'rgba(82, 127, 176, 0.06)', borderColor: 'var(--card-border)', color: 'var(--muted)' }}
            >
              Showing top matches
            </div>
          </div>
        )}
      </div>

      {/* Idle State — shown when no search query */}
      {!query && (
        <div className="mt-20 animate-fadeIn text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-px" style={{ background: 'linear-gradient(to right, transparent, #527FB0)' }} />
            <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: 'var(--steel)' }}>
              Okinawa Shorin Kai
            </span>
            <div className="w-8 h-px" style={{ background: 'linear-gradient(to left, transparent, #527FB0)' }} />
          </div>
          <p className="text-[var(--muted)] text-sm max-w-xs mx-auto leading-relaxed">
            Type a student name or ID above to explore the directory and view achievements.
          </p>
          {/* Decorative dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: '#052558' }} />
            <span className="w-3 h-3 rounded-full animate-pulse-glow" style={{ background: '#527FB0', animationDelay: '0.3s' }} />
            <span className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: '#7C9FC9', animationDelay: '0.6s' }} />
          </div>
        </div>
      )}
    </div>
  )
}
