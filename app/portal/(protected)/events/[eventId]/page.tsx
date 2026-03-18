import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import {
    getRegistrarEventAccess,
    isSuperAdmin,
    requirePortalSession,
} from '@/lib/portal/auth'
import { writeAuditLogSafe } from '@/lib/portal/audit'

const EVENT_STATUSES = ['draft', 'active', 'completed', 'locked', 'archived'] as const

function sanitizeSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

function isValidDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
    }

    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime())
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

function buildDetailRedirect(eventId: string, params: Record<string, string>) {
    const search = new URLSearchParams(params)
    return `/portal/events/${eventId}?${search.toString()}`
}

async function updateEventAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        redirect('/portal')
    }

    const eventId = String(formData.get('eventId') ?? '').trim()
    const name = String(formData.get('name') ?? '').trim()
    const location = String(formData.get('location') ?? '').trim()
    const date = String(formData.get('date') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const status = String(formData.get('status') ?? '').trim()
    const slugInput = String(formData.get('slug') ?? '').trim()
    const slug = sanitizeSlug(slugInput)
    const confirmArchive = String(formData.get('confirmArchive') ?? '') === 'yes'

    if (!eventId) {
        redirect('/portal/events')
    }

    const persistable = {
        name,
        location,
        date,
        description,
        status,
        slug: slugInput,
    }

    if (!name) {
        redirect(buildDetailRedirect(eventId, { ...persistable, error: 'missing_name' }))
    }

    if (!location) {
        redirect(buildDetailRedirect(eventId, { ...persistable, error: 'missing_location' }))
    }

    if (!date) {
        redirect(buildDetailRedirect(eventId, { ...persistable, error: 'missing_date' }))
    }

    if (!isValidDate(date)) {
        redirect(buildDetailRedirect(eventId, { ...persistable, error: 'invalid_date' }))
    }

    if (!EVENT_STATUSES.includes(status as (typeof EVENT_STATUSES)[number])) {
        redirect(buildDetailRedirect(eventId, { ...persistable, error: 'invalid_status' }))
    }

    const { data: existing } = await supabase
        .from('events')
        .select('id, name, location, date, description, slug, status, results_locked')
        .eq('id', eventId)
        .maybeSingle()

    if (!existing) {
        redirect('/portal/events')
    }

    if (existing.status === 'locked' && status !== 'locked') {
        redirect(buildDetailRedirect(eventId, { ...persistable, error: 'locked_status_change' }))
    }

    if (status === 'archived' && !confirmArchive) {
        redirect(buildDetailRedirect(eventId, { ...persistable, error: 'archive_confirm_required' }))
    }

    const { error } = await supabase
        .from('events')
        .update({
            name,
            location,
            date,
            description: description || null,
            status,
            slug: slug || null,
        })
        .eq('id', eventId)

    if (error) {
        if (error.code === '23505') {
            redirect(buildDetailRedirect(eventId, { ...persistable, error: 'duplicate_slug' }))
        }

        redirect(buildDetailRedirect(eventId, { ...persistable, error: 'save_failed' }))
    }

    await writeAuditLogSafe(supabase, {
        actorUserId: profile.id,
        action: 'event_updated',
        entityType: 'event',
        entityId: eventId,
        eventId,
        beforeState: {
            name: existing.name,
            location: existing.location,
            date: existing.date,
            description: existing.description,
            slug: existing.slug,
            status: existing.status,
            results_locked: existing.results_locked,
        },
        afterState: {
            name,
            location,
            date,
            description: description || null,
            slug: slug || null,
            status,
            results_locked: existing.results_locked,
        },
    })

    revalidatePath('/portal/audit')
    revalidatePath('/portal')
    revalidatePath('/portal/events')
    revalidatePath(`/portal/events/${eventId}`)
    redirect(`/portal/events/${eventId}?saved=1`)
}

async function deleteEventAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        redirect('/portal')
    }

    const eventId = String(formData.get('eventId') ?? '').trim()
    const confirmDelete = String(formData.get('confirmDelete') ?? '').trim()

    if (!eventId) {
        redirect('/portal/events')
    }

    const { data: existing } = await supabase
        .from('events')
        .select('id, name, status')
        .eq('id', eventId)
        .maybeSingle()

    if (!existing) {
        redirect('/portal/events')
    }

    if (existing.status === 'locked') {
        redirect(buildDetailRedirect(eventId, { error: 'locked_delete_blocked' }))
    }

    if (confirmDelete !== existing.name) {
        redirect(buildDetailRedirect(eventId, { error: 'delete_confirm_required' }))
    }

    const { error } = await supabase.from('events').delete().eq('id', eventId)

    if (error) {
        redirect(buildDetailRedirect(eventId, { error: 'delete_failed' }))
    }

    await writeAuditLogSafe(supabase, {
        actorUserId: profile.id,
        action: 'event_deleted',
        entityType: 'event',
        entityId: eventId,
        eventId,
        beforeState: {
            id: existing.id,
            name: existing.name,
            status: existing.status,
        },
    })

    revalidatePath('/portal/audit')

    revalidatePath('/portal')
    revalidatePath('/portal/events')
    redirect('/portal/events?deleted=1')
}

async function toggleResultsLockAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        redirect('/portal')
    }

    const eventId = String(formData.get('eventId') ?? '').trim()
    const expected = String(formData.get('expected') ?? '').trim()
    const confirmation = String(formData.get('confirmation') ?? '').trim().toUpperCase()

    if (!eventId) {
        redirect('/portal/events')
    }

    const { data: existing } = await supabase
        .from('events')
        .select('id, name, status, results_locked')
        .eq('id', eventId)
        .maybeSingle<{ id: string; name: string; status: string; results_locked: boolean }>()

    if (!existing) {
        redirect('/portal/events')
    }

    const targetLock = expected === 'lock'

    if (targetLock && confirmation !== 'LOCK') {
        redirect(buildDetailRedirect(eventId, { error: 'lock_confirm_required' }))
    }

    if (!targetLock && confirmation !== 'UNLOCK') {
        redirect(buildDetailRedirect(eventId, { error: 'unlock_confirm_required' }))
    }

    const { error } = await supabase
        .from('events')
        .update({ results_locked: targetLock })
        .eq('id', eventId)

    if (error) {
        redirect(buildDetailRedirect(eventId, { error: 'lock_toggle_failed' }))
    }

    await writeAuditLogSafe(supabase, {
        actorUserId: profile.id,
        action: 'results_lock_toggled',
        entityType: 'event',
        entityId: eventId,
        eventId,
        beforeState: { results_locked: existing.results_locked },
        afterState: { results_locked: targetLock },
    })

    revalidatePath('/portal/events')
    revalidatePath(`/portal/events/${eventId}`)
    revalidatePath(`/portal/events/${eventId}/results`)
    revalidatePath('/portal/audit')
    redirect(buildDetailRedirect(eventId, { success: targetLock ? 'locked_results' : 'unlocked_results' }))
}

type PortalEventDetailPageProps = {
    params: Promise<{ eventId: string }>
    searchParams?: Promise<Record<string, string | undefined>>
}

export default async function PortalEventDetailPage({ params, searchParams }: PortalEventDetailPageProps) {
    const { eventId } = await params
    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        // Registrars have only the results tab — send them there directly.
        // We still verify they have any assignment for this event first so a
        // random URL manipulation doesn't leak the event's existence.
        const assignment = await getRegistrarEventAccess(supabase, profile.id, eventId)
        redirect(assignment ? `/portal/events/${eventId}/results` : '/portal')
    }

    const { data: event } = await supabase
        .from('events')
        .select('id, name, slug, date, location, description, status, import_status, results_locked')
        .eq('id', eventId)
        .maybeSingle()

    if (!event) {
        notFound()
    }

    const query = await searchParams
    const error = query?.error

    const values = {
        name: query?.name ?? event.name,
        location: query?.location ?? event.location,
        date: query?.date ?? event.date,
        description: query?.description ?? event.description ?? '',
        status: query?.status ?? event.status,
        slug: query?.slug ?? event.slug ?? '',
    }

    const isError = (code: string) => error === code

    return (
        <section className="space-y-6">
            <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                            Phase 4 · Event detail
                        </div>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{event.name}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                            Manage event metadata and workflow status. Access, import, and result tabs are linked below for upcoming phases.
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
                        <span className="rounded-full bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Import: {event.import_status}
                        </span>
                    </div>
                </div>

                <nav className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                    <Link href={`/portal/events/${eventId}`} className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-foreground">
                        Overview
                    </Link>
                    <Link href={`/portal/events/${eventId}/access`} className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
                        Access
                    </Link>
                    <Link href={`/portal/events/${eventId}/import`} className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
                        Import
                    </Link>
                    <Link href={`/portal/events/${eventId}/results`} className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
                        Results
                    </Link>
                </nav>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <form action={updateEventAction} className="panel p-6 sm:p-8">
                    <input type="hidden" name="eventId" value={event.id} />
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Edit metadata</div>
                    <div className="mt-5 grid gap-5">
                        <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Event name</span>
                            <input name="name" defaultValue={values.name} className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none" />
                            {isError('missing_name') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Event name is required.</p> : null}
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Location</span>
                            <input name="location" defaultValue={values.location} className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none" />
                            {isError('missing_location') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Location is required.</p> : null}
                        </label>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Date</span>
                                <input name="date" type="date" defaultValue={values.date} className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none" />
                                {isError('missing_date') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Date is required.</p> : null}
                                {isError('invalid_date') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Use a valid date value.</p> : null}
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Slug (optional)</span>
                                <input name="slug" defaultValue={values.slug} className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none" />
                                {isError('duplicate_slug') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">This slug is already in use.</p> : null}
                            </label>
                        </div>

                        <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Status</span>
                            <select name="status" defaultValue={values.status} className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none">
                                {EVENT_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                            {isError('invalid_status') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Choose a valid status.</p> : null}
                            {isError('locked_status_change') ? (
                                <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Locked events cannot be moved to another status.</p>
                            ) : null}
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Description (optional)</span>
                            <textarea
                                name="description"
                                defaultValue={values.description}
                                rows={4}
                                className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            />
                        </label>

                        <label className="inline-flex items-start gap-2 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                            <input type="checkbox" name="confirmArchive" value="yes" className="mt-0.5 h-4 w-4 rounded border-border" />
                            <span>I confirm this status update if I choose archived.</span>
                        </label>

                        {(isError('archive_confirm_required') || isError('save_failed')) ? (
                            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                                {isError('archive_confirm_required')
                                    ? 'Archiving is destructive. Confirm archive to continue.'
                                    : 'Could not save event changes. Please try again.'}
                            </div>
                        ) : null}

                        {(isError('lock_confirm_required') || isError('unlock_confirm_required') || isError('lock_toggle_failed')) ? (
                            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                                {isError('lock_confirm_required')
                                    ? 'Type LOCK to confirm finalizing results.'
                                    : isError('unlock_confirm_required')
                                        ? 'Type UNLOCK to confirm reopening result edits.'
                                        : 'Result lock toggle failed. Please retry.'}
                            </div>
                        ) : null}

                        {query?.saved ? (
                            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                Event updated successfully.
                            </div>
                        ) : null}

                        {query?.created ? (
                            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                Event created successfully.
                            </div>
                        ) : null}

                        {(query?.success === 'locked_results' || query?.success === 'unlocked_results') ? (
                            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                {query?.success === 'locked_results'
                                    ? 'Results are now locked. Registrar edits are blocked.'
                                    : 'Results are now unlocked. Registrar edits are allowed again.'}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3">
                            <button type="submit" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground">
                                Save changes
                            </button>
                            <Link href="/portal/events" className="rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
                                Back to events
                            </Link>
                        </div>
                    </div>
                </form>

                <aside className="panel p-6 sm:p-8">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Result lock control</div>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                        {event.results_locked ? 'Unlock result entry' : 'Lock result entry'}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {event.results_locked
                            ? 'Unlocking allows registrar users to resume editing placements and medals for this event.'
                            : 'Locking finalizes event results and prevents further registrar edits. Use once review is complete.'}
                    </p>

                    <form action={toggleResultsLockAction} className="mt-5 grid gap-4 border-b border-border/60 pb-6">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="expected" value={event.results_locked ? 'unlock' : 'lock'} />
                        <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                                Type {event.results_locked ? 'UNLOCK' : 'LOCK'} to confirm
                            </span>
                            <input
                                name="confirmation"
                                className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                                placeholder={event.results_locked ? 'UNLOCK' : 'LOCK'}
                            />
                        </label>
                        <button
                            type="submit"
                            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white ${event.results_locked ? 'bg-amber-600' : 'bg-rose-600'
                                }`}
                        >
                            {event.results_locked ? 'Unlock results' : 'Lock results'}
                        </button>
                    </form>

                    <div className="pt-6">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Danger zone</div>
                        <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Delete event</h3>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            Deleting an event is destructive and removes dependent records through database cascades. Locked events cannot be deleted.
                        </p>

                        <form action={deleteEventAction} className="mt-5 grid gap-4">
                            <input type="hidden" name="eventId" value={event.id} />
                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Type event name to confirm</span>
                                <input
                                    name="confirmDelete"
                                    className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                                    placeholder={event.name}
                                />
                            </label>

                            {(isError('delete_confirm_required') || isError('locked_delete_blocked') || isError('delete_failed')) ? (
                                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                                    {isError('delete_confirm_required')
                                        ? 'Type the exact event name to confirm deletion.'
                                        : isError('locked_delete_blocked')
                                            ? 'Locked events cannot be deleted.'
                                            : 'Event deletion failed. Please try again.'}
                                </div>
                            ) : null}

                            <button type="submit" className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white">
                                Delete event
                            </button>
                        </form>
                    </div>
                </aside>
            </div>
        </section>
    )
}
