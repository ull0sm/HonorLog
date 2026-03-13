import Link from 'next/link'
import { isSuperAdmin, requirePortalSession } from '@/lib/portal/auth'

export default async function PortalProtectedLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const { user, profile } = await requirePortalSession()
    const superAdmin = isSuperAdmin(profile)

    return (
        <div className="space-y-6">
            <header className="panel px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {superAdmin ? 'HonorLog admin portal' : 'HonorLog internal portal'}
                        </div>
                        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                            {superAdmin ? 'Super admin workspace' : 'Portal access restricted'}
                        </h1>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Signed in as {profile.full_name || user.email || 'portal user'} ({profile.global_role})
                        </p>
                    </div>

                    <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {superAdmin ? (
                            <>
                                <Link href="/portal" className="rounded-full border border-border px-3 py-1.5 transition-colors hover:text-foreground">
                                    Dashboard
                                </Link>
                                <Link href="/portal/events" className="rounded-full border border-border px-3 py-1.5 transition-colors hover:text-foreground">
                                    Events
                                </Link>
                                <span className="rounded-full border border-dashed border-border px-3 py-1.5 text-muted-foreground/80">
                                    Access
                                </span>
                                <span className="rounded-full border border-dashed border-border px-3 py-1.5 text-muted-foreground/80">
                                    Audit
                                </span>
                            </>
                        ) : null}
                        <Link href="/portal/logout" className="rounded-full border border-border px-3 py-1.5 transition-colors hover:text-foreground">
                            Logout
                        </Link>
                    </nav>
                </div>
            </header>

            {superAdmin ? (
                children
            ) : (
                <section className="panel p-6 sm:p-8">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        Access denied
                    </div>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Super admin access is required
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        Your account is signed in correctly, but this dashboard is reserved for super admins only. Registrar-specific views will be added in a later phase.
                    </p>
                    <div className="mt-6 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                        Current role: <span className="font-semibold text-foreground">{profile.global_role}</span>
                    </div>
                </section>
            )}
        </div>
    )
}
