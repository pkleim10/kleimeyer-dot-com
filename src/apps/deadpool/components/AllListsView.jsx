import { Panel, EmptyState } from './ui.jsx'

export default function AllListsView({ lists, seasonStarted = true }) {
  if (lists.length === 0) {
    return <EmptyState>No lists have been made yet this season.</EmptyState>
  }

  return (
    <div className="space-y-5">
      {!seasonStarted && (
        <Panel className="border-amber-900/50 p-4">
          <p className="text-sm text-amber-200/80">
            <span className="font-display uppercase tracking-[0.14em] text-amber-300">Private</span>{' '}
            — lists stay hidden until the season starts on January 1, so for now you can only see your
            own. Once it starts, everyone&apos;s list becomes visible to everyone.
          </p>
        </Panel>
      )}

      {lists.map((entry) => {
        const hitCount = entry.picks.filter((pick) => pick.isHit).length
        return (
          <Panel key={entry.participantId} className="p-5">
            <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-zinc-800 pb-3">
              <h3 className="font-display text-lg tracking-wide text-white">{entry.displayName}</h3>
              <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                {entry.picks.length} {entry.picks.length === 1 ? 'pick' : 'picks'}
                {hitCount > 0 && <span className="text-red-500"> · {hitCount} hit{hitCount === 1 ? '' : 's'}</span>}
              </span>
            </div>

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
          </Panel>
        )
      })}
    </div>
  )
}
