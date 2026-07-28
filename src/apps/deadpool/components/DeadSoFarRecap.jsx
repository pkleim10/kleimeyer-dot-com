import { Panel, StatTile, EmptyState, thClass, formatDeathDate } from './ui.jsx'

export default function DeadSoFarRecap({ hits, totalPicks }) {
  const confirmedCount = hits.length
  const percent = totalPicks > 0 ? Math.round((confirmedCount / totalPicks) * 100) : 0
  const totalPoints = hits.reduce((sum, hit) => sum + hit.totalPoints, 0)

  return (
    <div className="space-y-6">
      <Panel className="p-4">
        <div className="flex flex-wrap gap-3">
          <StatTile value={confirmedCount} label="Confirmed dead" tone="accent" />
          <StatTile value={totalPicks} label="Picks in play" />
          <StatTile value={totalPoints} label="Points awarded" />
        </div>

        <div className="mt-4 px-1">
          <div className="mb-1.5 flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            <span>Board cleared</span>
            <span className="text-zinc-400">{percent}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Share of picks confirmed dead"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-800 to-red-500 shadow-[0_0_12px_rgba(220,38,38,0.7)]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </Panel>

      {hits.length === 0 ? (
        <EmptyState>Nobody on anyone&apos;s list has died yet this season.</EmptyState>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className={`${thClass} pl-4`}>Name</th>
                <th className={thClass}>Date</th>
                <th className={`${thClass} text-right`}>Age</th>
                <th className={`${thClass} text-right`}>Points</th>
                <th className={`${thClass} pr-4`}>Called by</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((hit) => (
                <tr
                  key={hit.id}
                  className="border-b border-zinc-900/70 transition last:border-0 hover:bg-red-950/20"
                >
                  <td className="py-3 pl-4 pr-4">
                    <span className="mr-2 text-red-700" aria-hidden="true">
                      &#8224;
                    </span>
                    <span className="text-white">{hit.displayName}</span>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-sm text-gray-400">
                    {formatDeathDate(hit.dateOfDeath)}
                  </td>
                  <td className="py-3 pr-4 text-right text-sm text-gray-400">{hit.ageAtDeath}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-display text-lg text-red-500/90">{hit.totalPoints}</span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-400">
                    {hit.pickedBy.join(', ') || <span className="text-zinc-700">nobody</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  )
}
