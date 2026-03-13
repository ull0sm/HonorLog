import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isSuperAdmin, requirePortalSession } from '@/lib/portal/auth'

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

export default async function PortalEventsPage() {
    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        redirect('/portal')
    }

    const { data: events, error } = await supabase
        .from('events')
        .select('id, name, date, location, status, import_status, results_locked, slug')
        .order('date', { ascending: false })

    const eventRows = events ?? []

    return (
        <section className="panel p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        Admin event listing
                    </div>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Event statuses and operational readiness
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                        This table is the super admin entry point for monitoring event state before CRUD, access-control, and import workflows land in later phases.
                    </p>
                </div>

                <Link href="/portal/events/new" className="rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground">
                    Create event
                </Link>
            </div>

            {error ? (
                <div className="mt-6 rounded-3xl border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                    Event data could not be loaded. Confirm the Phase 1 migration ran successfully and the portal session has database access.
                </div>
            ) : eventRows.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                    No events are available yet. When Phase 4 is implemented, new events created by super admins will appear here with status and lock indicators.
                </div>
            ) : (
                <div className="mt-6 overflow-hidden rounded-3xl border border-border/70">
                    <div className="grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-4 border-b border-border/70 bg-background/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <div>Event</div>
                        <div>Date and location</div>
                        <div>Status</div>
                        <div>Workflow</div>
                    </div>

                    <div className="divide-y divide-border/70">
                        {eventRows.map((event) => (
                            <Link
                                key={event.id}
                                href={`/portal/events/${event.id}`}
                                className="grid grid-cols-1 gap-4 px-4 py-4 transition-colors hover:bg-background/50 md:grid-cols-[minmax(0,2.3fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]"
                            >
                                <div>
                                    <div className="text-base font-semibold text-foreground">{event.name}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {event.slug ? `Slug: ${event.slug}` : 'Slug not assigned yet'}
                                    </div>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <div>{formatEventDate(event.date)}</div>
                                    <div className="mt-1">{event.location}</div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusTone(event.status)}`}>
                                        {event.status}
                                    </span>
                                    {event.results_locked ? (
                                        <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">
                                            Locked
                                        </span>
                                    ) : null}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <div>Import: {event.import_status}</div>
                                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">Open details</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}
