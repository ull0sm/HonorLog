export default function PortalRootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</div>
}
