import Link from 'next/link'

interface PortalScaffoldCardProps {
    title: string
    description: string
    phaseNote: string
    links?: Array<{ href: string; label: string }>
}

export default function PortalScaffoldCard({
    title,
    description,
    phaseNote,
    links = [],
}: PortalScaffoldCardProps) {
    return (
        <section className="panel p-6 sm:p-8">
            <div className="inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                Portal scaffold
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>
            <p className="mt-6 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {phaseNote}
            </p>

            {links.length > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="panel-soft px-4 py-3 text-sm text-foreground transition-colors hover:text-primary"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}
