import Link from 'next/link'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import DeadpoolNavLinks from './DeadpoolNavLinks.jsx'
import SignOutButton from './SignOutButton.jsx'

export default async function DeadpoolNav() {
  const participant = await getCurrentParticipant()

  return (
    <nav className="sticky top-0 z-20 border-b border-zinc-800/80 bg-black/85 backdrop-blur-sm">
      {/* No flex-wrap on this row: the links wrap within their own column so
          the auth controls stay pinned top-right instead of dropping onto a
          third, left-aligned line. */}
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-x-6 px-4 py-3 text-sm">
        <div className="min-w-0 flex-1">
          <DeadpoolNavLinks />
        </div>
        <div className="flex shrink-0 items-center gap-x-4">
          {participant ? (
            <>
              <span className="hidden text-[11px] uppercase tracking-[0.14em] text-zinc-600 sm:inline">
                {participant.display_name}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/deadpool/signin" className="text-gray-400 transition hover:text-white">
                Sign In
              </Link>
              <Link
                href="/deadpool/register"
                className="rounded-md border border-red-800/70 px-2.5 py-1 text-red-400 transition hover:border-red-600 hover:text-red-300"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
      {/* Hairline ember glow under the bar. */}
      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-transparent via-red-900/60 to-transparent"
      />
    </nav>
  )
}
