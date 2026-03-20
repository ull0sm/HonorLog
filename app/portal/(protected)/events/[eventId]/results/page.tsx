import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import {
    getRegistrarEventAccess,
    isAssignmentLive,
    isSuperAdmin,
    requirePortalSession,
} from '@/lib/portal/auth'
import { writeAuditLogSafe } from '@/lib/portal/audit'

function getStatusTone(status: string) {
    if (status === 'active') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    if (status === 'completed' || status === 'locked') return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    if (status === 'archived') return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
}

type Medal = 'GOLD' | 'SILVER' | 'BRONZE' | 'PARTICIPATION'

const MEDAL_OPTIONS: Medal[] = ['GOLD', 'SILVER', 'BRONZE', 'PARTICIPATION']

type EventCategory = {
    id: string
    name: string
    sort_order: number | null
    is_locked: boolean
}

type EventRegistration = {
    id: string
    category_id: string | null
    participant_name: string
    participant_identifier: string | null
    dojo: string | null
}

type EventResult = {
    id: string
    category_id: string
    registration_id: string | null
    placement: number
    medal: Medal | null
    participant_name_snapshot: string
    dojo_snapshot: string | null
    updated_at: string
}

function buildResultsRedirect(eventId: string, categoryId: string | null, params: Record<string, string>) {
    const search = new URLSearchParams(params)
    if (categoryId) {
        search.set('categoryId', categoryId)
    }
    return `/portal/events/${eventId}/results?${search.toString()}`
}

function placementLabel(value: number) {
    const suffix =
        value % 10 === 1 && value % 100 !== 11
            ? 'st'
            : value % 10 === 2 && value % 100 !== 12
                ? 'nd'
                : value % 10 === 3 && value % 100 !== 13
                    ? 'rd'
                    : 'th'
    return `${value}${suffix}`
}

async function saveResultAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()
    const superAdmin = isSuperAdmin(profile)

    const eventId = String(formData.get('eventId') ?? '').trim()
    const categoryId = String(formData.get('categoryId') ?? '').trim()
    const resultId = String(formData.get('resultId') ?? '').trim()
    const expectedUpdatedAt = String(formData.get('expectedUpdatedAt') ?? '').trim()

    const placementRaw = String(formData.get('placement') ?? '').trim()
    const registrationId = String(formData.get('registrationId') ?? '').trim()
    const medalRaw = String(formData.get('medal') ?? '').trim().toUpperCase()

    if (!eventId || !categoryId) {
        redirect('/portal/events')
    }

    const placement = Number.parseInt(placementRaw, 10)
    if (!Number.isInteger(placement) || placement <= 0) {
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'placement_invalid' }))
    }

    if (!registrationId) {
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'registration_required' }))
    }

    if (medalRaw && !MEDAL_OPTIONS.includes(medalRaw as Medal)) {
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'medal_invalid' }))
    }

    // Enforce event-scoped edit rights for registrar users.
    if (!superAdmin) {
        const { data: access } = await supabase
            .from('event_access')
            .select('is_active, can_edit_results, expires_at')
            .eq('event_id', eventId)
            .eq('user_id', profile.id)
            .eq('role', 'event_registrar')
            .maybeSingle<{ is_active: boolean; can_edit_results: boolean; expires_at: string | null }>()

        const expired = access?.expires_at ? new Date(access.expires_at) < new Date() : false
        if (!access || !access.is_active || expired || !access.can_edit_results) {
            redirect(buildResultsRedirect(eventId, categoryId, { error: 'no_access' }))
        }
    }

    const { data: event } = await supabase
        .from('events')
        .select('id, status, results_locked')
        .eq('id', eventId)
        .maybeSingle<{ id: string; status: string; results_locked: boolean }>()

    if (!event) {
        redirect('/portal/events')
    }

    const { data: category } = await supabase
        .from('event_categories')
        .select('id, event_id, is_locked')
        .eq('id', categoryId)
        .maybeSingle<{ id: string; event_id: string; is_locked: boolean }>()

    if (!category || category.event_id !== eventId) {
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'category_mismatch' }))
    }

    if (event.results_locked || event.status === 'locked' || category.is_locked) {
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'locked' }))
    }

    const { data: registration } = await supabase
        .from('event_registrations')
        .select('id, event_id, category_id, participant_name, dojo')
        .eq('id', registrationId)
        .maybeSingle<{
            id: string
            event_id: string
            category_id: string | null
            participant_name: string
            dojo: string | null
        }>()

    if (!registration || registration.event_id !== eventId || registration.category_id !== categoryId) {
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'participant_mismatch' }))
    }

    const { data: duplicatePlacement } = await supabase
        .from('event_results')
        .select('id')
        .eq('event_id', eventId)
        .eq('category_id', categoryId)
        .eq('placement', placement)
        .maybeSingle<{ id: string }>()

    if (duplicatePlacement && duplicatePlacement.id !== resultId) {
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'duplicate_placement' }))
    }

    const { data: duplicateParticipant } = await supabase
        .from('event_results')
        .select('id')
        .eq('event_id', eventId)
        .eq('category_id', categoryId)
        .eq('registration_id', registrationId)
        .maybeSingle<{ id: string }>()

    if (duplicateParticipant && duplicateParticipant.id !== resultId) {
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'duplicate_participant' }))
    }

    if (resultId) {
        const { data: existing } = await supabase
            .from('event_results')
            .select('id, event_id, category_id, registration_id, placement, medal, updated_at')
            .eq('id', resultId)
            .maybeSingle<{
                id: string
                event_id: string
                category_id: string
                registration_id: string | null
                placement: number
                medal: Medal | null
                updated_at: string
            }>()

        if (!existing || existing.event_id !== eventId || existing.category_id !== categoryId) {
            redirect(buildResultsRedirect(eventId, categoryId, { error: 'stale_edit' }))
        }

        if (expectedUpdatedAt) {
            const nowVersion = Date.parse(existing.updated_at)
            const formVersion = Date.parse(expectedUpdatedAt)
            if (Number.isFinite(nowVersion) && Number.isFinite(formVersion) && nowVersion !== formVersion) {
                redirect(buildResultsRedirect(eventId, categoryId, { error: 'stale_edit' }))
            }
        }

        const { error: updateError } = await supabase
            .from('event_results')
            .update({
                placement,
                medal: medalRaw ? (medalRaw as Medal) : null,
                registration_id: registration.id,
                participant_name_snapshot: registration.participant_name,
                dojo_snapshot: registration.dojo,
                entered_by: profile.id,
            })
            .eq('id', resultId)

        if (updateError) {
            if (updateError.code === '23505') {
                redirect(buildResultsRedirect(eventId, categoryId, { error: 'duplicate_placement' }))
            }
            redirect(buildResultsRedirect(eventId, categoryId, { error: 'save_failed' }))
        }

        await writeAuditLogSafe(supabase, {
            actorUserId: profile.id,
            action: 'result_updated',
            entityType: 'event_result',
            entityId: resultId,
            eventId,
            beforeState: {
                category_id: existing.category_id,
                registration_id: existing.registration_id,
                placement: existing.placement,
                medal: existing.medal,
            },
            afterState: {
                category_id: categoryId,
                registration_id: registration.id,
                placement,
                medal: medalRaw ? (medalRaw as Medal) : null,
            },
        })

        revalidatePath(`/portal/events/${eventId}/results`)
        revalidatePath('/portal/audit')
        redirect(buildResultsRedirect(eventId, categoryId, { success: 'updated' }))
    }

    const { error: insertError } = await supabase.from('event_results').insert({
        event_id: eventId,
        category_id: categoryId,
        registration_id: registration.id,
        placement,
        medal: medalRaw ? (medalRaw as Medal) : null,
        participant_name_snapshot: registration.participant_name,
        dojo_snapshot: registration.dojo,
        entered_by: profile.id,
    })

    if (insertError) {
        if (insertError.code === '23505') {
            redirect(buildResultsRedirect(eventId, categoryId, { error: 'duplicate_placement' }))
        }
        redirect(buildResultsRedirect(eventId, categoryId, { error: 'save_failed' }))
    }

    await writeAuditLogSafe(supabase, {
        actorUserId: profile.id,
        action: 'result_created',
        entityType: 'event_result',
        eventId,
        afterState: {
            category_id: categoryId,
            registration_id: registration.id,
            placement,
            medal: medalRaw ? (medalRaw as Medal) : null,
        },
    })

    revalidatePath(`/portal/events/${eventId}/results`)
    revalidatePath('/portal/audit')
    redirect(buildResultsRedirect(eventId, categoryId, { success: 'created' }))
}

type PortalEventResultsPageProps = {
    params: Promise<{ eventId: string }>
    searchParams?: Promise<Record<string, string | undefined>>
}

export default async function PortalEventResultsPage({ params, searchParams }: PortalEventResultsPageProps) {
    const { eventId } = await params
    const query = await searchParams

    const { supabase, profile } = await requirePortalSession()
    const superAdmin = isSuperAdmin(profile)

    // Registrars must have an active assignment for this event.
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

    const { data: event } = await supabase
        .from('events')
        .select('id, name, date, location, status, results_locked')
        .eq('id', eventId)
        .maybeSingle<{
            id: string
            name: string
            date: string
            location: string
            status: string
            results_locked: boolean
        }>()

    if (!event) notFound()

    const { data: categories } = await supabase
        .from('event_categories')
        .select('id, name, sort_order, is_locked')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

    const { data: registrations } = await supabase
        .from('event_registrations')
        .select('id, category_id, participant_name, participant_identifier, dojo')
        .eq('event_id', eventId)
        .order('participant_name', { ascending: true })

    const { data: results } = await supabase
        .from('event_results')
        .select('id, category_id, registration_id, placement, medal, participant_name_snapshot, dojo_snapshot, updated_at')
        .eq('event_id', eventId)
        .order('placement', { ascending: true })

    const categoryList = (categories ?? []) as EventCategory[]
    const registrationList = (registrations ?? []) as EventRegistration[]
    const resultList = (results ?? []) as EventResult[]

    const selectedCategoryId =
        query?.categoryId && categoryList.some((c) => c.id === query.categoryId)
            ? query.categoryId
            : (categoryList[0]?.id ?? null)

    const selectedCategory = selectedCategoryId
        ? (categoryList.find((c) => c.id === selectedCategoryId) ?? null)
        : null

    const selectedCategoryResults = selectedCategory
        ? resultList
            .filter((r) => r.category_id === selectedCategory.id)
            .sort((a, b) => a.placement - b.placement)
        : []

    const selectedCategoryRegistrations = selectedCategory
        ? registrationList.filter((r) => r.category_id === selectedCategory.id)
        : []

    const registrationById = new Map(registrationList.map((r) => [r.id, r]))

    const eventLocked = event.results_locked || event.status === 'locked'
    const categoryLocked = selectedCategory?.is_locked ?? false
    const readOnly = eventLocked || categoryLocked

    const errorMessageMap: Record<string, string> = {
        no_access: 'You no longer have permission to edit results for this event.',
        placement_invalid: 'Placement must be a positive integer.',
        registration_required: 'Select a participant before saving.',
        medal_invalid: 'Medal selection is invalid.',
        category_mismatch: 'The selected category is invalid for this event.',
        participant_mismatch: 'Selected participant does not belong to this category.',
        duplicate_placement: 'This placement is already assigned in the selected category.',
        duplicate_participant: 'This participant is already assigned to another placement in this category.',
        stale_edit: 'This result was modified from another tab/session. Refresh and try again.',
        locked: 'Results are locked for this event or category. Editing is disabled.',
        save_failed: 'Could not save the result. Please try again.',
    }

    const successMessageMap: Record<string, string> = {
        created: 'Result entry created successfully.',
        updated: 'Result entry updated successfully.',
    }

    return (
        <section className="space-y-6">
            <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                            Results workspace
                        </div>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            {event.name}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                            {event.date} · {event.location}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusTone(event.status)}`}
                        >
                            {event.status}
                        </span>
                        {event.results_locked ? (
                            <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">
                                Results locked
                            </span>
                        ) : null}
                    </div>
                </div>

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

            {readOnly ? (
                <div className="panel border-rose-500/40 bg-rose-500/5 px-5 py-4 sm:px-6">
                    <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                        {eventLocked
                            ? 'Results are locked at event level. Entries are read-only.'
                            : 'This category is locked. Entries are read-only.'}
                    </p>
                </div>
            ) : null}

            {query?.error ? (
                <div className="panel border-rose-500/40 bg-rose-500/10 px-5 py-4 sm:px-6">
                    <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                        {errorMessageMap[query.error] ?? 'Result action failed.'}
                    </p>
                </div>
            ) : null}

            {query?.success ? (
                <div className="panel border-emerald-500/40 bg-emerald-500/10 px-5 py-4 sm:px-6">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        {successMessageMap[query.success] ?? 'Saved successfully.'}
                    </p>
                </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <div className="panel p-6 sm:p-8">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Categories
                    </div>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Select division</h3>

                    {categoryList.length === 0 ? (
                        <div className="mt-5 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                            No categories found for this event yet. Import category data first.
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {categoryList.map((category) => {
                                const participantCount = registrationList.filter(
                                    (row) => row.category_id === category.id,
                                ).length
                                const resultCount = resultList.filter(
                                    (row) => row.category_id === category.id,
                                ).length

                                const active = selectedCategoryId === category.id

                                return (
                                    <Link
                                        key={category.id}
                                        href={`/portal/events/${eventId}/results?categoryId=${category.id}`}
                                        className={`block rounded-2xl border px-4 py-3 transition-colors ${active
                                            ? 'border-primary/60 bg-primary/5'
                                            : 'border-border bg-background/60 hover:border-border/80'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-foreground">{category.name}</div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Participants: {participantCount} · Results: {resultCount}
                                                </div>
                                            </div>
                                            {category.is_locked ? (
                                                <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-700 dark:text-rose-300">
                                                    Locked
                                                </span>
                                            ) : null}
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="panel p-6 sm:p-8">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Prize entry
                    </div>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                        {selectedCategory ? selectedCategory.name : 'Select a category'}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        Assign one participant per placement slot. Duplicate placements and duplicate participants in the same category are blocked.
                    </p>

                    {!selectedCategory ? (
                        <div className="mt-5 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                            Pick a category from the left to start result entry.
                        </div>
                    ) : (
                        <div className="mt-5 space-y-5">
                            {selectedCategoryResults.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-4 text-sm text-muted-foreground">
                                    No results entered for this category yet.
                                </div>
                            ) : null}

                            {selectedCategoryResults.map((result) => {
                                const currentRegistration = result.registration_id
                                    ? (registrationById.get(result.registration_id) ?? null)
                                    : null

                                return (
                                    <form
                                        key={result.id}
                                        action={saveResultAction}
                                        className="rounded-2xl border border-border bg-background/60 p-4"
                                    >
                                        <input type="hidden" name="eventId" value={eventId} />
                                        <input type="hidden" name="categoryId" value={selectedCategory.id} />
                                        <input type="hidden" name="resultId" value={result.id} />
                                        <input
                                            type="hidden"
                                            name="expectedUpdatedAt"
                                            value={result.updated_at}
                                        />

                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-sm font-semibold text-foreground">
                                                {placementLabel(result.placement)} place
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Last updated: {new Date(result.updated_at).toLocaleString('en-IN')}
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <label className="block">
                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                                    Placement
                                                </span>
                                                <input
                                                    type="number"
                                                    name="placement"
                                                    min={1}
                                                    defaultValue={result.placement}
                                                    disabled={readOnly}
                                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                                                />
                                            </label>

                                            <label className="block sm:col-span-2">
                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                                    Participant
                                                </span>
                                                <select
                                                    name="registrationId"
                                                    defaultValue={result.registration_id ?? ''}
                                                    disabled={readOnly}
                                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                                                >
                                                    <option value="">Select participant</option>
                                                    {selectedCategoryRegistrations.map((registration) => (
                                                        <option key={registration.id} value={registration.id}>
                                                            {registration.participant_name}
                                                            {registration.participant_identifier
                                                                ? ` · ${registration.participant_identifier}`
                                                                : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>

                                            <label className="block">
                                                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                                    Medal
                                                </span>
                                                <select
                                                    name="medal"
                                                    defaultValue={result.medal ?? ''}
                                                    disabled={readOnly}
                                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                                                >
                                                    <option value="">None</option>
                                                    {MEDAL_OPTIONS.map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <div className="sm:col-span-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                                                {currentRegistration
                                                    ? `${currentRegistration.participant_name}${currentRegistration.dojo ? ` · ${currentRegistration.dojo}` : ''}`
                                                    : `${result.participant_name_snapshot}${result.dojo_snapshot ? ` · ${result.dojo_snapshot}` : ''} (snapshot)`}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={readOnly}
                                            className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Save changes
                                        </button>
                                    </form>
                                )
                            })}

                            <form action={saveResultAction} className="rounded-2xl border border-border bg-background/70 p-4">
                                <input type="hidden" name="eventId" value={eventId} />
                                <input type="hidden" name="categoryId" value={selectedCategory.id} />

                                <div className="mb-3 text-sm font-semibold text-foreground">Add placement</div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                            Placement
                                        </span>
                                        <input
                                            type="number"
                                            name="placement"
                                            min={1}
                                            placeholder="1"
                                            disabled={readOnly}
                                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                                        />
                                    </label>

                                    <label className="block sm:col-span-2">
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                            Participant
                                        </span>
                                        <select
                                            name="registrationId"
                                            defaultValue=""
                                            disabled={readOnly}
                                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            <option value="">Select participant</option>
                                            {selectedCategoryRegistrations.map((registration) => (
                                                <option key={registration.id} value={registration.id}>
                                                    {registration.participant_name}
                                                    {registration.participant_identifier
                                                        ? ` · ${registration.participant_identifier}`
                                                        : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                            Medal
                                        </span>
                                        <select
                                            name="medal"
                                            defaultValue=""
                                            disabled={readOnly}
                                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            <option value="">None</option>
                                            {MEDAL_OPTIONS.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={readOnly || selectedCategoryRegistrations.length === 0}
                                    className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Add result entry
                                </button>
                                {selectedCategoryRegistrations.length === 0 ? (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        No participants are available in this category.
                                    </p>
                                ) : null}
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
