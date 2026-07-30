'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// `afterReveal` pages have nothing to show until the season opens: no list is
// public, the leaderboard has nothing to rank, and no death can be recorded
// before Jan 1 (validateHit rejects earlier dates), so tips have nothing to
// report. Hiding them keeps the pre-season nav to what's actionable.
//
// `beforeUnseal` / `afterUnseal` track the player's own reveal: until they
// paste their list, My Picks and Sealed Lists stay available and Everyone's
// Lists stays hidden so they can't browse peers before committing.
const LINKS = [
  { href: '/deadpool/rules', label: 'Rules' },
  { href: '/deadpool/picks', label: 'My Picks', beforeUnseal: true },
  { href: '/deadpool/seals', label: 'Sealed Lists', beforeUnseal: true },
  { href: '/deadpool/announcements', label: 'Announcements' },
  { href: '/deadpool/lists', label: "Everyone's Lists", afterReveal: true, afterUnseal: true },
  { href: '/deadpool/leaderboard', label: 'Leaderboard', afterReveal: true },
  { href: '/deadpool/dead-so-far', label: 'Dead So Far', afterReveal: true },
  { href: '/deadpool/submit', label: 'Submit a Tip', afterReveal: true },
]

// Split out from DeadpoolNav (a Server Component, since it reads the session
// and the active season) purely so the active-link highlight can use
// usePathname.
export default function DeadpoolNavLinks({ revealed = true, hasUnsealedList = false }) {
  const pathname = usePathname()
  const links = LINKS.filter((link) => {
    if (link.afterReveal && !revealed) return false
    if (link.afterUnseal && !hasUnsealedList) return false
    if (link.beforeUnseal && hasUnsealedList) return false
    return true
  })

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <Link
        href="/deadpool"
        className="font-display text-sm uppercase tracking-[0.16em] text-red-500 transition hover:text-red-400"
      >
        Dead Pool
      </Link>
      {links.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={
              isActive
                ? 'border-b border-red-600 pb-0.5 text-white'
                : 'border-b border-transparent pb-0.5 text-gray-400 transition hover:text-white'
            }
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
