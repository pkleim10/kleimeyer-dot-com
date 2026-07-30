import { redirect } from 'next/navigation'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getAllListsAnnotated } from '@/apps/deadpool/server/scoring'
import { areListsPublic } from '@/apps/deadpool/server/season'
import { getSelectedSeasonYear } from '@/apps/deadpool/server/selectedSeason'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import AllListsView from '@/apps/deadpool/components/AllListsView'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: "Dead Pool — Everyone's Lists",
  robots: 'noindex, nofollow',
}

export default async function ListsPage() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect('/deadpool/signin')
  }

  const seasonYear = await getSelectedSeasonYear()
  const seasonStarted = areListsPublic(seasonYear)
  const lists = await getAllListsAnnotated(seasonYear)

  // Lists stay private to their owner until the season starts.
  const visibleLists = seasonStarted
    ? lists
    : lists.filter((entry) => entry.participantId === participant.id)

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          title="Everyone's Lists"
          subtitle={`Every team's picks for the ${seasonYear} season.`}
        />
        <AllListsView lists={visibleLists} seasonStarted={seasonStarted} />
      </div>
    </div>
  )
}
