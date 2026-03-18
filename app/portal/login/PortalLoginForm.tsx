'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function PortalLoginForm() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!email.trim() || !password) {
            setAuthError('Email and password are required.')
            return
        }

        setAuthError(null)
        setIsSubmitting(true)

        try {
            const supabase = createBrowserSupabaseClient()
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            if (error) {
                router.replace('/portal/login?error=invalid_credentials')
                router.refresh()
                return
            }

            router.replace('/portal')
            router.refresh()
        } catch {
            setAuthError('Could not reach the authentication service. Check your connection and try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="mt-6 space-y-4" aria-label="Portal login form" onSubmit={handleSubmit}>
            <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    Email
                </span>
                <input
                    type="email"
                    inputMode="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value)
                        if (authError) setAuthError(null)
                    }}
                    placeholder="staff@example.com"
                    className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
                />
            </label>

            <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    Password
                </span>
                <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                        setPassword(event.target.value)
                        if (authError) setAuthError(null)
                    }}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
                />
            </label>

            {authError ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    {authError}
                </div>
            ) : null}

            <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            >
                {isSubmitting ? 'Signing in...' : 'Sign in to portal'}
            </button>
        </form>
    )
}
