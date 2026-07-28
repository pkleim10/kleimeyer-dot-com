import { redirect } from 'next/navigation'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getServiceClient } from '@/apps/deadpool/server/db'
import { getActiveSeasonYear } from '@/apps/deadpool/server/settings'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import SubmissionForm from '@/apps/deadpool/components/SubmissionForm'
import { PageHeader } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Submit a Tip',
  robots: 'noindex, nofollow',
}

export default async function SubmitPage() {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect('/deadpool/register')
  }

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('deadpool_submissions')
    .select('id, name, note, status, created_at, reviewed_at')
    .eq('participant_id', participant.id)
    .eq('season_year', await getActiveSeasonYear())
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-lg px-4 py-10">
        <PageHeader
          title="Submit a Tip"
          subtitle="Saw a death that should count? Let the commissioner know."
        />
        <SubmissionForm initialSubmissions={data || []} />
      </div>
    </div>
  )
}
