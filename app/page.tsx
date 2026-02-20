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

// Minimalist belt tags
const beltStyles: Record<string, string> = {
  'White': 'bg-gray-100 text-gray-700 border-gray-200',
  'Yellow': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Green': 'bg-green-50 text-green-700 border-green-200',
  'Brown': 'bg-amber-50 text-amber-800 border-amber-200',
  'Black': 'bg-neutral-900 text-white border-neutral-800',
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
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center pt-[15vh] px-4">
      
      {/* Search Header - Google Style */}
      <div className="text-center mb-8 animate-fadeIn space-y-4">
         <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--foreground)]">
          <span className="text-[var(--karate-green)]">Student</span> Profile
        </h2>
         <p className="text-[var(--muted)] text-lg">
          Search for students, achievements, and ranks
        </p>
      </div>

      {/* Main Search Bar */}
      <div className={`w-full max-w-2xl relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
        <div className={`
          relative flex items-center w-full
          bg-[var(--input-bg)] 
          border-2 transition-colors duration-300 rounded-full
          ${isFocused ? 'border-[var(--karate-green)] shadow-lg ring-4 ring-[var(--karate-yellow)]/40 dark:ring-[var(--karate-green)]/30' : 'border-[var(--input-border)] hover:shadow-md'}
        `}>
          <div className="pl-6 text-[var(--muted)]">
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
            className="w-full px-4 py-4 bg-transparent outline-none text-lg text-[var(--foreground)] placeholder:text-gray-400"
            autoComplete="off"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="pr-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Floating Results Panel */}
        {query && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-xl overflow-hidden z-20 animate-fadeIn">
            {loading ? (
              <div className="p-4 text-center text-[var(--muted)]">Loading directory...</div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-[var(--muted)]">
                <p>No matches found for <span className="font-semibold text-[var(--foreground)]">&quot;{query}&quot;</span></p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto py-2">
                {results.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => router.push(`/student/${student.id}`)}
                    className="px-6 py-3.5 hover:bg-[var(--karate-yellow)]/20 dark:hover:bg-[var(--karate-green)]/20 cursor-pointer flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--karate-green)] transition-colors">
                        {student.full_name}
                      </h3>
                      <div className="text-sm text-[var(--muted)] flex items-center gap-2">
                         <span>{student.student_id}</span>
                         <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                         <span>{student.dojo}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${beltStyles[student.belt_rank]}`}>
                        {student.belt_rank}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
             <div className="px-6 py-2 bg-[var(--karate-yellow)]/20 dark:bg-[var(--karate-green)]/20 text-xs text-center text-[var(--muted)] border-t border-[var(--card-border)]">
               Showing top matches
            </div>
          </div>
        )}
      </div>

      {/* Decorative Branding - Subtle */}
      {!query && (
        <div className="mt-20 opacity-30 pointer-events-none select-none">
          <div className="w-24 h-24 rounded-full border-4 border-[var(--karate-green)] flex items-center justify-center">
             <div className="w-20 h-20 rounded-full border-4 border-[var(--karate-yellow)]"></div>
          </div>
        </div>
      )}
    </div>
  )
}
