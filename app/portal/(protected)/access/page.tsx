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

export default async function PortalAccessHubPage() {
    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        redirect('/portal')
    }

    const { data: events, error } = await supabase
        .from('events')
        .select('id, name, date, location, status')
        .order('date', { ascending: false })

    const eventRows = events ?? []

    return (
        <section className="panel p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        Access control hub
                    </div>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Choose an event to manage registrar access
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                        Access control is managed per event. Pick an event below to open its access page.
                    </p>
                </div>

                <Link href="/portal/events" className="rounded-full border border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
                    Back to events
                </Link>
            </div>

            {error ? (
                <div className="mt-6 rounded-3xl border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                    Could not load events. Please check your database connection and try again.
                </div>
            ) : eventRows.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                    No events found. Create an event first, then return here to assign registrars.
                </div>
            ) : (
                <div className="mt-6 grid gap-3">
                    {eventRows.map((event) => (
                        <Link
                            key={event.id}
                            href={`/portal/events/${event.id}/access`}
                            className="panel-soft rounded-3xl px-5 py-4 transition-transform hover:-translate-y-0.5"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="text-lg font-semibold text-foreground">{event.name}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {formatEventDate(event.date)} · {event.location}
                                    </div>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusTone(event.status)}`}>
                                    {event.status}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}
