import { createServerSupabaseClient } from '@/lib/supabase/server'

type AuditPayload = {
    actorUserId: string | null
    action: string
    entityType: string
    entityId?: string | null
    eventId?: string | null
    beforeState?: unknown
    afterState?: unknown
}

function toSafeJson(value: unknown): unknown {
    if (value === undefined) return null
    try {
        return JSON.parse(JSON.stringify(value))
    } catch {
        return { serialize_error: true }
    }
}

export async function writeAuditLogSafe(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    payload: AuditPayload,
): Promise<boolean> {
    try {
        const { error } = await supabase.from('audit_logs').insert({
            actor_user_id: payload.actorUserId,
            action: payload.action,
            entity_type: payload.entityType,
            entity_id: payload.entityId ?? null,
            event_id: payload.eventId ?? null,
            before_state: toSafeJson(payload.beforeState),
            after_state: toSafeJson(payload.afterState),
        })

        if (error) {
            console.error('audit_log_insert_failed', {
                action: payload.action,
                entityType: payload.entityType,
                eventId: payload.eventId ?? null,
                message: error.message,
                code: error.code,
            })
            return false
        }

        return true
    } catch (error) {
        console.error('audit_log_insert_exception', {
            action: payload.action,
            entityType: payload.entityType,
            eventId: payload.eventId ?? null,
            error,
        })
        return false
    }
}
