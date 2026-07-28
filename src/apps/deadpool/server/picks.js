import { getServiceClient } from './db'

export async function getPicksForParticipant(participantId, seasonYear) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('deadpool_picks')
    .select('id, name')
    .eq('participant_id', participantId)
    .eq('season_year', seasonYear)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}
