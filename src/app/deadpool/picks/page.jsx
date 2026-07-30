import { redirect } from 'next/navigation'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getPicksForParticipant } from '@/apps/deadpool/server/picks'
import { isPicksEditable, getPickDeadline } from '@/apps/deadpool/server/season'
import { getSelectedSeasonYear } from '@/apps/deadpool/server/selectedSeason'
import { getActiveSeal } from '@/apps/deadpool/server/seals'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import SealedListEditor from '@/apps/deadpool/components/SealedListEditor'
import { PageHeader, Panel, SectionTitle } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — My Picks',
  robots: 'noindex, nofollow',
}

export default async function PicksPage() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect('/deadpool/signin')
  }

  const seasonYear = await getSelectedSeasonYear()
  const canSeal = isPicksEditable(seasonYear)
  const deadline = getPickDeadline(seasonYear).toISOString()
  const seal = await getActiveSeal(participant.id, seasonYear)

  // Picks only exist server-side once revealed; before then there is nothing
  // to show but the fingerprint.
  const picks = canSeal ? [] : await getPicksForParticipant(participant.id, seasonYear)

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title="My Picks"
          subtitle={`${participant.display_name} · ${seasonYear} season`}
        />

        {picks.length > 0 && (
          <Panel className="mb-5 p-5">
            <SectionTitle className="mb-3">Your revealed list</SectionTitle>
            <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {picks.map((pick, i) => (
                <li key={pick.id} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right font-display text-xs text-zinc-600">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-gray-200">{pick.name}</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        <SealedListEditor
          seasonYear={seasonYear}
          canSeal={canSeal}
          deadline={deadline}
          initialSeal={seal}
          revealed={picks.length > 0}
        />
      </div>
    </div>
  )
}
