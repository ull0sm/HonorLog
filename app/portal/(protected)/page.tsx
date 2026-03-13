import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getRegistrarAssignments, isAssignmentLive, isSuperAdmin, requirePortalSession } from '@/lib/portal/auth'

function formatEventDate(value: string) {
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value))
}

function getStatusTone(status: string) {
    if (status === 'active') {
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    }

    if (status === 'completed' || status === 'locked') {
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    }

    if (status === 'archived') {
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
    }

    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
}

export default async function PortalDashboardPage() {
    const { supabase, profile } = await requirePortalSession()

    // ── Registrar path ────────────────────────────────────────────────────
    if (!isSuperAdmin(profile)) {
        const assignments = await getRegistrarAssignments(supabase, profile.id)
        const liveAssignments = assignments.filter(isAssignmentLive)
        const expiredAssignments = assignments.filter(
            (a) => !isAssignmentLive(a) && a.expiresAt && new Date(a.expiresAt) < new Date(),
        )

        // Single live assignment — route directly into it
        if (liveAssignments.length === 1) {
            redirect(`/portal/events/${liveAssignments[0].eventId}/results`)
        }

        // Multiple live assignments — show picker (unusual v1 case)
        if (liveAssignments.length > 1) {
            return (
                <section className="panel p-6 sm:p-8">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        Multiple events
                    </div>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Choose your event
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                        Your account has active access to {liveAssignments.length} events. Select the one you are working on today.
                    </p>
                    <div className="mt-6 grid gap-3">
                        {liveAssignments.map((a) => (
                            <Link
                                key={a.accessId}
                                href={`/portal/events/${a.eventId}/results`}
                                className="panel-soft rounded-3xl px-5 py-5 transition-transform hover:-translate-y-0.5"
                            >
                                <div className="text-lg font-semibold text-foreground">{a.eventName}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {a.eventDate} · {a.eventLocation}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusTone(a.eventStatus)}`}>
                                        {a.eventStatus}
                                    </span>
                                    {a.resultsLocked ? (
                                        <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">
                                            Results locked
                                        </span>
                                    ) : null}
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )
        }

        // Expired-only — visible, not live
        if (expiredAssignments.length > 0 && liveAssignments.length === 0) {
            const expired = expiredAssignments[0]
            return (
                <section className="panel p-6 sm:p-8">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        Access expired
                    </div>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Your event access has expired
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        Your registrar access for <span className="font-semibold text-foreground">{expired.eventName}</span> expired on{' '}
                        {expired.expiresAt ? new Date(expired.expiresAt).toLocaleDateString('en-IN') : 'an unknown date'}.
                        Contact a super admin to renew your access if this event is still active.
                    </p>
                </section>
            )
        }

        // Disabled or no assignment at all
        const hasDisabled = assignments.some((a) => !a.isActive)
        return (
            <section className="panel p-6 sm:p-8">
                <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                    {hasDisabled ? 'Access disabled' : 'No event assigned'}
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {hasDisabled ? 'Your access has been disabled' : 'No event assigned to your account'}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    {hasDisabled
                        ? 'A super admin has disabled your access to this event. Contact your event administrator for assistance.'
                        : 'Your account is set up but has not been assigned to an event yet. A super admin needs to create your event access before you can enter results.'}
                </p>
            </section>
        )
    }

    const { data: events, error } = await supabase
        .from('events')
        .select('id, name, date, location, status, import_status, results_locked')
        .order('date', { ascending: false })

    const eventRows = events ?? []
    const totalEvents = eventRows.length
    const activeEvents = eventRows.filter((event) => event.status === 'active').length
    const lockedEvents = eventRows.filter((event) => event.results_locked).length
    const archivedEvents = eventRows.filter((event) => event.status === 'archived').length
    const latestEvents = eventRows.slice(0, 4)

    return (
        <div className="space-y-6">
            <section className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="max-w-2xl">
                        <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                            Super admin dashboard
                        </div>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Manage events from one internal workspace
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                            Welcome back, {profile.full_name || profile.email}. This shell is now reserved for super admins and shows the current event surface, status visibility, and the next management entry points.
                        </p>
                    </div>

                    <div className="grid min-w-[240px] gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                        <div className="surface-strong rounded-3xl px-4 py-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em]">Portal phase</div>
                            <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">Phase 3</div>
                            <div className="mt-1">Admin shell and role-gated event listing</div>
                        </div>
                        <div className="panel-soft rounded-3xl px-4 py-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">Next build surface</div>
                            <div className="mt-3 text-lg font-bold tracking-tight text-foreground">Event CRUD</div>
                            <div className="mt-1">Create, edit, archive, and lock flows</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="panel px-5 py-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total events</div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{totalEvents}</div>
                    <p className="mt-2 text-sm text-muted-foreground">All event rows currently visible to super admins.</p>
                </article>
                <article className="panel px-5 py-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active</div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{activeEvents}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Events currently marked active and ready for operations.</p>
                </article>
                <article className="panel px-5 py-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Locked</div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{lockedEvents}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Events with result entry currently locked.</p>
                </article>
                <article className="panel px-5 py-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Archived</div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{archivedEvents}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Past events kept for history and review.</p>
                </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <div className="panel p-6 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recent events</div>
                            <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Status overview</h3>
                        </div>
                        <Link href="/portal/events" className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
                            Open full list
                        </Link>
                    </div>

                    {error ? (
                        <div className="mt-5 rounded-3xl border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                            Event data could not be loaded. Check the Phase 1 migration and portal database connection.
                        </div>
                    ) : latestEvents.length === 0 ? (
                        <div className="mt-5 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                            No events exist yet. The admin shell is ready; event creation is scheduled for the next phase.
                        </div>
                    ) : (
                        <div className="mt-5 grid gap-3">
                            {latestEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/portal/events/${event.id}`}
                                    className="panel-soft rounded-3xl px-4 py-4 transition-transform hover:-translate-y-0.5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-lg font-semibold text-foreground">{event.name}</div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {formatEventDate(event.date)} · {event.location}
                                            </div>
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
                                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        Import status: {event.import_status}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <aside className="panel p-6 sm:p-7">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Navigation</div>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Next admin areas</h3>
                    <div className="mt-5 grid gap-3">
                        <Link href="/portal/events" className="panel-soft rounded-3xl px-4 py-4 text-sm text-foreground transition-colors hover:text-primary">
                            Browse events and monitor state
                        </Link>
                        <div className="rounded-3xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                            Access control will be connected in Phase 5.
                        </div>
                        <div className="rounded-3xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                            Audit review surfaces will arrive in Phase 10.
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    )
}
