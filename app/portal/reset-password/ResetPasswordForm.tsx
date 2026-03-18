'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function ResetPasswordForm() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        async function checkRecoverySession() {
            const supabase = createBrowserSupabaseClient()
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!active) return

            if (!session) {
                setError('This reset link is invalid or expired. Request a new password reset email.')
            }

            setReady(true)
        }

        void checkRecoverySession()

        return () => {
            active = false
        }
    }, [])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const supabase = createBrowserSupabaseClient()
            const { error: updateError } = await supabase.auth.updateUser({ password })

            if (updateError) {
                setError('Could not update password. Request a new reset link and try again.')
                return
            }

            router.replace('/portal/login?reason=password_updated')
            router.refresh()
        } catch {
            setError('Could not contact authentication service. Check your connection and try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    New password
                </span>
                <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                        setPassword(event.target.value)
                        if (error) setError(null)
                    }}
                    placeholder="At least 8 characters"
                    className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
                />
            </label>

            <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    Confirm password
                </span>
                <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        if (error) setError(null)
                    }}
                    placeholder="Re-enter new password"
                    className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
                />
            </label>

            {error ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    {error}
                </div>
            ) : null}

            <button
                type="submit"
                disabled={!ready || isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            >
                {!ready ? 'Checking link...' : isSubmitting ? 'Updating...' : 'Update password'}
            </button>
        </form>
    )
}
