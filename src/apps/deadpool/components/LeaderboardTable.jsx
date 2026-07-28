import { Panel, EmptyState, thClass } from './ui.jsx'

// Metallic treatments for the podium; everyone else gets a plain numeral.
const MEDALS = {
  0: 'border-amber-300/60 bg-amber-300/10 text-amber-200',
  1: 'border-zinc-300/50 bg-zinc-300/10 text-zinc-200',
  2: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
}

function RankBadge({ index }) {
  const medal = MEDALS[index]
  if (!medal) {
    return <span className="inline-block w-8 text-center text-sm text-zinc-600">{index + 1}</span>
  }
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border font-display text-sm ${medal}`}
    >
      {index + 1}
    </span>
  )
}

export default function LeaderboardTable({ leaderboard }) {
  if (leaderboard.length === 0) {
    return <EmptyState>No one has made a list yet this season.</EmptyState>
  }

  return (
    <Panel className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className={`${thClass} pl-4`}>Rank</th>
            <th className={thClass}>Team</th>
            <th className={`${thClass} text-right`}>Points</th>
            <th className={`${thClass} pr-4 text-right`}>Hits</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr
              key={entry.participantId}
              className={`border-b border-zinc-900/70 transition last:border-0 hover:bg-red-950/20 ${
                index === 0 ? 'bg-red-950/20' : ''
              }`}
            >
              <td className="py-3 pl-4 pr-4">
                <RankBadge index={index} />
              </td>
              <td
                className={`py-3 pr-4 ${
                  index === 0 ? 'font-display tracking-wide text-white' : 'text-gray-200'
                }`}
              >
                {entry.displayName}
              </td>
              <td className="py-3 pr-4 text-right">
                <span
                  className={`font-display ${
                    index === 0
                      ? 'text-2xl text-red-400 drop-shadow-[0_0_12px_rgba(220,38,38,0.55)]'
                      : 'text-lg text-red-500/90'
                  }`}
                >
                  {entry.points}
                </span>
              </td>
              <td className="py-3 pr-4 text-right text-sm text-gray-400">{entry.hitCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
