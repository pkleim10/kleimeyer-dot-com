import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import {
  getAnnouncementFeed,
  markAnnouncementsSeen,
} from '@/apps/deadpool/server/announcements'
import { getSelectedSeasonYear } from '@/apps/deadpool/server/selectedSeason'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import AnnouncementsFeed from '@/apps/deadpool/components/AnnouncementsFeed'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Announcements',
  robots: 'noindex, nofollow',
}

export default async function AnnouncementsPage() {
  const participant = await getCurrentParticipant()
  const items = await getAnnouncementFeed(await getSelectedSeasonYear())

  // Visiting the feed clears the home-page callout for this player.
  if (participant) {
    try {
      await markAnnouncementsSeen(participant.id)
    } catch (error) {
      console.error('Failed to mark announcements seen:', error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Announcements" subtitle="Notices from The Commissioner." />
        <AnnouncementsFeed items={items} />
      </div>
    </div>
  )
}
