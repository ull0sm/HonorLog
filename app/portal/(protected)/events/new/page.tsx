import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isSuperAdmin, requirePortalSession } from '@/lib/portal/auth'

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

function buildCreateRedirect(params: Record<string, string>) {
    const search = new URLSearchParams(params)
    return `/portal/events/new?${search.toString()}`
}

async function createEventAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        redirect('/portal')
    }

    const name = String(formData.get('name') ?? '').trim()
    const location = String(formData.get('location') ?? '').trim()
    const date = String(formData.get('date') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const status = String(formData.get('status') ?? 'draft').trim()
    const slugInput = String(formData.get('slug') ?? '').trim()
    const slug = sanitizeSlug(slugInput)

    const persistable = {
        name,
        location,
        date,
        description,
        status,
        slug: slugInput,
    }

    if (!name) {
        redirect(buildCreateRedirect({ ...persistable, error: 'missing_name' }))
    }

    if (!location) {
        redirect(buildCreateRedirect({ ...persistable, error: 'missing_location' }))
    }

    if (!date) {
        redirect(buildCreateRedirect({ ...persistable, error: 'missing_date' }))
    }

    if (!isValidDate(date)) {
        redirect(buildCreateRedirect({ ...persistable, error: 'invalid_date' }))
    }

    if (!EVENT_STATUSES.includes(status as (typeof EVENT_STATUSES)[number])) {
        redirect(buildCreateRedirect({ ...persistable, error: 'invalid_status' }))
    }

    const { data, error } = await supabase
        .from('events')
        .insert({
            name,
            location,
            date,
            description: description || null,
            status,
            slug: slug || null,
            created_by: profile.id,
        })
        .select('id')
        .single()

    if (error) {
        if (error.code === '23505') {
            redirect(buildCreateRedirect({ ...persistable, error: 'duplicate_slug' }))
        }

        redirect(buildCreateRedirect({ ...persistable, error: 'save_failed' }))
    }

    revalidatePath('/portal')
    revalidatePath('/portal/events')
    redirect(`/portal/events/${data.id}?created=1`)
}

type PortalNewEventPageProps = {
    searchParams?: Promise<Record<string, string | undefined>>
}

export default async function PortalNewEventPage({ searchParams }: PortalNewEventPageProps) {
    const { profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        redirect('/portal')
    }

    const params = await searchParams
    const error = params?.error

    const values = {
        name: params?.name ?? '',
        location: params?.location ?? '',
        date: params?.date ?? '',
        description: params?.description ?? '',
        status: params?.status ?? 'draft',
        slug: params?.slug ?? '',
    }

    const isError = (code: string) => error === code

    return (
        <section className="panel p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                        Phase 4 · Event creation
                    </div>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Create a new event</h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                        Define event metadata and initial workflow state. Slugs are optional but must be unique when provided.
                    </p>
                </div>

                <Link href="/portal/events" className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
                    Back to events
                </Link>
            </div>

            <form action={createEventAction} className="mt-7 grid gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Event name</span>
                        <input
                            name="name"
                            defaultValue={values.name}
                            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            placeholder="National Karate Championship 2026"
                        />
                        {isError('missing_name') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Event name is required.</p> : null}
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Location</span>
                        <input
                            name="location"
                            defaultValue={values.location}
                            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            placeholder="Bengaluru Indoor Arena"
                        />
                        {isError('missing_location') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Location is required.</p> : null}
                    </label>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Event date</span>
                        <input
                            name="date"
                            type="date"
                            defaultValue={values.date}
                            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                        />
                        {isError('missing_date') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Date is required.</p> : null}
                        {isError('invalid_date') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Use a valid date value.</p> : null}
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Slug (optional)</span>
                        <input
                            name="slug"
                            defaultValue={values.slug}
                            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            placeholder="national-championship-2026"
                        />
                        {isError('duplicate_slug') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">This slug is already in use. Choose another one.</p> : null}
                    </label>
                </div>

                <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Description (optional)</span>
                    <textarea
                        name="description"
                        defaultValue={values.description}
                        rows={4}
                        className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                        placeholder="Add operational notes or context for this event."
                    />
                </label>

                <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Initial status</span>
                    <select
                        name="status"
                        defaultValue={values.status}
                        className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                    >
                        {EVENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    {isError('invalid_status') ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Choose a valid status.</p> : null}
                </label>

                {isError('save_failed') ? (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                        Event could not be saved. Please try again.
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground">
                        Create event
                    </button>
                    <Link href="/portal/events" className="rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
                        Cancel
                    </Link>
                </div>
            </form>
        </section>
    )
}
