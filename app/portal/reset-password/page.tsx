import Link from 'next/link'
import ResetPasswordForm from './ResetPasswordForm'

export default function PortalResetPasswordPage() {
    return (
        <section className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-7xl items-center px-4 py-14 sm:px-6 sm:py-20">
            <div className="panel mx-auto w-full max-w-md p-6 sm:p-7">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Recovery
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                    Set a new password
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Enter your new password to complete account recovery.
                </p>

                <ResetPasswordForm />

                <Link
                    href="/portal/login"
                    className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                >
                    Back to login
                </Link>
            </div>
        </section>
    )
}
