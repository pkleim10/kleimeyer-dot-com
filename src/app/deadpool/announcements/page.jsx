import { redirect } from 'next/navigation'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getAnnouncementFeed } from '@/apps/deadpool/server/announcements'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import AnnouncementsFeed from '@/apps/deadpool/components/AnnouncementsFeed'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Announcements',
  robots: 'noindex, nofollow',
}

export default async function AnnouncementsPage() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect('/deadpool/register')
  }

  const items = await getAnnouncementFeed(await getActiveSeasonYear())

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Announcements" subtitle="Notices from the commissioner." />
        <AnnouncementsFeed items={items} />
      </div>
    </div>
  )
}
