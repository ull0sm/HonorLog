import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import {
    getRegistrarEventAccess,
    isSuperAdmin,
    requirePortalSession,
} from '@/lib/portal/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccessRow = {
    id: string
    user_id: string
    role: string
    is_active: boolean
    expires_at: string | null
    can_edit_results: boolean
    created_at: string
}

type ProfileRow = {
    id: string
    email: string
    full_name: string | null
    is_active: boolean
}

type Assignment = AccessRow & { profile: ProfileRow | null }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusTone(status: string) {
    if (status === 'active') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    if (status === 'completed' || status === 'locked') return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    if (status === 'archived') return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
}

function buildAccessRedirect(eventId: string, params: Record<string, string>) {
    const search = new URLSearchParams(params)
    return `/portal/events/${eventId}/access?${search.toString()}`
}

function fmtDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
        missing_name: 'Full name is required.',
        missing_email: 'Email address is required.',
        invalid_email: 'Enter a valid email address.',
        missing_password: 'Temporary password is required.',
        short_password: 'Password must be at least 8 characters.',
        email_exists: 'A portal account already exists with this email address. Each registrar must have a unique email.',
        already_assigned: 'This user is already assigned as a registrar for this event.',
        create_failed: 'Account creation failed. Please try again.',
        service_key_missing:
            'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set in .env.local. This key is required to create portal accounts.',
        access_not_found: 'Access record not found.',
        disable_failed: 'Could not disable access. Please try again.',
        enable_failed: 'Could not re-enable access. Please try again.',
        remove_confirm_required: 'Type REMOVE (uppercase) to confirm removal of this registrar\'s access.',
        remove_failed: 'Access removal failed. Please try again.',
        missing_password_reset: 'New password is required.',
        short_password_reset: 'New password must be at least 8 characters.',
        reset_failed: 'Password reset failed. Please try again.',
    }
    return messages[code] ?? 'An unexpected error occurred. Please try again.'
}

function getSuccessMessage(code: string): string {
    const messages: Record<string, string> = {
        created: 'Registrar account created and access granted. Share the login credentials securely.',
        disabled: 'Registrar access disabled. The account still exists but cannot access this event.',
        enabled: 'Registrar access re-enabled.',
        removed: 'Registrar access removed. The underlying account still exists in Supabase Auth.',
        reset: 'Password updated successfully.',
    }
    return messages[code] ?? 'Action completed.'
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

async function createRegistrarAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()
    if (!isSuperAdmin(profile)) redirect('/portal')

    const eventId = String(formData.get('eventId') ?? '').trim()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        redirect(buildAccessRedirect(eventId, { error: 'service_key_missing' }))
    }

    const fullName = String(formData.get('fullName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')

    // Preserve non-sensitive form values for re-display on error (password intentionally omitted)
    const persistable: Record<string, string> = { name: fullName, email }

    if (!fullName) {
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'missing_name' }))
    }

    if (!email) {
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'missing_email' }))
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'invalid_email' }))
    }

    if (!password) {
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'missing_password' }))
    }

    if (password.length < 8) {
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'short_password' }))
    }

    // Reject if a profile with this email already exists
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

    if (existingProfile) {
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'email_exists' }))
    }

    const adminClient = createAdminSupabaseClient()

    // Create Supabase Auth user; email_confirm=true skips the verification email
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    })

    if (authError || !authData.user) {
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'create_failed' }))
    }

    const newUserId = authData.user.id

    // Create matching profiles row (global_role=staff; event scope is in event_access)
    const { error: profileError } = await supabase.from('profiles').insert({
        id: newUserId,
        email,
        full_name: fullName,
        global_role: 'staff',
        is_active: true,
    })

    if (profileError) {
        // Roll back the auth user so the email stays available for retry
        await adminClient.auth.admin.deleteUser(newUserId)
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'create_failed' }))
    }

    // Create event-scoped access assignment
    const { error: accessError } = await supabase.from('event_access').insert({
        event_id: eventId,
        user_id: newUserId,
        role: 'event_registrar',
        is_active: true,
        can_edit_results: true,
        created_by: profile.id,
    })

    if (accessError) {
        // Roll back profile + auth user to keep the data consistent
        await supabase.from('profiles').delete().eq('id', newUserId)
        await adminClient.auth.admin.deleteUser(newUserId)

        if (accessError.code === '23505') {
            redirect(buildAccessRedirect(eventId, { ...persistable, error: 'already_assigned' }))
        }
        redirect(buildAccessRedirect(eventId, { ...persistable, error: 'create_failed' }))
    }

    revalidatePath(`/portal/events/${eventId}/access`)
    redirect(buildAccessRedirect(eventId, { success: 'created' }))
}

async function disableAccessAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()
    if (!isSuperAdmin(profile)) redirect('/portal')

    const accessId = String(formData.get('accessId') ?? '').trim()
    const eventId = String(formData.get('eventId') ?? '').trim()

    if (!accessId || !eventId) redirect('/portal/events')

    const { error } = await supabase
        .from('event_access')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', accessId)

    if (error) {
        redirect(buildAccessRedirect(eventId, { error: 'disable_failed' }))
    }

    revalidatePath(`/portal/events/${eventId}/access`)
    redirect(buildAccessRedirect(eventId, { success: 'disabled' }))
}

async function enableAccessAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()
    if (!isSuperAdmin(profile)) redirect('/portal')

    const accessId = String(formData.get('accessId') ?? '').trim()
    const eventId = String(formData.get('eventId') ?? '').trim()

    if (!accessId || !eventId) redirect('/portal/events')

    const { error } = await supabase
        .from('event_access')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', accessId)

    if (error) {
        redirect(buildAccessRedirect(eventId, { error: 'enable_failed' }))
    }

    revalidatePath(`/portal/events/${eventId}/access`)
    redirect(buildAccessRedirect(eventId, { success: 'enabled' }))
}

async function removeAccessAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()
    if (!isSuperAdmin(profile)) redirect('/portal')

    const accessId = String(formData.get('accessId') ?? '').trim()
    const eventId = String(formData.get('eventId') ?? '').trim()
    const confirmRemove = String(formData.get('confirmRemove') ?? '').trim()

    if (!accessId || !eventId) redirect('/portal/events')

    if (confirmRemove !== 'REMOVE') {
        redirect(buildAccessRedirect(eventId, { error: 'remove_confirm_required' }))
    }

    const { error } = await supabase.from('event_access').delete().eq('id', accessId)

    if (error) {
        redirect(buildAccessRedirect(eventId, { error: 'remove_failed' }))
    }

    revalidatePath(`/portal/events/${eventId}/access`)
    redirect(buildAccessRedirect(eventId, { success: 'removed' }))
}

async function resetPasswordAction(formData: FormData) {
    'use server'

    const { profile } = await requirePortalSession()
    if (!isSuperAdmin(profile)) redirect('/portal')

    const eventId = String(formData.get('eventId') ?? '').trim()
    const userId = String(formData.get('userId') ?? '').trim()
    const newPassword = String(formData.get('newPassword') ?? '')

    if (!userId || !eventId) redirect('/portal/events')

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        redirect(buildAccessRedirect(eventId, { error: 'service_key_missing' }))
    }

    if (!newPassword) {
        redirect(buildAccessRedirect(eventId, { error: 'missing_password_reset' }))
    }

    if (newPassword.length < 8) {
        redirect(buildAccessRedirect(eventId, { error: 'short_password_reset' }))
    }

    const adminClient = createAdminSupabaseClient()
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })

    if (error) {
        redirect(buildAccessRedirect(eventId, { error: 'reset_failed' }))
    }

    revalidatePath(`/portal/events/${eventId}/access`)
    redirect(buildAccessRedirect(eventId, { success: 'reset' }))
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

type PortalEventAccessPageProps = {
    params: Promise<{ eventId: string }>
    searchParams?: Promise<Record<string, string | undefined>>
}

export default async function PortalEventAccessPage({ params, searchParams }: PortalEventAccessPageProps) {
    const { eventId } = await params
    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        const assignment = await getRegistrarEventAccess(supabase, profile.id, eventId)
        redirect(assignment ? `/portal/events/${eventId}/results` : '/portal')
    }

    const { data: event } = await supabase
        .from('events')
        .select('id, name, date, location, status, results_locked, import_status')
        .eq('id', eventId)
        .maybeSingle()

    if (!event) notFound()

    // Fetch access rows then profiles separately to avoid join syntax ambiguity
    const { data: accessRows } = await supabase
        .from('event_access')
        .select('id, user_id, role, is_active, expires_at, can_edit_results, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

    const rows = (accessRows ?? []) as AccessRow[]

    const profileMap: Record<string, ProfileRow> = {}
    if (rows.length > 0) {
        const userIds = [...new Set(rows.map((r) => r.user_id))]
        const { data: profileRows } = await supabase
            .from('profiles')
            .select('id, email, full_name, is_active')
            .in('id', userIds)
        for (const p of (profileRows ?? []) as ProfileRow[]) {
            profileMap[p.id] = p
        }
    }

    const assignments: Assignment[] = rows.map((r) => ({ ...r, profile: profileMap[r.user_id] ?? null }))

    const query = await searchParams
    const error = query?.error
    const success = query?.success

    const formValues = {
        name: query?.name ?? '',
        email: query?.email ?? '',
        // password intentionally not preserved for security
    }

    const isError = (code: string) => error === code

    return (
        <section className="space-y-6">
            {/* ── Event header + tab nav ───────────────────────────────────── */}
            <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                            Phase 5 · Access control
                        </div>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{event.name}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                            Create and manage registrar accounts for this event. Each registrar login is scoped to this event only and cannot access any other event or admin area.
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

                <nav className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                    <Link
                        href={`/portal/events/${eventId}`}
                        className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Overview
                    </Link>
                    <Link
                        href={`/portal/events/${eventId}/access`}
                        className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-foreground"
                    >
                        Access
                    </Link>
                    <Link
                        href={`/portal/events/${eventId}/import`}
                        className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Import
                    </Link>
                    <Link
                        href={`/portal/events/${eventId}/results`}
                        className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Results
                    </Link>
                </nav>
            </div>

            {/* ── Global banner ────────────────────────────────────────────── */}
            {(success || error) ? (
                <div
                    className={`panel px-5 py-4 sm:px-6 ${success
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-rose-500/40 bg-rose-500/5'
                        }`}
                >
                    <p
                        className={`text-sm font-medium ${success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                            }`}
                    >
                        {success ? getSuccessMessage(success) : getErrorMessage(error ?? '')}
                    </p>
                </div>
            ) : null}

            {/* ── Existing registrar assignments ───────────────────────────── */}
            <div className="panel p-6 sm:p-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Registrar access</div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    {assignments.length === 0
                        ? 'No registrars assigned'
                        : `${assignments.length} registrar${assignments.length === 1 ? '' : 's'}`}
                </h3>

                {assignments.length === 0 ? (
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        No registrar accounts have been created for this event yet. Use the form below to create one.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-4">
                        {assignments.map((assignment) => (
                            <div key={assignment.id} className="rounded-2xl border border-border bg-background/60 p-5">
                                {/* Identity row */}
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-foreground">
                                            {assignment.profile?.full_name || 'Unnamed registrar'}
                                        </div>
                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                            {assignment.profile?.email ?? '—'}
                                        </div>
                                        {assignment.expires_at ? (
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                Expires: {fmtDate(assignment.expires_at)}
                                            </div>
                                        ) : null}
                                        <div className="mt-0.5 text-[11px] text-muted-foreground/70">
                                            Assigned: {fmtDate(assignment.created_at)} · Role: {assignment.role}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {assignment.is_active ? (
                                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-slate-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
                                                Disabled
                                            </span>
                                        )}
                                        {assignment.profile?.is_active === false ? (
                                            <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">
                                                Account inactive
                                            </span>
                                        ) : null}
                                        {assignment.can_edit_results ? (
                                            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">
                                                Can edit results
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Action forms */}
                                <div className="mt-4 flex flex-wrap items-start gap-5 border-t border-border/60 pt-4">
                                    {/* Disable / Re-enable toggle */}
                                    <form action={assignment.is_active ? disableAccessAction : enableAccessAction}>
                                        <input type="hidden" name="accessId" value={assignment.id} />
                                        <input type="hidden" name="eventId" value={eventId} />
                                        <button
                                            type="submit"
                                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${assignment.is_active
                                                ? 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400'
                                                : 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
                                                }`}
                                        >
                                            {assignment.is_active ? 'Disable access' : 'Re-enable access'}
                                        </button>
                                    </form>

                                    {/* Reset password */}
                                    <form action={resetPasswordAction} className="flex items-center gap-2">
                                        <input type="hidden" name="userId" value={assignment.profile?.id ?? ''} />
                                        <input type="hidden" name="eventId" value={eventId} />
                                        <label className="sr-only" htmlFor={`pw-${assignment.id}`}>
                                            New password for {assignment.profile?.email}
                                        </label>
                                        <input
                                            id={`pw-${assignment.id}`}
                                            name="newPassword"
                                            type="password"
                                            placeholder="New password (min 8 chars)"
                                            autoComplete="new-password"
                                            className="w-52 rounded-xl border border-border bg-background/70 px-3 py-1.5 text-xs text-foreground outline-none"
                                        />
                                        <button
                                            type="submit"
                                            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            Reset password
                                        </button>
                                    </form>

                                    {/* Remove access */}
                                    <form action={removeAccessAction} className="flex items-center gap-2">
                                        <input type="hidden" name="accessId" value={assignment.id} />
                                        <input type="hidden" name="eventId" value={eventId} />
                                        <label className="sr-only" htmlFor={`rm-${assignment.id}`}>
                                            Type REMOVE to confirm
                                        </label>
                                        <input
                                            id={`rm-${assignment.id}`}
                                            name="confirmRemove"
                                            type="text"
                                            placeholder="Type REMOVE to confirm"
                                            className="w-48 rounded-xl border border-rose-500/30 bg-background/70 px-3 py-1.5 text-xs text-foreground outline-none"
                                        />
                                        <button
                                            type="submit"
                                            className="rounded-full border border-rose-500/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                                        >
                                            Remove
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Create registrar form ────────────────────────────────────── */}
            <form action={createRegistrarAction} className="panel p-6 sm:p-8">
                <input type="hidden" name="eventId" value={event.id} />

                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Create registrar account
                </div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">New registrar</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Creates a portal account scoped to <span className="font-semibold text-foreground">{event.name}</span> only.
                    The registrar will be able to log in immediately using the credentials below. Share them securely.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Full name</span>
                        <input
                            name="fullName"
                            defaultValue={formValues.name}
                            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            placeholder="e.g. Priya Sharma"
                        />
                        {isError('missing_name') ? (
                            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Full name is required.</p>
                        ) : null}
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Email address</span>
                        <input
                            name="email"
                            type="email"
                            defaultValue={formValues.email}
                            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            placeholder="registrar@example.com"
                        />
                        {isError('missing_email') ? (
                            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Email address is required.</p>
                        ) : null}
                        {isError('invalid_email') ? (
                            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Enter a valid email address.</p>
                        ) : null}
                        {isError('email_exists') ? (
                            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                                A portal account already exists with this email. Each registrar must have a unique email.
                            </p>
                        ) : null}
                        {isError('already_assigned') ? (
                            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                                This user is already assigned as a registrar for this event.
                            </p>
                        ) : null}
                    </label>

                    <label className="block sm:col-span-2 sm:max-w-sm">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                            Temporary password
                        </span>
                        <input
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                            placeholder="Minimum 8 characters"
                        />
                        <p className="mt-2 text-[11px] text-muted-foreground">
                            Set a temporary password and share it with the registrar securely. They can use it to log
                            in immediately. You can reset it at any time from above.
                        </p>
                        {isError('missing_password') ? (
                            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Temporary password is required.</p>
                        ) : null}
                        {isError('short_password') ? (
                            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Password must be at least 8 characters.</p>
                        ) : null}
                    </label>
                </div>

                {(isError('create_failed') || isError('service_key_missing')) ? (
                    <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                        {isError('service_key_missing')
                            ? 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set in .env.local. This key is required to create portal accounts.'
                            : 'Account creation failed. Please try again.'}
                    </div>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        className="rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground"
                    >
                        Create registrar
                    </button>
                    <Link
                        href={`/portal/events/${eventId}`}
                        className="rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Back to overview
                    </Link>
                </div>
            </form>
        </section>
    )
}

