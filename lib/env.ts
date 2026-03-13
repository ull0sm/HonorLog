type RequiredEnvKey = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

const REQUIRED_SUPABASE_ENV: RequiredEnvKey[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

function readRequiredEnv(key: RequiredEnvKey): string {
    const value = process.env[key]

    if (!value || value.trim().length === 0) {
        throw new Error(
            `[HonorLog] Missing required environment variable: ${key}. Add it to .env.local before running portal or public pages.`
        )
    }

    return value
}

export const env = {
    NEXT_PUBLIC_SUPABASE_URL: readRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
} as const

export function assertSupabaseEnv(): void {
    for (const key of REQUIRED_SUPABASE_ENV) {
        readRequiredEnv(key)
    }
}
