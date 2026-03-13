import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type PortalProfile = {
    id: string
    email: string
    full_name: string | null
    global_role: 'super_admin' | 'staff'
    is_active: boolean
}

export type RegistrarAssignment = {
    accessId: string
    eventId: string
    eventName: string
    eventDate: string
    eventLocation: string
    eventStatus: string
    resultsLocked: boolean
    importStatus: string
    isActive: boolean
    expiresAt: string | null
}

/**
 * For a staff (registrar) user, resolves their event assignments.
 * Returns the structured assignment rows with event data joined in.
 */
export async function getRegistrarAssignments(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
): Promise<RegistrarAssignment[]> {
    const { data: rows } = await supabase
        .from('event_access')
        .select('id, event_id, is_active, expires_at')
        .eq('user_id', userId)
        .eq('role', 'event_registrar')
        .order('created_at', { ascending: true })

    if (!rows || rows.length === 0) return []

    const eventIds = rows.map((r: { event_id: string }) => r.event_id)

    const { data: events } = await supabase
        .from('events')
        .select('id, name, date, location, status, results_locked, import_status')
        .in('id', eventIds)

    const eventMap: Record<string, {
        id: string
        name: string
        date: string
        location: string
        status: string
        results_locked: boolean
        import_status: string
    }> = {}

    for (const e of (events ?? [])) {
        eventMap[e.id] = e
    }

    return rows
        .filter((r: { event_id: string }) => eventMap[r.event_id])
        .map((r: { id: string; event_id: string; is_active: boolean; expires_at: string | null }) => {
            const event = eventMap[r.event_id]
            return {
                accessId: r.id,
                eventId: r.event_id,
                eventName: event.name,
                eventDate: event.date,
                eventLocation: event.location,
                eventStatus: event.status,
                resultsLocked: event.results_locked,
                importStatus: event.import_status,
                isActive: r.is_active,
                expiresAt: r.expires_at,
            }
        })
}

/**
 * Checks whether a staff user has active, non-expired access to a specific event.
 * Returns the matching RegistrarAssignment or null.
 */
export async function getRegistrarEventAccess(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    eventId: string,
): Promise<RegistrarAssignment | null> {
    const assignments = await getRegistrarAssignments(supabase, userId)
    const match = assignments.find((a) => a.eventId === eventId) ?? null
    return match
}

/**
 * Returns true if the assignment is currently active and not expired.
 */
export function isAssignmentLive(assignment: RegistrarAssignment): boolean {
    if (!assignment.isActive) return false
    if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) return false
    return true
}

export async function requirePortalSession() {
    const supabase = await createServerSupabaseClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/portal/login?reason=expired')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, global_role, is_active')
        .eq('id', user.id)
        .maybeSingle<PortalProfile>()

    if (!profile) {
        await supabase.auth.signOut()
        redirect('/portal/login?reason=no_profile')
    }

    if (!profile.is_active) {
        await supabase.auth.signOut()
        redirect('/portal/login?reason=inactive')
    }

    return {
        supabase,
        user,
        profile,
    }
}

export function isSuperAdmin(profile: PortalProfile) {
    return profile.global_role === 'super_admin'
}