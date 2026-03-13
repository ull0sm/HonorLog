import PortalScaffoldCard from '../../_components/PortalScaffoldCard'

export default async function PortalEventDetailPage({
    params,
}: {
    params: Promise<{ eventId: string }>
}) {
    const { eventId } = await params

    return (
        <PortalScaffoldCard
            title={`Event ${eventId}`}
            description="Placeholder for event overview and management tabs."
            phaseNote="Event-level access, import, and results workflows are scaffolded only."
            links={[
                { href: `/portal/events/${eventId}/access`, label: 'Access control route scaffold' },
                { href: `/portal/events/${eventId}/import`, label: 'Import route scaffold' },
                { href: `/portal/events/${eventId}/results`, label: 'Results route scaffold' },
            ]}
        />
    )
}
