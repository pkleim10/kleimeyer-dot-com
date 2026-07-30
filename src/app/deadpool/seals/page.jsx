import { redirect } from 'next/navigation'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getSelectedSeasonYear } from '@/apps/deadpool/server/selectedSeason'
import { areListsPublic } from '@/apps/deadpool/server/season'
import { getSeals } from '@/apps/deadpool/server/seals'
import { getAllListsAnnotated } from '@/apps/deadpool/server/scoring'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import SealsTable from '@/apps/deadpool/components/SealsTable'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Sealed Lists',
  robots: 'noindex, nofollow',
}

export default async function SealsPage() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect('/deadpool/signin')
  }

  const seasonYear = await getSelectedSeasonYear()
  const revealed = areListsPublic(seasonYear)
  const seals = await getSeals(seasonYear)

  // Once lists are public, hand over the revealed names too so the page can
  // recompute each fingerprint in the browser and prove nothing changed.
  const lists = revealed ? await getAllListsAnnotated(seasonYear) : []
  const listsByParticipant = Object.fromEntries(
    lists.map((entry) => [entry.participantId, entry.picks.map((p) => p.name)])
  )

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex justify-center">
          <img
            src="/deadpool/seal.png"
            alt="An ancient wax-sealed envelope bearing the Flaming Red Head"
            className="block w-36 sm:w-44"
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 62% 62% at 50% 50%, #000 45%, transparent 78%)',
              maskImage:
                'radial-gradient(ellipse 62% 62% at 50% 50%, #000 45%, transparent 78%)',
            }}
          />
        </div>
        <PageHeader
          showCrest={false}
          title="Sealed Lists"
          subtitle={`Every fingerprint committed for the ${seasonYear} season.`}
        />
        <SealsTable
          seals={seals}
          seasonYear={seasonYear}
          revealed={revealed}
          listsByParticipant={listsByParticipant}
        />
      </div>
    </div>
  )
}
