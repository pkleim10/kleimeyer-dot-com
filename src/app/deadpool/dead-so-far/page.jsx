import { redirect } from 'next/navigation'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getHitsWithPickers } from '@/apps/deadpool/server/scoring'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import DeadSoFarRecap from '@/apps/deadpool/components/DeadSoFarRecap'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Dead So Far',
  robots: 'noindex, nofollow',
}

async function countTotalPicks(seasonYear) {
  const supabase = getServiceClient()
  const { count, error } = await supabase
    .from('deadpool_picks')
    .select('id', { count: 'exact', head: true })
    .eq('season_year', seasonYear)

  if (error) return 0
  return count || 0
}

export default async function DeadSoFarPage() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect('/deadpool/signin')
  }

  const seasonYear = await getActiveSeasonYear()
  const [hits, totalPicks] = await Promise.all([
    getHitsWithPickers(seasonYear),
    countTotalPicks(seasonYear),
  ])

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Dead So Far" subtitle={`The ${seasonYear} season, running tally.`} />
        <DeadSoFarRecap hits={hits} totalPicks={totalPicks} />
      </div>
    </div>
  )
}
