import PortalScaffoldCard from './_components/PortalScaffoldCard'

export default function PortalDashboardPage() {
    return (
        <PortalScaffoldCard
            title="Portal dashboard"
            description="This protected route confirms that portal pages are now separated from the public student search surface and ready for authenticated workflows."
            phaseNote="Phase 0 foundation only: business features, role checks, and data mutations are intentionally deferred."
            links={[
                { href: '/portal/events', label: 'Open event routes scaffold' },
            ]}
        />
    )
}
