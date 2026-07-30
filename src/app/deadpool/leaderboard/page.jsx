import { redirect } from 'next/navigation'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getLeaderboard } from '@/apps/deadpool/server/scoring'
import { getSelectedSeasonYear } from '@/apps/deadpool/server/selectedSeason'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import LeaderboardTable from '@/apps/deadpool/components/LeaderboardTable'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Leaderboard',
  robots: 'noindex, nofollow',
}

export default async function LeaderboardPage() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect('/deadpool/signin')
  }

  const leaderboard = await getLeaderboard(await getSelectedSeasonYear(), 20)

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Leaderboard" subtitle="Top 20 · highest point total wins." />
        <LeaderboardTable leaderboard={leaderboard} />
      </div>
    </div>
  )
}
