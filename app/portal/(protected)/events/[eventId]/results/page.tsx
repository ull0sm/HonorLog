import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
    getRegistrarEventAccess,
    isAssignmentLive,
    isSuperAdmin,
    requirePortalSession,
} from '@/lib/portal/auth'

function getStatusTone(status: string) {
    if (status === 'active') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    if (status === 'completed' || status === 'locked') return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    if (status === 'archived') return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
}

type PortalEventResultsPageProps = {
    params: Promise<{ eventId: string }>
    searchParams?: Promise<Record<string, string | undefined>>
}

export default async function PortalEventResultsPage({ params }: PortalEventResultsPageProps) {
    const { eventId } = await params
    const { supabase, profile } = await requirePortalSession()
    const superAdmin = isSuperAdmin(profile)

    // ── Registrar access gate ──────────────────────────────────────────────
    // Registrars must have an active, non-expired assignment for THIS specific event.
    // Accessing another event's URL returns a clear denied state rather than 404
    // to avoid leaking whether the event exists.
    if (!superAdmin) {
        const assignment = await getRegistrarEventAccess(supabase, profile.id, eventId)

        if (!assignment) {
            return (
                <section className="panel p-6 sm:p-8">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        Access denied
                    </div>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        You do not have access to this event
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        Your registrar account is not assigned to this event. If you believe this is an error, contact a super admin.
                    </p>
                    <Link
                        href="/portal"
                        className="mt-6 inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Back to my event
                    </Link>
                </section>
            )
        }

        if (!isAssignmentLive(assignment)) {
            const isExpired = assignment.expiresAt && new Date(assignment.expiresAt) < new Date()
            return (
                <section className="panel p-6 sm:p-8">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        {isExpired ? 'Access expired' : 'Access disabled'}
                    </div>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        {isExpired ? 'Your access has expired' : 'Your access has been disabled'}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        {isExpired
                            ? `Your access for this event expired on ${new Date(assignment.expiresAt!).toLocaleDateString('en-IN')}. Contact a super admin to renew it.`
                            : 'A super admin has disabled your access to this event. Contact your event administrator for assistance.'}
                    </p>
                </section>
            )
        }
    }

    // ── Event data fetch ───────────────────────────────────────────────────
    // Both super admin and verified registrar reach this point.
    const { data: event } = await supabase
        .from('events')
        .select('id, name, date, location, status, results_locked, import_status')
        .eq('id', eventId)
        .maybeSingle()

    if (!event) notFound()

    const isLocked = event.results_locked || event.status === 'locked'

    return (
        <section className="space-y-6">
            {/* ── Event header + tab nav ─────────────────────────────────── */}
            <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                            {superAdmin ? 'Phase 6 · Event results' : 'Registrar workspace'}
                        </div>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            {event.name}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                            {event.date} · {event.location}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusTone(event.status)}`}>
                            {event.status}
                        </span>
                        {event.results_locked ? (
                            <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">
                                Results locked
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Tab nav — admin sees all four tabs; registrar sees results only */}
                <nav className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                    {superAdmin ? (
                        <>
                            <Link
                                href={`/portal/events/${eventId}`}
                                className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Overview
                            </Link>
                            <Link
                                href={`/portal/events/${eventId}/access`}
                                className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Access
                            </Link>
                            <Link
                                href={`/portal/events/${eventId}/import`}
                                className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Import
                            </Link>
                        </>
                    ) : null}
                    <Link
                        href={`/portal/events/${eventId}/results`}
                        className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-foreground"
                    >
                        Results
                    </Link>
                </nav>
            </div>

            {/* ── Locked event banner ────────────────────────────────────── */}
            {isLocked ? (
                <div className="panel border-rose-500/40 bg-rose-500/5 px-5 py-4 sm:px-6">
                    <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                        Results are locked for this event. No edits can be made. Contact a super admin if you believe this is incorrect.
                    </p>
                </div>
            ) : null}

            {/* ── Results placeholder ────────────────────────────────────── */}
            <div className="panel p-6 sm:p-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Prize entry
                </div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    {isLocked ? 'Results (read-only)' : 'Enter results'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {isLocked
                        ? 'This event is locked. Viewing is still available once result records exist, but no new entries or edits are permitted.'
                        : 'Category-level result entry will be available here once the prize entry workflow is implemented in Phase 9. This shell is your confirmed entry point — the registrar routing, access enforcement, and locked-event state are all live.'}
                </p>
                <div className="mt-5 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-center text-sm text-muted-foreground">
                    No result records yet. Phase 9 will add category listing and placement entry here.
                </div>
            </div>
        </section>
    )
}
