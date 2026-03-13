import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()

    return NextResponse.redirect(new URL('/portal/login?reason=signed_out', request.url))
}
