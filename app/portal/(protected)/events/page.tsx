import PortalScaffoldCard from '../_components/PortalScaffoldCard'

export default function PortalEventsPage() {
    return (
        <PortalScaffoldCard
            title="Events workspace"
            description="This route is reserved for event list and status tooling in later phases."
            phaseNote="No event CRUD is implemented yet. This page exists only to lock route structure early."
            links={[
                { href: '/portal/events/new', label: 'New event route scaffold' },
                { href: '/portal/events/example-event', label: 'Event detail route scaffold' },
            ]}
        />
    )
}
