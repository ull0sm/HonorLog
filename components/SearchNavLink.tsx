'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SearchNavLinkProps {
    className?: string
}

export default function SearchNavLink({ className }: SearchNavLinkProps) {
    const pathname = usePathname()

    const focusSearchInput = () => {
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null

        if (!searchInput) {
            return
        }

        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        window.history.replaceState(null, '', '/#search-input')

        window.requestAnimationFrame(() => {
            searchInput.focus()
        })
    }

    return (
        <Link
            href="/#search-input"
            className={className}
            onClick={(event) => {
                if (pathname === '/') {
                    event.preventDefault()
                    focusSearchInput()
                }
            }}
        >
            Search
        </Link>
    )
}