import Link from 'next/link'
import { Panel, EmptyState } from './ui.jsx'
import { shortFingerprint } from '@/apps/deadpool/shared/sealedList'

export default function AllListsView({ lists, seasonStarted = true, fingerprints = {} }) {
  if (lists.length === 0) {
    return <EmptyState>No lists have been made yet this season.</EmptyState>
  }

  return (
    <div className="space-y-4">
      {!seasonStarted && (
        <Panel className="border-amber-900/50 p-4">
          <p className="text-sm text-amber-200/80">
            <span className="font-display uppercase tracking-[0.14em] text-amber-300">Private</span>{' '}
            — lists stay hidden until the season starts on January 1, so for now you can only see your
            own. Once it starts, everyone&apos;s list becomes visible to everyone.
          </p>
        </Panel>
      )}

      {/* The fingerprint beside each name is the stored value, so matching it by
          eye against the Sealed Lists page is a convenience, not a proof — both
          pages read the same row. The check that carries weight is the
          browser-side recomputation on Sealed Lists, so link players to it. */}
      {seasonStarted && (
        <p className="text-xs leading-relaxed text-zinc-500">
          Each fingerprint below is the one its owner sealed before the deadline.{' '}
          <Link href="/deadpool/seals" className="text-red-400 underline hover:text-red-300">
            Sealed Lists
          </Link>{' '}
          recomputes them in your own browser, so you don&apos;t have to take anyone&apos;s word for
          it.
        </p>
      )}

      {lists.map((entry) => {
        const hitCount = entry.picks.filter((pick) => pick.isHit).length
        const fingerprint = fingerprints[entry.participantId]
        return (
          // Native <details> rather than a client component: the whole page is
          // server-rendered, and this keeps it that way — no hydration, and the
          // blinds work with JS off and are keyboard-operable for free.
          <Panel key={entry.participantId} as="details" className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-baseline gap-3 [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-xs text-red-700 transition-transform duration-200 group-open:rotate-90"
              >
                &#9654;
              </span>
              <h3 className="min-w-0 flex-1 font-display text-lg tracking-wide text-white">
                {entry.displayName}
                {fingerprint && (
                  <span className="ml-3 font-mono text-xs font-normal tracking-normal text-red-400/80">
                    {shortFingerprint(fingerprint)}…
                  </span>
                )}
              </h3>
              <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                {entry.picks.length} {entry.picks.length === 1 ? 'pick' : 'picks'}
                {hitCount > 0 && (
                  <span className="text-red-500">
                    {' '}
                    · {hitCount} hit{hitCount === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            </summary>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              {entry.picks.length === 0 ? (
                <p className="text-sm text-zinc-600">No picks yet.</p>
              ) : (
                <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {entry.picks.map((pick) => (
                    <li key={pick.name} className="flex items-baseline gap-2 text-sm">
                      {pick.isHit ? (
                        <>
                          <span className="text-red-600" aria-hidden="true" title="deceased">
                            &#8224;
                          </span>
                          <span className="text-red-400 line-through decoration-red-700/70">
                            {pick.name}
                          </span>
                          <span className="text-[11px] text-zinc-600">age {pick.ageAtDeath}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-zinc-700" aria-hidden="true">
                            &middot;
                          </span>
                          <span className="text-gray-300">{pick.name}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Panel>
        )
      })}
    </div>
  )
}
