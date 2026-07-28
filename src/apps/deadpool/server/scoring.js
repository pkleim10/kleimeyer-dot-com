import { getServiceClient } from './db'

export const BASE_SCORE = 100
export const UNIQUENESS_BONUS = 25

// Pure function: given a season's picks and hits, compute each hit's score.
// Kept separate from the DB queries below so it's directly unit-testable.
export function computeHitScores(picks, hits) {
  const pickersByName = new Map() // name_normalized -> Set<participant_id>
  for (const pick of picks) {
    const key = pick.name_normalized
    if (!pickersByName.has(key)) pickersByName.set(key, new Set())
    pickersByName.get(key).add(pick.participant_id)
  }

  return hits.map((hit) => {
    const pickers = pickersByName.get(hit.name_normalized) || new Set()
    const basePoints = BASE_SCORE - hit.age_at_death
    const bonus = pickers.size === 1 ? UNIQUENESS_BONUS : 0
    return {
      hit,
      pickerIds: Array.from(pickers),
      basePoints,
      bonus,
      totalPoints: basePoints + bonus,
    }
  })
}

export function computeParticipantTotals(hitScores) {
  const totals = new Map() // participant_id -> { points, hits: [...] }

  for (const scored of hitScores) {
    for (const participantId of scored.pickerIds) {
      if (!totals.has(participantId)) {
        totals.set(participantId, { points: 0, hits: [] })
      }
      const entry = totals.get(participantId)
      entry.points += scored.totalPoints
      entry.hits.push(scored)
    }
  }

  return totals
}

export async function getSeasonPicksAndHits(seasonYear) {
  const supabase = getServiceClient()

  const [{ data: picks, error: picksError }, { data: hits, error: hitsError }] = await Promise.all([
    supabase
      .from('deadpool_picks')
      .select('participant_id, name, name_normalized')
      .eq('season_year', seasonYear),
    supabase
      .from('deadpool_hits')
      .select('id, display_name, name_normalized, date_of_death, age_at_death, announcement_text')
      .eq('season_year', seasonYear)
      .order('date_of_death', { ascending: false }),
  ])

  if (picksError) throw picksError
  if (hitsError) throw hitsError

  return { picks: picks || [], hits: hits || [] }
}

export async function getLeaderboard(seasonYear, limit = 20) {
  const supabase = getServiceClient()
  const { picks, hits } = await getSeasonPicksAndHits(seasonYear)
  const totals = computeParticipantTotals(computeHitScores(picks, hits))

  // Participants are season-independent; the roster for a given season is
  // whoever has at least one pick row in it — a list is what makes you "in
  // the pool," not a season-scoped registration.
  const participantIds = Array.from(new Set(picks.map((pick) => pick.participant_id)))
  let participants = []
  if (participantIds.length > 0) {
    const { data, error } = await supabase
      .from('deadpool_participants')
      .select('id, display_name')
      .in('id', participantIds)
    if (error) throw error
    participants = data || []
  }

  const leaderboard = participants.map((participant) => {
    const entry = totals.get(participant.id)
    return {
      participantId: participant.id,
      displayName: participant.display_name,
      points: entry ? entry.points : 0,
      hitCount: entry ? entry.hits.length : 0,
    }
  })

  leaderboard.sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))

  return leaderboard.slice(0, limit)
}

// Season hits annotated with who picked them and the points each hit is
// worth — the shared data source behind the Announcements and Dead So Far
// pages, and the admin hits table.
export async function getHitsWithPickers(seasonYear) {
  const supabase = getServiceClient()
  const { picks, hits } = await getSeasonPicksAndHits(seasonYear)
  const hitScores = computeHitScores(picks, hits)

  const participantIds = Array.from(new Set(hitScores.flatMap((scored) => scored.pickerIds)))
  let namesById = new Map()
  if (participantIds.length > 0) {
    const { data: participants, error } = await supabase
      .from('deadpool_participants')
      .select('id, display_name')
      .in('id', participantIds)
    if (error) throw error
    namesById = new Map((participants || []).map((p) => [p.id, p.display_name]))
  }

  return hitScores.map((scored) => ({
    id: scored.hit.id,
    displayName: scored.hit.display_name,
    dateOfDeath: scored.hit.date_of_death,
    ageAtDeath: scored.hit.age_at_death,
    announcementText: scored.hit.announcement_text,
    basePoints: scored.basePoints,
    bonus: scored.bonus,
    totalPoints: scored.totalPoints,
    pickedBy: scored.pickerIds.map((id) => namesById.get(id)).filter(Boolean),
  }))
}

// Every participant's list for the season, each pick annotated with whether
// it has been recorded as a hit yet — backs the "everyone's lists" page.
export async function getAllListsAnnotated(seasonYear) {
  const supabase = getServiceClient()
  const { picks, hits } = await getSeasonPicksAndHits(seasonYear)

  // Participants are season-independent; the roster for a given season is
  // whoever has at least one pick row in it — a list is what makes you "in
  // the pool," not a season-scoped registration.
  const participantIds = Array.from(new Set(picks.map((pick) => pick.participant_id)))
  let participants = []
  if (participantIds.length > 0) {
    const { data, error } = await supabase
      .from('deadpool_participants')
      .select('id, display_name')
      .in('id', participantIds)
      .order('display_name')
    if (error) throw error
    participants = data || []
  }

  const hitByName = new Map(hits.map((hit) => [hit.name_normalized, hit]))
  const picksByParticipant = new Map()
  for (const pick of picks) {
    if (!picksByParticipant.has(pick.participant_id)) {
      picksByParticipant.set(pick.participant_id, [])
    }
    const hit = hitByName.get(pick.name_normalized)
    picksByParticipant.get(pick.participant_id).push({
      name: pick.name,
      isHit: Boolean(hit),
      ageAtDeath: hit ? hit.age_at_death : null,
    })
  }

  return (participants || []).map((participant) => ({
    participantId: participant.id,
    displayName: participant.display_name,
    picks: picksByParticipant.get(participant.id) || [],
  }))
}
