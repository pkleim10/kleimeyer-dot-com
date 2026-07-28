import { mergeAnnouncementItems } from '../announcements'

const hit = (dateOfDeath, displayName) => ({ id: `h-${displayName}`, displayName, dateOfDeath })
const notice = (createdAt, title) => ({ id: `n-${title}`, title, body: 'body', created_at: createdAt })

describe('mergeAnnouncementItems', () => {
  it('tags each item with its kind', () => {
    const merged = mergeAnnouncementItems([hit('2027-03-01', 'A')], [notice('2027-04-01T10:00:00Z', 'N')])
    expect(merged.map((i) => i.kind)).toEqual(['notice', 'death'])
  })

  it('interleaves both kinds newest-first', () => {
    const merged = mergeAnnouncementItems(
      [hit('2027-01-15', 'Jan'), hit('2027-06-15', 'Jun')],
      [notice('2027-03-20T12:00:00Z', 'Mar'), notice('2027-09-20T12:00:00Z', 'Sep')]
    )
    expect(merged.map((i) => i.title ?? i.displayName)).toEqual(['Sep', 'Jun', 'Mar', 'Jan'])
  })

  it('exposes a notice body and posted date', () => {
    const [item] = mergeAnnouncementItems([], [notice('2027-05-05T08:30:00Z', 'Heads up')])
    expect(item).toMatchObject({ kind: 'notice', title: 'Heads up', body: 'body' })
    expect(item.postedAt).toBe('2027-05-05T08:30:00Z')
  })

  it('preserves the original hit fields it was given', () => {
    const source = { ...hit('2027-02-02', 'Someone'), totalPoints: 42, pickedBy: ['Team'] }
    const [item] = mergeAnnouncementItems([source], [])
    expect(item).toMatchObject({ kind: 'death', totalPoints: 42, pickedBy: ['Team'] })
  })

  it('handles either side being empty', () => {
    expect(mergeAnnouncementItems([], [])).toEqual([])
    expect(mergeAnnouncementItems([hit('2027-01-01', 'Only')], [])).toHaveLength(1)
    expect(mergeAnnouncementItems([], [notice('2027-01-01T00:00:00Z', 'Only')])).toHaveLength(1)
  })
})
