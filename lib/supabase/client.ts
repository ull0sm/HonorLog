import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

let browserSupabase: ReturnType<typeof createBrowserClient> | null = null

export function createBrowserSupabaseClient() {
    if (!browserSupabase) {
        browserSupabase = createBrowserClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
    }

    return browserSupabase
}
