'use client'

import { FormEvent, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!email.trim()) {
            setError('Email is required.')
            setSuccess(null)
            return
        }

        setIsSubmitting(true)
        setError(null)
        setSuccess(null)

        try {
            const supabase = createBrowserSupabaseClient()
            const redirectTo = `${window.location.origin}/portal/reset-password`

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo,
            })

            if (resetError) {
                setError('Could not send reset email. Please try again.')
                return
            }

            setSuccess('Password reset email sent. Open the link in your inbox to set a new password.')
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
                        if (error) setError(null)
                    }}
                    placeholder="staff@example.com"
                    className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
                />
            </label>

            {error ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    {error}
                </div>
            ) : null}

            {success ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {success}
                </div>
            ) : null}

            <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            >
                {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
        </form>
    )
}
