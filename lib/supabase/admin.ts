import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client authenticated with the service role key.
 * This client bypasses Row Level Security and can call auth.admin APIs.
 *
 * SECURITY: Only call this from server-side code (Server Components, Server Actions,
 * Route Handlers). Never expose the service role key to the browser.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
export function createAdminSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
        throw new Error(
            '[HonorLog] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both required for admin user management. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.'
        )
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
