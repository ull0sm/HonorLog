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

// Minimal modern belt styles
const beltBadges: Record<string, string> = {
  'White': 'bg-white border-2 border-slate-200 text-slate-700',
  'Yellow': 'bg-yellow-400 border-2 border-yellow-400 text-yellow-950',
  'Green': 'bg-green-500 border-2 border-green-500 text-white',
  'Brown': 'bg-amber-800 border-2 border-amber-800 text-amber-50',
  'Black': 'bg-black border-2 border-black text-white',
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

  if (loading) return null // Clean loading state (or minimal spinner if preferred)
  
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Link href="/" className="text-[var(--karate-green)] hover:underline">Return Home</Link>
        </div>
      </div>
    )
  }

  const medals = student.participations.flatMap(p => p.results)

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {/* Navbar area placeholder height */}
      <div className="h-6"></div> 

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Navigation */}
        <Link href="/" className="inline-flex items-center text-sm font-medium text-[var(--muted)] hover:text-[var(--karate-green)] transition-colors mb-8 rounded-full border border-[var(--card-border)] px-3 py-1.5 bg-[var(--card-bg)]/70">
           <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           Back to Search
        </Link>
        
        {/* Profile Card */}
        <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--card-border)] clean-shadow overflow-hidden mb-8">
          <div className="relative h-32 bg-gradient-to-r from-[var(--karate-green)] to-[var(--karate-yellow)]">
             {/* Abstract Pattern overlay could go here */}
          </div>
          
          <div className="px-8 pb-8">
             <div className="flex justify-between items-end -mt-12 mb-6">
                <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-lg rotate-3">
                   {/* Avatar Placeholder: Initials */}
                   <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-2xl font-bold text-slate-400">
                      {student.full_name.charAt(0)}
                   </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm ${beltBadges[student.belt_rank]}`}>
                   {student.belt_rank} Belt
                </div>
             </div>

             <h1 className="text-3xl font-bold text-[var(--foreground)]">{student.full_name}</h1>
             <div className="flex items-center gap-4 text-[var(--muted)] mt-2 text-sm font-medium">
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
           <StatCard 
             label="Events" 
             value={student.participations.length} 
             color="text-slate-700 dark:text-slate-200"
             bg="bg-slate-50 dark:bg-slate-900"
           />
           <StatCard 
             label="Gold" 
             value={medals.filter(r => r.medal === 'GOLD').length} 
             color="text-yellow-600"
             bg="bg-yellow-50 dark:bg-yellow-900/20"
           />
           <StatCard 
             label="Silver" 
             value={medals.filter(r => r.medal === 'SILVER').length} 
             color="text-slate-500"
             bg="bg-slate-50 dark:bg-slate-800/40"
           />
           <StatCard 
             label="Bronze" 
             value={medals.filter(r => r.medal === 'BRONZE').length} 
             color="text-orange-600"
             bg="bg-orange-50 dark:bg-orange-900/20"
           />
        </div>

        {/* Timeline */}
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
           <span className="w-1.5 h-6 bg-[var(--karate-green)] rounded-full"></span>
           Competition History
        </h2>
        
        <div className="space-y-6 pl-4 border-l-2 border-[var(--card-border)] ml-3">
          {student.participations.map((p) => (
             <div key={p.id} className="relative pl-8 pb-2 group">
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-4 border-[var(--karate-green)] rounded-full group-hover:scale-125 transition-transform"></div>
                
                <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--card-border)] clean-shadow hover-shadow transition-all">
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                      <div>
                         <h3 className="font-bold text-lg leading-tight">{p.events.name}</h3>
                         <p className="text-sm text-[var(--muted)] mt-1">{p.events.location}</p>
                      </div>
                      <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md text-[var(--muted)]">
                         {new Date(p.events.date).getFullYear()}
                      </span>
                   </div>

                   {/* Results */}
                   <div className="flex flex-wrap gap-2">
                      {p.results.map(r => (
                         <div key={r.id} className={`
                            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                            ${r.medal === 'GOLD' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400' : 
                              r.medal === 'SILVER' ? 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300' :
                              r.medal === 'BRONZE' ? 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400' :
                              'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400'}
                         `}>
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

function StatCard({ label, value, color, bg }: { label: string, value: number, color: string, bg: string }) {
   return (
      <div className={`${bg} rounded-2xl p-4 flex flex-col items-center justify-center border border-transparent hover:border-[var(--card-border)] transition-colors`}>
         <span className={`text-2xl md:text-3xl font-black ${color}`}>{value}</span>
         <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mt-1">{label}</span>
      </div>
   )
}
