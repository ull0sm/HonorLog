import ExcelJS from 'exceljs'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import {
    getRegistrarEventAccess,
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

type ImportRowStatus = 'valid' | 'warning' | 'error' | 'duplicate'

type ParsedParticipant = {
    participantIdentifier: string | null
    participantName: string
    dojo: string | null
    beltRank: string | null
    gender: string | null
    age: number | null
    category: string
    rawPayload: Record<string, unknown>
}

type PreviewRow = {
    rowIndex: number
    payload: ParsedParticipant
    validationStatus: ImportRowStatus
    messages: string[]
}

type UploadSummary = {
    valid: number
    warning: number
    error: number
    duplicate: number
    total: number
}

type EventCategory = {
    id: string
    name: string
}

function isParsedParticipantPayload(value: unknown): value is ParsedParticipant {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const row = value as Record<string, unknown>

    const name = row.participantName
    const category = row.category
    if (typeof name !== 'string' || name.trim() === '') return false
    if (typeof category !== 'string' || category.trim() === '') return false

    return true
}

function normalizeText(value: unknown): string {
    if (typeof value !== 'string') return ''
    return value.trim()
}

function normalizeOptional(value: unknown): string | null {
    const text = normalizeText(value)
    return text.length > 0 ? text : null
}

function toLowerKey(value: string): string {
    return value.trim().toLowerCase()
}

function parseAge(value: unknown): { age: number | null; warning?: string; error?: string } {
    if (value === null || value === undefined || value === '') {
        return { age: null }
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) {
            return { age: null, error: 'Age must be a valid positive number when provided.' }
        }
        return { age: Math.floor(value) }
    }

    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!/^\d+$/.test(trimmed)) {
            return { age: null, error: 'Age must be numeric when provided.' }
        }
        return { age: Number(trimmed) }
    }

    return { age: null, error: 'Age has an unsupported format.' }
}

function getStatusToneForPreview(status: ImportRowStatus): string {
    if (status === 'valid') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    if (status === 'warning') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
    if (status === 'duplicate') return 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
    return 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
}

function buildImportRedirect(eventId: string, params: Record<string, string>) {
    const search = new URLSearchParams(params)
    return `/portal/events/${eventId}/import?${search.toString()}`
}

function buildSummary(rows: PreviewRow[]): UploadSummary {
    const summary: UploadSummary = {
        valid: 0,
        warning: 0,
        error: 0,
        duplicate: 0,
        total: rows.length,
    }

    for (const row of rows) {
        summary[row.validationStatus] += 1
    }

    return summary
}

async function parseAndValidateParticipants(
    rawJson: unknown,
    categories: EventCategory[],
    existingRegistrations: Array<{
        participant_identifier: string | null
        participant_name: string
        category_id: string | null
        event_categories: { name: string | null } | { name: string | null }[] | null
    }>,
): Promise<{ rows: PreviewRow[]; summary: UploadSummary; eventWarning: string | null }> {
    if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
        throw new Error('The JSON root must be an object with a participants array.')
    }

    const payload = rawJson as Record<string, unknown>
    const participants = payload.participants

    if (!Array.isArray(participants)) {
        throw new Error('`participants` must be an array.')
    }

    if (participants.length === 0) {
        throw new Error('The participants array is empty.')
    }

    const categoryMap = new Map<string, EventCategory>()
    for (const category of categories) {
        categoryMap.set(toLowerKey(category.name), category)
    }

    const existingIdentifiers = new Set<string>()
    const existingNameCategory = new Set<string>()
    for (const reg of existingRegistrations) {
        const identifier = normalizeOptional(reg.participant_identifier)
        if (identifier) {
            existingIdentifiers.add(toLowerKey(identifier))
        }
        const categoryName = Array.isArray(reg.event_categories)
            ? reg.event_categories[0]?.name ?? ''
            : reg.event_categories?.name ?? ''
        const nameCategoryKey = `${toLowerKey(reg.participant_name)}|${toLowerKey(categoryName)}`
        existingNameCategory.add(nameCategoryKey)
    }

    const seenIdentifiers = new Set<string>()
    const seenNameCategory = new Set<string>()
    const rows: PreviewRow[] = []

    const eventNode = payload.event
    let eventWarning: string | null = null
    if (eventNode && typeof eventNode === 'object' && !Array.isArray(eventNode)) {
        const eventObject = eventNode as Record<string, unknown>
        const incomingName = normalizeText(eventObject.name)
        if (!incomingName) {
            eventWarning = 'Upload JSON event.name is missing. Import uses the selected event from the URL.'
        }
    }

    participants.forEach((entry, index) => {
        const rowIndex = index + 1
        const messages: string[] = []

        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            rows.push({
                rowIndex,
                payload: {
                    participantIdentifier: null,
                    participantName: '',
                    dojo: null,
                    beltRank: null,
                    gender: null,
                    age: null,
                    category: '',
                    rawPayload: {},
                },
                validationStatus: 'error',
                messages: ['Participant row must be an object.'],
            })
            return
        }

        const record = entry as Record<string, unknown>
        const participantName = normalizeText(record.participantName)
        const category = normalizeText(record.category)
        const participantIdentifier = normalizeOptional(record.participantIdentifier)
        const dojo = normalizeOptional(record.dojo)
        const beltRank = normalizeOptional(record.beltRank)
        const gender = normalizeOptional(record.gender)
        const parsedAge = parseAge(record.age)

        if (!participantName) {
            messages.push('Participant name is required.')
        }

        if (!category) {
            messages.push('Category is required.')
        }

        if (parsedAge.error) {
            messages.push(parsedAge.error)
        }

        const categoryExists = categoryMap.has(toLowerKey(category))
        if (category && !categoryExists) {
            messages.push(`Unknown category: ${category}`)
        }

        if (!dojo) {
            messages.push('Dojo is missing (warning).')
        }

        const nameCategoryKey = `${toLowerKey(participantName)}|${toLowerKey(category)}`
        let duplicate = false

        if (participantIdentifier) {
            const normalizedIdentifier = toLowerKey(participantIdentifier)
            if (seenIdentifiers.has(normalizedIdentifier) || existingIdentifiers.has(normalizedIdentifier)) {
                duplicate = true
                messages.push(`Duplicate participant identifier: ${participantIdentifier}`)
            }
            seenIdentifiers.add(normalizedIdentifier)
        }

        if (participantName && category) {
            if (seenNameCategory.has(nameCategoryKey) || existingNameCategory.has(nameCategoryKey)) {
                duplicate = true
                messages.push('Duplicate participant/category combination detected.')
            }
            seenNameCategory.add(nameCategoryKey)
        }

        const hasError = messages.some((message) =>
            message.includes('required') || message.includes('Unknown category') || message.includes('must be')
        )
        const hasWarning = messages.some((message) => message.includes('(warning)'))

        let validationStatus: ImportRowStatus = 'valid'
        if (hasError) validationStatus = 'error'
        else if (duplicate) validationStatus = 'duplicate'
        else if (hasWarning) validationStatus = 'warning'

        rows.push({
            rowIndex,
            payload: {
                participantIdentifier,
                participantName,
                dojo,
                beltRank,
                gender,
                age: parsedAge.age,
                category,
                rawPayload: record,
            },
            validationStatus,
            messages,
        })
    })

    return {
        rows,
        summary: buildSummary(rows),
        eventWarning,
    }
}

// ── Excel template constants ──────────────────────────────────────────────────

const EXPECTED_SHEET_NAME = 'Participants'

const REQUIRED_EXCEL_HEADERS = [
    'participant_identifier',
    'participant_name',
    'dojo',
    'belt_rank',
    'gender',
    'age',
    'category',
] as const

type ExcelHeader = (typeof REQUIRED_EXCEL_HEADERS)[number]

const EXCEL_TO_JSON_FIELD: Record<ExcelHeader, string> = {
    participant_identifier: 'participantIdentifier',
    participant_name: 'participantName',
    dojo: 'dojo',
    belt_rank: 'beltRank',
    gender: 'gender',
    age: 'age',
    category: 'category',
}

const FORMULA_SENSITIVE_COLUMNS: ExcelHeader[] = ['participant_identifier', 'participant_name', 'category']

async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<unknown> {
    const workbook = new ExcelJS.Workbook()
    // exceljs d.ts uses the pre-generic Buffer type; newer @types/node makes Buffer generic
    // @ts-expect-error Buffer generic parameter mismatch between exceljs types and @types/node >=18
    await workbook.xlsx.load(Buffer.from(buffer))

    const ws = workbook.getWorksheet(EXPECTED_SHEET_NAME)
    if (!ws) {
        const found = workbook.worksheets.map((s) => `"${s.name}"`).join(', ') || '(none)'
        throw new Error(
            `Sheet named "${EXPECTED_SHEET_NAME}" not found. Sheets in file: ${found}. ` +
            `Rename your sheet tab to "${EXPECTED_SHEET_NAME}" and re-upload.`,
        )
    }

    // Build header → 1-based column index map from row 1
    const headerColIndex: Record<string, number> = {}
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const headerText = String(cell.value ?? '').trim().toLowerCase()
        if (headerText) headerColIndex[headerText] = colNumber
    })

    const missingHeaders = REQUIRED_EXCEL_HEADERS.filter((h) => !(h in headerColIndex))
    if (missingHeaders.length > 0) {
        throw new Error(
            `Missing required column${missingHeaders.length > 1 ? 's' : ''}: ${missingHeaders.join(', ')}. ` +
            `All required columns: ${REQUIRED_EXCEL_HEADERS.join(', ')}.`,
        )
    }

    const participants: Record<string, unknown>[] = []
    const nameColIdx = headerColIndex['participant_name']

    for (let rowNumber = 2; rowNumber <= ws.rowCount; rowNumber++) {
        const row = ws.getRow(rowNumber)

        // Skip blank rows — participant_name is the blank-row signal
        const nameCell = row.getCell(nameColIdx)
        if (!nameCell || String(nameCell.value ?? '').trim() === '') continue

        // Reject formulas in key identity columns
        for (const header of FORMULA_SENSITIVE_COLUMNS) {
            const colIdx = headerColIndex[header]
            const cell = row.getCell(colIdx)
            const isFormula =
                typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value
            if (isFormula) {
                throw new Error(
                    `Row ${rowNumber}: formula detected in "${header}" column. ` +
                    `Replace formulas with plain text values before uploading.`,
                )
            }
        }

        const record: Record<string, unknown> = {}
        for (const header of REQUIRED_EXCEL_HEADERS) {
            const field = EXCEL_TO_JSON_FIELD[header]
            const colIdx = headerColIndex[header]
            const cell = row.getCell(colIdx)
            const v = cell.value

            if (v === null || v === undefined || String(v).trim() === '') {
                record[field] = null
            } else if (header === 'age') {
                // Preserve numeric type so parseAge handles it correctly
                record[field] = typeof v === 'number' ? v : String(v).trim()
            } else {
                record[field] = String(v).trim()
            }
        }

        participants.push(record)
    }

    if (participants.length === 0) {
        throw new Error(
            'The workbook contains no data rows under the header. Add participant rows below row 1.',
        )
    }

    return { participants }
}

async function uploadFileAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()
    if (!isSuperAdmin(profile)) redirect('/portal')

    const eventId = String(formData.get('eventId') ?? '').trim()
    if (!eventId) redirect('/portal/events')

    const file = formData.get('importFile') as File | null
    if (!file || file.size === 0) {
        redirect(buildImportRedirect(eventId, { error: 'missing_file' }))
    }

    const fileName = file.name.toLowerCase()
    const isJson = fileName.endsWith('.json')
    const isXlsx = fileName.endsWith('.xlsx')

    if (!isJson && !isXlsx) {
        redirect(buildImportRedirect(eventId, { error: 'unsupported_file' }))
    }

    let parsedJson: unknown
    let sourceType = 'json'

    if (isJson) {
        const text = await file.text()
        if (!text.trim()) {
            redirect(buildImportRedirect(eventId, { error: 'empty_file' }))
        }
        try {
            parsedJson = JSON.parse(text)
        } catch {
            redirect(buildImportRedirect(eventId, { error: 'invalid_json' }))
        }
        sourceType = 'json'
    } else {
        const arrayBuffer = await file.arrayBuffer()
        try {
            parsedJson = await parseXlsxBuffer(arrayBuffer)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Excel parse failed.'
            redirect(buildImportRedirect(eventId, { error: 'excel_parse_failed', message }))
        }
        sourceType = 'xlsx'
    }

    const { data: event } = await supabase
        .from('events')
        .select('id, import_status')
        .eq('id', eventId)
        .maybeSingle()

    if (!event) {
        redirect('/portal/events')
    }

    const { data: categories } = await supabase
        .from('event_categories')
        .select('id, name')
        .eq('event_id', eventId)

    const { data: existingRegistrations } = await supabase
        .from('event_registrations')
        .select('participant_identifier, participant_name, category_id, event_categories(name)')
        .eq('event_id', eventId)

    let parseResult: { rows: PreviewRow[]; summary: UploadSummary; eventWarning: string | null }
    try {
        parseResult = await parseAndValidateParticipants(
            parsedJson,
            (categories ?? []) as EventCategory[],
            (existingRegistrations ?? []) as Array<{
                participant_identifier: string | null
                participant_name: string
                category_id: string | null
                event_categories: { name: string | null } | { name: string | null }[] | null
            }>,
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Parse failed.'
        redirect(buildImportRedirect(eventId, { error: 'parse_failed', message }))
    }

    const importFingerprint = JSON.stringify(parsedJson)
    const { data: existingBatch } = await supabase
        .from('event_import_batches')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('import_fingerprint', importFingerprint)
        .maybeSingle()

    if (existingBatch?.status === 'confirmed') {
        redirect(buildImportRedirect(eventId, { error: 'repeated_confirm' }))
    }

    if (existingBatch && existingBatch.status !== 'confirmed') {
        await supabase.from('event_import_rows').delete().eq('batch_id', existingBatch.id)
        await supabase
            .from('event_import_batches')
            .update({
                status: 'validated',
                row_count: parseResult.summary.total,
                source_filename: file.name,
                uploaded_by: profile.id,
                error_summary: parseResult.summary,
            })
            .eq('id', existingBatch.id)

        if (parseResult.rows.length > 0) {
            await supabase.from('event_import_rows').insert(
                parseResult.rows.map((row) => ({
                    batch_id: existingBatch.id,
                    row_index: row.rowIndex,
                    payload: row.payload,
                    validation_status: row.validationStatus,
                    messages: row.messages,
                })),
            )
        }

        await supabase
            .from('events')
            .update({ import_status: 'validated' })
            .eq('id', eventId)

        revalidatePath(`/portal/events/${eventId}/import`)
        redirect(
            buildImportRedirect(eventId, {
                batchId: existingBatch.id,
                uploaded: '1',
                eventWarning: parseResult.eventWarning ? '1' : '0',
            }),
        )
    }

    const { data: newBatch, error: batchError } = await supabase
        .from('event_import_batches')
        .insert({
            event_id: eventId,
            uploaded_by: profile.id,
            source_type: sourceType,
            source_filename: file.name,
            import_fingerprint: importFingerprint,
            status: 'validated',
            row_count: parseResult.summary.total,
            error_summary: parseResult.summary,
        })
        .select('id')
        .single()

    if (batchError || !newBatch) {
        redirect(buildImportRedirect(eventId, { error: 'batch_create_failed' }))
    }

    if (parseResult.rows.length > 0) {
        const { error: rowError } = await supabase.from('event_import_rows').insert(
            parseResult.rows.map((row) => ({
                batch_id: newBatch.id,
                row_index: row.rowIndex,
                payload: row.payload,
                validation_status: row.validationStatus,
                messages: row.messages,
            })),
        )

        if (rowError) {
            await supabase.from('event_import_batches').delete().eq('id', newBatch.id)
            redirect(buildImportRedirect(eventId, { error: 'row_insert_failed' }))
        }
    }

    await supabase
        .from('events')
        .update({ import_status: 'validated' })
        .eq('id', eventId)

    revalidatePath(`/portal/events/${eventId}/import`)
    redirect(
        buildImportRedirect(eventId, {
            batchId: newBatch.id,
            uploaded: '1',
            eventWarning: parseResult.eventWarning ? '1' : '0',
        }),
    )
}

async function confirmImportAction(formData: FormData) {
    'use server'

    const { supabase, profile } = await requirePortalSession()
    if (!isSuperAdmin(profile)) redirect('/portal')

    const eventId = String(formData.get('eventId') ?? '').trim()
    const batchId = String(formData.get('batchId') ?? '').trim()
    const confirm = String(formData.get('confirmImport') ?? '').trim()

    if (!eventId || !batchId) redirect('/portal/events')

    if (confirm !== 'yes') {
        redirect(buildImportRedirect(eventId, { batchId, error: 'confirm_required' }))
    }

    const { data: batch } = await supabase
        .from('event_import_batches')
        .select('id, event_id, status')
        .eq('id', batchId)
        .maybeSingle()

    if (!batch || batch.event_id !== eventId) {
        redirect(buildImportRedirect(eventId, { error: 'stale_preview' }))
    }

    if (batch.status === 'confirmed') {
        redirect(buildImportRedirect(eventId, { batchId, error: 'repeated_confirm' }))
    }

    if (batch.status !== 'validated') {
        redirect(buildImportRedirect(eventId, { batchId, error: 'stale_preview' }))
    }

    const { data: rows } = await supabase
        .from('event_import_rows')
        .select('id, payload, validation_status')
        .eq('batch_id', batchId)
        .order('row_index', { ascending: true })

    const previewRows = rows ?? []
    if (previewRows.length === 0) {
        redirect(buildImportRedirect(eventId, { batchId, error: 'stale_preview' }))
    }

    const blockingRows = previewRows.filter(
        (row) => row.validation_status === 'error' || row.validation_status === 'duplicate',
    )

    if (blockingRows.length > 0) {
        redirect(buildImportRedirect(eventId, { batchId, error: 'blocking_rows' }))
    }

    const { data: categories } = await supabase
        .from('event_categories')
        .select('id, name')
        .eq('event_id', eventId)

    const categoryMap = new Map<string, string>()
    for (const category of categories ?? []) {
        categoryMap.set(toLowerKey(category.name), category.id)
    }

    const inserts = previewRows.map((row) => {
        const payload = row.payload
        if (!isParsedParticipantPayload(payload)) {
            return null
        }

        const categoryId = categoryMap.get(toLowerKey(payload.category)) ?? null
        return {
            event_id: eventId,
            participant_name: payload.participantName,
            participant_identifier: payload.participantIdentifier,
            dojo: payload.dojo,
            belt_rank: payload.beltRank,
            gender: payload.gender,
            age: payload.age,
            category_id: categoryId,
            raw_payload: payload.rawPayload,
        }
    })

    if (inserts.some((row) => row === null)) {
        redirect(buildImportRedirect(eventId, { batchId, error: 'malformed_rows' }))
    }

    const normalizedInserts = inserts.filter((row): row is NonNullable<typeof row> => !!row)

    const hasMissingCategory = normalizedInserts.some((row) => !row.category_id)
    if (hasMissingCategory) {
        redirect(buildImportRedirect(eventId, { batchId, error: 'stale_preview' }))
    }

    const { error: insertError } = await supabase.from('event_registrations').insert(normalizedInserts)

    if (insertError) {
        redirect(buildImportRedirect(eventId, { batchId, error: 'confirm_failed' }))
    }

    const { error: batchUpdateError } = await supabase
        .from('event_import_batches')
        .update({ status: 'confirmed' })
        .eq('id', batchId)

    if (batchUpdateError) {
        redirect(buildImportRedirect(eventId, { batchId, error: 'confirm_failed' }))
    }

    await supabase
        .from('events')
        .update({ import_status: 'imported' })
        .eq('id', eventId)

    await writeAuditLogSafe(supabase, {
        actorUserId: profile.id,
        action: 'import_confirmed',
        entityType: 'event_import_batch',
        entityId: batchId,
        eventId,
        afterState: {
            imported_rows: normalizedInserts.length,
            status: 'confirmed',
        },
    })

    revalidatePath('/portal/events')
    revalidatePath(`/portal/events/${eventId}`)
    revalidatePath(`/portal/events/${eventId}/import`)
    revalidatePath('/portal/audit')
    redirect(buildImportRedirect(eventId, { batchId, success: 'imported' }))
}

type PortalEventImportPageProps = {
    params: Promise<{ eventId: string }>
    searchParams?: Promise<Record<string, string | undefined>>
}

export default async function PortalEventImportPage({ params, searchParams }: PortalEventImportPageProps) {
    const { eventId } = await params
    const { supabase, profile } = await requirePortalSession()

    if (!isSuperAdmin(profile)) {
        const assignment = await getRegistrarEventAccess(supabase, profile.id, eventId)
        redirect(assignment ? `/portal/events/${eventId}/results` : '/portal')
    }

    const { data: event } = await supabase
        .from('events')
        .select('id, name, date, status, results_locked, import_status')
        .eq('id', eventId)
        .maybeSingle()

    if (!event) notFound()

    const query = await searchParams
    const batchId = query?.batchId ?? ''

    let batch:
        | {
            id: string
            source_filename: string
            status: string
            row_count: number
            created_at: string
            error_summary: UploadSummary | null
        }
        | null = null

    let previewRows: Array<{
        id: string
        row_index: number
        payload: ParsedParticipant
        validation_status: ImportRowStatus
        messages: string[]
    }> = []

    if (batchId) {
        const { data: batchData } = await supabase
            .from('event_import_batches')
            .select('id, source_filename, status, row_count, created_at, error_summary')
            .eq('id', batchId)
            .eq('event_id', eventId)
            .maybeSingle()

        if (batchData) {
            batch = batchData as {
                id: string
                source_filename: string
                status: string
                row_count: number
                created_at: string
                error_summary: UploadSummary | null
            }

            const { data: rowsData } = await supabase
                .from('event_import_rows')
                .select('id, row_index, payload, validation_status, messages')
                .eq('batch_id', batchId)
                .order('row_index', { ascending: true })

            previewRows = (rowsData ?? []) as Array<{
                id: string
                row_index: number
                payload: ParsedParticipant
                validation_status: ImportRowStatus
                messages: string[]
            }>
        }
    }

    const summary: UploadSummary = batch?.error_summary ?? buildSummary(
        previewRows.map((row) => ({
            rowIndex: row.row_index,
            payload: row.payload,
            validationStatus: row.validation_status,
            messages: row.messages,
        })),
    )

    const hasBlockingRows = summary.error > 0 || summary.duplicate > 0

    const error = query?.error
    const success = query?.success

    const errorMessageMap: Record<string, string> = {
        missing_file: 'Select a .json or .xlsx file to upload.',
        unsupported_file: 'Only .json and .xlsx files are supported.',
        empty_file: 'The uploaded file is empty.',
        invalid_json: 'The file is not valid JSON.',
        excel_parse_failed: query?.message || 'Could not read the Excel workbook.',
        parse_failed: query?.message || 'Could not parse the upload payload.',
        batch_create_failed: 'Could not create an import batch. Please try again.',
        row_insert_failed: 'Preview rows could not be stored. Please retry upload.',
        confirm_required: 'Tick the confirmation checkbox before importing.',
        repeated_confirm: 'This batch was already imported. Re-confirm is blocked.',
        stale_preview: 'The preview is stale or unavailable. Re-upload the file to refresh validation.',
        malformed_rows: 'Some preview rows are malformed. Re-upload the file and validate again.',
        blocking_rows: 'Import blocked: resolve duplicate/error rows before confirmation.',
        confirm_failed: 'Import confirmation failed. No changes were finalized.',
    }

    const infoBanner = query?.eventWarning === '1'

    return (
        <section className="space-y-6">
            <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                            Import
                        </div>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{event.name}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                            Upload participant data as JSON or Excel. Both formats share the same validation and preview pipeline before final confirmation.
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
                    <Link href={`/portal/events/${eventId}`} className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
                        Overview
                    </Link>
                    <Link href={`/portal/events/${eventId}/access`} className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
                        Access
                    </Link>
                    <Link href={`/portal/events/${eventId}/import`} className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-foreground">
                        Import
                    </Link>
                    <Link href={`/portal/events/${eventId}/results`} className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
                        Results
                    </Link>
                </nav>
            </div>

            <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 1 · Upload file</div>
                        <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Import registrations</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Upload participant data as JSON or Excel. Both formats go through the same validation pipeline before you can confirm import.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                        Current event import status: <span className="font-semibold text-foreground">{event.import_status}</span>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Template requirements</div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Excel workbooks must use a sheet named{' '}
                        <span className="font-semibold text-foreground">Participants</span> with the following column headers in row 1. No merged cells, no formulas in identity columns.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {(['participant_identifier', 'participant_name', 'dojo', 'belt_rank', 'gender', 'age', 'category'] as const).map((col) => (
                            <code
                                key={col}
                                className="rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-[11px] text-foreground"
                            >
                                {col}
                            </code>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        JSON format uses the same fields in camelCase under a{' '}
                        <code className="font-mono text-foreground">participants</code> array. Both formats share identical downstream validation.
                    </p>
                    <a
                        href="/honorlog-import-template.csv"
                        download="honorlog-import-template.csv"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-background/80"
                    >
                        Download CSV template
                    </a>
                </div>

                <form action={uploadFileAction} className="mt-5 grid gap-4">
                    <input type="hidden" name="eventId" value={eventId} />
                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Import file (.json or .xlsx)</span>
                        <input
                            type="file"
                            name="importFile"
                            accept=".json,application/json,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-primary-foreground"
                        />
                    </label>
                    <button
                        type="submit"
                        className="w-fit rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground"
                    >
                        Validate and preview
                    </button>
                </form>

                {error ? (
                    <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                        {errorMessageMap[error] ?? 'Import workflow failed. Please retry.'}
                    </div>
                ) : null}

                {success === 'imported' ? (
                    <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        Import confirmed successfully. Rows were inserted into event registrations.
                    </div>
                ) : null}

                {infoBanner ? (
                    <div className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                        JSON event metadata was incomplete. Import still uses the selected event from this page.
                    </div>
                ) : null}
            </div>

            <div className="panel p-6 sm:p-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 2 · Validation summary</div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Preview readiness</h3>

                {!batch ? (
                    <div className="mt-5 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                        Upload a JSON or Excel file to generate a persisted preview batch with row-level validation status.
                    </div>
                ) : (
                    <>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Batch</div>
                                <div className="mt-1 text-sm font-semibold text-foreground">{batch.id.slice(0, 8)}...</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-emerald-500/5 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Valid</div>
                                <div className="mt-1 text-sm font-semibold text-foreground">{summary.valid}</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-amber-500/5 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Warning</div>
                                <div className="mt-1 text-sm font-semibold text-foreground">{summary.warning}</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-sky-500/5 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Duplicate</div>
                                <div className="mt-1 text-sm font-semibold text-foreground">{summary.duplicate}</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-rose-500/5 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Error</div>
                                <div className="mt-1 text-sm font-semibold text-foreground">{summary.error}</div>
                            </div>
                        </div>

                        <p className="mt-4 text-sm text-muted-foreground">
                            File: <span className="font-medium text-foreground">{batch.source_filename}</span> · Rows: {batch.row_count}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Confirm import is allowed only when duplicate and error counts are zero.
                        </p>
                    </>
                )}
            </div>

            <div className="panel p-6 sm:p-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 3 · Row preview</div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Validation output</h3>

                {!batch || previewRows.length === 0 ? (
                    <div className="mt-5 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                        No preview rows yet.
                    </div>
                ) : (
                    <div className="mt-5 overflow-hidden rounded-3xl border border-border/70">
                        <div className="overflow-x-auto">
                            <div className="min-w-[760px]">
                                <div className="grid grid-cols-[84px_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.4fr)] gap-4 border-b border-border/70 bg-background/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <div>Row</div>
                                    <div>Participant</div>
                                    <div>Status</div>
                                    <div>Messages</div>
                                </div>
                                <div className="divide-y divide-border/70">
                                    {previewRows.map((row) => (
                                        <div key={row.id} className="grid grid-cols-[84px_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.4fr)] gap-4 px-4 py-4">
                                            <div className="text-sm font-semibold text-foreground">#{row.row_index}</div>
                                            <div>
                                                <div className="text-sm font-semibold text-foreground">{row.payload.participantName || '(missing name)'}</div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {row.payload.category || '(missing category)'}
                                                    {row.payload.participantIdentifier ? ` · ${row.payload.participantIdentifier}` : ''}
                                                </div>
                                            </div>
                                            <div>
                                                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusToneForPreview(row.validation_status)}`}>
                                                    {row.validation_status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {row.messages.length === 0 ? (
                                                    <span>Ready</span>
                                                ) : (
                                                    <ul className="space-y-1">
                                                        {row.messages.map((message, idx) => (
                                                            <li key={`${row.id}-${idx}`}>• {message}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="panel p-6 sm:p-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 4 · Confirm import</div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Finalize normalized registrations</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Confirmation inserts validated preview rows into event registrations. This action is blocked if duplicate or error rows remain.
                </p>

                {batch ? (
                    <form action={confirmImportAction} className="mt-5 grid gap-4">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="batchId" value={batch.id} />
                        <label className="inline-flex items-start gap-2 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                            <input type="checkbox" name="confirmImport" value="yes" className="mt-0.5 h-4 w-4 rounded border-border" />
                            <span>I confirm import for this batch.</span>
                        </label>
                        <button
                            type="submit"
                            disabled={hasBlockingRows || batch.status === 'confirmed'}
                            className="w-fit rounded-full bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {batch.status === 'confirmed' ? 'Already confirmed' : 'Confirm import'}
                        </button>
                        {hasBlockingRows ? (
                            <p className="text-sm text-rose-700 dark:text-rose-300">
                                Resolve duplicate and error rows before confirming import.
                            </p>
                        ) : null}
                    </form>
                ) : (
                    <div className="mt-5 rounded-3xl border border-dashed border-border bg-background/60 px-5 py-6 text-sm text-muted-foreground">
                        Confirm import is available after a preview batch is generated.
                    </div>
                )}
            </div>
        </section>
    )
}
