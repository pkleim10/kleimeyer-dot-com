import { redirect } from 'next/navigation'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getPicksForParticipant } from '@/apps/deadpool/server/picks'
import { isPicksEditable, getPickDeadline } from '@/apps/deadpool/server/season'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import PicksEditor from '@/apps/deadpool/components/PicksEditor'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — My Picks',
  robots: 'noindex, nofollow',
}

export default async function PicksPage() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect('/deadpool/register')
  }

  const seasonYear = await getActiveSeasonYear()
  const picks = await getPicksForParticipant(participant.id, seasonYear)
  const isEditable = isPicksEditable(seasonYear)
  const deadline = getPickDeadline(seasonYear).toISOString()

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-lg px-4 py-10">
        <PageHeader
          title="My Picks"
          subtitle={`${participant.display_name} · ${seasonYear} season`}
        />
        <PicksEditor initialPicks={picks} isEditable={isEditable} deadline={deadline} />
      </div>
    </div>
  )
}
