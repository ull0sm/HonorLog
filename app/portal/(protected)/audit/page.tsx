import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isSuperAdmin, requirePortalSession } from '@/lib/portal/auth'

type AuditRow = {
    id: string
    actor_user_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    event_id: string | null
    before_state: Record<string, unknown> | null
    after_state: Record<string, unknown> | null
    created_at: string
}

type PortalAuditPageProps = {
    searchParams?: Promise<Record<string, string | undefined>>
}

export default async function PortalAuditPage({ searchParams }: PortalAuditPageProps) {
    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        redirect('/portal')
    }

    const query = await searchParams
    const actionFilter = (query?.action ?? '').trim().toLowerCase()
    const eventFilter = (query?.eventId ?? '').trim()
    const q = (query?.q ?? '').trim().toLowerCase()

    const { data: rawLogs } = await supabase
        .from('audit_logs')
        .select('id, actor_user_id, action, entity_type, entity_id, event_id, before_state, after_state, created_at')
        .order('created_at', { ascending: false })
        .limit(250)

    const logs = (rawLogs ?? []) as AuditRow[]

    const actorIds = [...new Set(logs.map((row) => row.actor_user_id).filter(Boolean))] as string[]
    const eventIds = [...new Set(logs.map((row) => row.event_id).filter(Boolean))] as string[]

    const actorMap: Record<string, { full_name: string | null; email: string | null }> = {}
    const eventMap: Record<string, { name: string }> = {}

    if (actorIds.length > 0) {
        const { data: actors } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', actorIds)

        for (const row of actors ?? []) {
            actorMap[row.id] = {
                full_name: row.full_name,
                email: row.email,
            }
        }
    }

    if (eventIds.length > 0) {
        const { data: events } = await supabase
            .from('events')
            .select('id, name')
            .in('id', eventIds)

        for (const row of events ?? []) {
            eventMap[row.id] = { name: row.name }
        }
    }

    const filteredLogs = logs.filter((row) => {
        if (actionFilter && !row.action.toLowerCase().includes(actionFilter)) return false
        if (eventFilter && row.event_id !== eventFilter) return false

        if (!q) return true

        const actor = row.actor_user_id ? actorMap[row.actor_user_id] : null
        const event = row.event_id ? eventMap[row.event_id] : null
        const haystack = [
            row.action,
            row.entity_type,
            row.entity_id ?? '',
            actor?.full_name ?? '',
            actor?.email ?? '',
            event?.name ?? '',
        ]
            .join(' ')
            .toLowerCase()

        return haystack.includes(q)
    })

    return (
        <section className="space-y-6">
            <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                            Audit review
                        </div>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Portal audit history
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                            Review who changed what and when across event creation, access control, imports, results, and locking operations.
                        </p>
                    </div>
                    <Link
                        href="/portal"
                        className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Back to dashboard
                    </Link>
                </div>

                <form className="mt-6 grid gap-3 rounded-2xl border border-border/70 bg-background/60 p-4 sm:grid-cols-3" method="get">
                    <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Action filter</span>
                        <input
                            name="action"
                            defaultValue={query?.action ?? ''}
                            placeholder="e.g. results_lock_toggled"
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Event id</span>
                        <input
                            name="eventId"
                            defaultValue={query?.eventId ?? ''}
                            placeholder="UUID"
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Search</span>
                        <input
                            name="q"
                            defaultValue={query?.q ?? ''}
                            placeholder="action, actor, event"
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                    </label>
                    <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
                        <button type="submit" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground">
                            Apply filters
                        </button>
                        <Link href="/portal/audit" className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
                            Clear
                        </Link>
                    </div>
                </form>
            </div>

            <div className="panel p-6 sm:p-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Entries</div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{filteredLogs.length} log entries</h3>

                {filteredLogs.length === 0 ? (
                    <div className="mt-5 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                        No audit entries match the current filters.
                    </div>
                ) : (
                    <div className="mt-5 space-y-3">
                        {filteredLogs.map((row) => {
                            const actor = row.actor_user_id ? actorMap[row.actor_user_id] : null
                            const event = row.event_id ? eventMap[row.event_id] : null

                            return (
                                <article key={row.id} className="rounded-2xl border border-border bg-background/60 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-sm font-semibold text-foreground">{row.action}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(row.created_at).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        Entity: <span className="font-medium text-foreground">{row.entity_type}</span>
                                        {row.entity_id ? ` · ${row.entity_id}` : ''}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Actor:{' '}
                                        <span className="font-medium text-foreground">
                                            {actor?.full_name || actor?.email || row.actor_user_id || 'system'}
                                        </span>
                                        {actor?.email ? ` · ${actor.email}` : ''}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Event:{' '}
                                        <span className="font-medium text-foreground">
                                            {event?.name || row.event_id || 'N/A'}
                                        </span>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}
