import { computeHitScores, computeParticipantTotals, BASE_SCORE, UNIQUENESS_BONUS } from '../scoring'

describe('computeHitScores', () => {
  it('awards base points with no bonus when multiple participants picked the same person', () => {
    const picks = [
      { participant_id: 'a', name_normalized: 'chuck heston' },
      { participant_id: 'b', name_normalized: 'chuck heston' },
    ]
    const hits = [{ id: 'h1', name_normalized: 'chuck heston', age_at_death: 84 }]

    const [scored] = computeHitScores(picks, hits)

    expect(scored.basePoints).toBe(BASE_SCORE - 84)
    expect(scored.bonus).toBe(0)
    expect(scored.totalPoints).toBe(BASE_SCORE - 84)
    expect(scored.pickerIds.sort()).toEqual(['a', 'b'])
  })

  it('awards the uniqueness bonus when exactly one participant picked the person', () => {
    const picks = [{ participant_id: 'a', name_normalized: 'someone obscure' }]
    const hits = [{ id: 'h1', name_normalized: 'someone obscure', age_at_death: 60 }]

    const [scored] = computeHitScores(picks, hits)

    expect(scored.bonus).toBe(UNIQUENESS_BONUS)
    expect(scored.totalPoints).toBe(BASE_SCORE - 60 + UNIQUENESS_BONUS)
  })

  it('allows the base score to go negative for a death past age 100', () => {
    const picks = [{ participant_id: 'a', name_normalized: 'centenarian' }]
    const hits = [{ id: 'h1', name_normalized: 'centenarian', age_at_death: 105 }]

    const [scored] = computeHitScores(picks, hits)

    expect(scored.basePoints).toBe(-5)
  })

  it('produces an empty picker list for a hit nobody picked', () => {
    const hits = [{ id: 'h1', name_normalized: 'nobody picked me', age_at_death: 50 }]

    const [scored] = computeHitScores([], hits)

    expect(scored.pickerIds).toEqual([])
    expect(scored.bonus).toBe(0)
  })

  it('matches names case-insensitively via the pre-normalized key', () => {
    const picks = [{ participant_id: 'a', name_normalized: 'bob barker' }]
    const hits = [{ id: 'h1', name_normalized: 'bob barker', age_at_death: 99 }]

    const [scored] = computeHitScores(picks, hits)

    expect(scored.pickerIds).toEqual(['a'])
  })
})

describe('computeParticipantTotals', () => {
  it('sums points across multiple hits for the same participant', () => {
    const hitScores = [
      { pickerIds: ['a'], totalPoints: 30, hit: {} },
      { pickerIds: ['a', 'b'], totalPoints: 10, hit: {} },
    ]

    const totals = computeParticipantTotals(hitScores)

    expect(totals.get('a').points).toBe(40)
    expect(totals.get('a').hits).toHaveLength(2)
    expect(totals.get('b').points).toBe(10)
  })

  it('returns an empty map when there are no hits', () => {
    expect(computeParticipantTotals([]).size).toBe(0)
  })
})
