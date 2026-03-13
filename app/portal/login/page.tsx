import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PortalLoginForm from './PortalLoginForm'

type PortalLoginPageProps = {
    searchParams?: Promise<{
        reason?: string
        error?: string
    }>
}

function getReasonMessage(reason?: string, error?: string) {
    if (error === 'invalid_credentials') {
        return 'Email or password is incorrect. Please try again.'
    }

    if (reason === 'expired') {
        return 'Your session expired. Please sign in again.'
    }

    if (reason === 'no_profile') {
        return 'Your account does not have a portal profile yet. Contact an administrator.'
    }

    if (reason === 'inactive') {
        return 'Your account is inactive. Contact an administrator.'
    }

    if (reason === 'signed_out') {
        return 'You have been signed out successfully.'
    }

    return null
}

export default async function PortalLoginPage({ searchParams }: PortalLoginPageProps) {
    const resolvedParams = await searchParams
    const reason = resolvedParams?.reason
    const error = resolvedParams?.error

    const supabase = await createServerSupabaseClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, is_active')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.is_active) {
            redirect('/portal')
        }

        await supabase.auth.signOut()
    }

    const reasonMessage = getReasonMessage(reason, error)

    return (
        <section className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-7xl items-center px-4 py-14 sm:px-6 sm:py-20">
            <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div className="max-w-2xl">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        Internal portal
                    </div>
                    <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        HonorLog operations access
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                        This portal is reserved for staff workflows such as event administration, registrar access, controlled imports, and result entry. The public student directory remains separate and unchanged.
                    </p>
                    <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                        <div className="panel-soft p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Admin access</div>
                            <p className="mt-2 leading-6">
                                Full event management, imports, staff access control, and review workflows.
                            </p>
                        </div>
                        <div className="panel-soft p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Registrar access</div>
                            <p className="mt-2 leading-6">
                                Event-scoped result entry only, with no access to global settings or unrelated events.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="panel mx-auto w-full max-w-md p-6 sm:p-7">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Sign in
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                        Portal login
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        One login flow is shared for super admins and event registrars. Access scope is enforced after sign in.
                    </p>

                    {reasonMessage ? (
                        <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground">
                            {reasonMessage}
                        </div>
                    ) : null}

                    <PortalLoginForm />
                </div>
            </div>
        </section>
    )
}