'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/deadpool/rules', label: 'Rules' },
  { href: '/deadpool/picks', label: 'My Picks' },
  { href: '/deadpool/lists', label: "Everyone's Lists" },
  { href: '/deadpool/leaderboard', label: 'Leaderboard' },
  { href: '/deadpool/announcements', label: 'Announcements' },
  { href: '/deadpool/dead-so-far', label: 'Dead So Far' },
  { href: '/deadpool/submit', label: 'Submit a Tip' },
]

// Split out from DeadpoolNav (a Server Component, since it reads the
// session) purely so the active-link highlight can use usePathname.
export default function DeadpoolNavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <Link
        href="/deadpool"
        className="font-display text-sm uppercase tracking-[0.16em] text-red-500 transition hover:text-red-400"
      >
        Dead Pool
      </Link>
      {LINKS.map((link) => {
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
