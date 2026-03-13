import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type PortalProfile = {
    id: string
    email: string
    full_name: string | null
    global_role: 'super_admin' | 'staff'
    is_active: boolean
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